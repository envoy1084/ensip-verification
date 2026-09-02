import { Context, Effect, Layer } from "effect";

import {
  canonicalName,
  decodeMessage,
  encodeQuery,
  TYPE,
  walk,
  type Resolver,
  type ResolvedResponse,
} from "@namefi/dnssec-audit";

import { DNS_OVER_HTTPS_URL, DNS_QUERY_TIMEOUT_MS } from "../dns/config.js";
import { RecordVerificationError } from "../schema/errors.js";
import { DNS_TXT_PROOF_MAX_BYTES } from "../spec/limits.js";

export interface SecureTxtQuery {
  readonly owner: string;
  readonly checkedAt: bigint;
}

export interface SecureTxtResult {
  readonly bytes: Uint8Array;
  readonly cacheUntil: bigint;
}

export interface DnsServiceLayerOptions {
  readonly fetch?: typeof globalThis.fetch;
  readonly dnsOverHttpsUrl?: string;
}

const DNS_MESSAGE_MAX_BYTES = 65_535;

const readDnsMessage = async (response: Response): Promise<Uint8Array> => {
  if (response.body === null) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Array<Uint8Array> = [];
  let byteLength = 0;

  for (;;) {
    // Stream readers are intentionally consumed in wire order.
    // oxlint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > DNS_MESSAGE_MAX_BYTES) {
      // oxlint-disable-next-line no-await-in-loop
      await reader.cancel();
      throw new RecordVerificationError({
        code: "INVALID_PROOF",
        reason: "DNS-over-HTTPS response exceeds the DNS message limit",
      });
    }
    chunks.push(value);
  }

  const wire = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    wire.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return wire;
};

const queryDnsOverHttps = async (
  fetchImplementation: typeof globalThis.fetch,
  endpoint: string,
  qname: string,
  qtype: number,
  parentSignal: AbortSignal,
): Promise<ResolvedResponse> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DNS_QUERY_TIMEOUT_MS);
  const abort = () => controller.abort(parentSignal.reason);
  parentSignal.addEventListener("abort", abort, { once: true });

  try {
    const query = encodeQuery({ qname, qtype, doBit: true, cdBit: true });
    const body = query.buffer.slice(
      query.byteOffset,
      query.byteOffset + query.byteLength,
    ) as ArrayBuffer;
    const response = await fetchImplementation(endpoint, {
      method: "POST",
      headers: {
        accept: "application/dns-message",
        "content-type": "application/dns-message",
      },
      body,
      credentials: "omit",
      redirect: "error",
      signal: controller.signal,
    });
    const mediaType = response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();
    if (!response.ok || mediaType !== "application/dns-message") {
      throw new RecordVerificationError({
        code: "PROOF_READ_FAILED",
        reason: "DNS-over-HTTPS resolver returned an invalid response",
      });
    }

    const wire = await readDnsMessage(response);

    return {
      wire,
      message: decodeMessage(wire),
      source: "doh",
      endpoint,
      timestamp: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
    parentSignal.removeEventListener("abort", abort);
  }
};

const decodeTxtRdata = (rdata: Uint8Array): Uint8Array => {
  const chunks: Array<Uint8Array> = [];
  let offset = 0;
  let byteLength = 0;

  while (offset < rdata.byteLength) {
    const length = rdata[offset];
    if (length === undefined || offset + 1 + length > rdata.byteLength) {
      throw new RecordVerificationError({
        code: "INVALID_PROOF",
        reason: "DNS TXT record contains malformed character strings",
      });
    }
    const chunk = rdata.slice(offset + 1, offset + 1 + length);
    chunks.push(chunk);
    byteLength += chunk.byteLength;
    if (byteLength > DNS_TXT_PROOF_MAX_BYTES) {
      throw new RecordVerificationError({
        code: "INVALID_PROOF",
        reason: `DNS TXT proof exceeds ${DNS_TXT_PROOF_MAX_BYTES} bytes`,
      });
    }
    offset += 1 + length;
  }

  const value = new Uint8Array(byteLength);
  let valueOffset = 0;
  for (const chunk of chunks) {
    value.set(chunk, valueOffset);
    valueOffset += chunk.byteLength;
  }
  return value;
};

const makeLayer = ({
  fetch: fetchImplementation = globalThis.fetch,
  dnsOverHttpsUrl = DNS_OVER_HTTPS_URL,
}: DnsServiceLayerOptions = {}) => {
  const resolveSecureTxt = Effect.fn("DnsService.resolveSecureTxt")(function* (
    query: SecureTxtQuery,
  ) {
    const response = yield* Effect.tryPromise({
      try: async (signal) => {
        let answer: ResolvedResponse | undefined;
        const resolver: Resolver = {
          query: async (qname, qtype) => {
            const dnsResponse = await queryDnsOverHttps(
              fetchImplementation,
              dnsOverHttpsUrl,
              qname,
              qtype,
              signal,
            );
            if (
              canonicalName(qname) === canonicalName(query.owner) &&
              qtype === TYPE.TXT
            ) {
              answer = dnsResponse;
            }
            return dnsResponse;
          },
        };
        const validation = await walk(query.owner, TYPE.TXT, resolver, {
          at: new Date(Number(query.checkedAt) * 1_000),
        });
        return { answer, validation };
      },
      catch: (cause) =>
        cause instanceof RecordVerificationError
          ? cause
          : new RecordVerificationError({
              code: "PROOF_READ_FAILED",
              reason: "DNSSEC proof retrieval failed",
            }),
    });

    if (response.validation.verdict !== "secure-positive") {
      return yield* new RecordVerificationError({
        code: "INVALID_PROOF",
        reason: `DNSSEC validation failed: ${response.validation.detail}`,
      });
    }

    const records = response.answer?.message.answers.filter(
      (record) =>
        record.type === TYPE.TXT &&
        canonicalName(record.name) === canonicalName(query.owner),
    );
    const record = records?.length === 1 ? records[0] : undefined;
    if (record === undefined) {
      return yield* new RecordVerificationError({
        code: "INVALID_PROOF",
        reason: "DNS proof owner must contain exactly one TXT record",
      });
    }

    return {
      bytes: decodeTxtRdata(record.rdata),
      cacheUntil: query.checkedAt,
    } satisfies SecureTxtResult;
  });

  return Layer.succeed(DnsService, DnsService.of({ resolveSecureTxt }));
};

export class DnsService extends Context.Service<
  DnsService,
  {
    readonly resolveSecureTxt: (
      query: SecureTxtQuery,
    ) => Effect.Effect<SecureTxtResult, RecordVerificationError>;
  }
>()("@thenamespace/record-verification/DnsService") {
  static readonly layer = makeLayer;
  static readonly layerBrowser = makeLayer;
}
