import { Buffer } from "node:buffer";

import { Effect, Layer } from "effect";

import {
  CHECKING_DISABLED,
  DNSSEC_OK,
  encode,
  RECURSION_DESIRED,
  type Packet,
  type RecordType,
} from "@leichtgewicht/dns-packet";
import {
  DnsClass,
  dnssecLookUp,
  Question,
  SecurityStatus,
} from "@relaycorp/dnssec";

import { DNS_OVER_HTTPS_URL, DNS_QUERY_TIMEOUT_MS } from "../data/dns.js";
import { DNS_TXT_PROOF_MAX_BYTES } from "../data/limits.js";
import { RpcError, VerificationError } from "../schema/errors.js";
import {
  DnsService,
  type SecureTxtQuery,
  type SecureTxtResult,
} from "./service.js";

const querySecureTxt = async (query: SecureTxtQuery, signal: AbortSignal) => {
  const querySignal = AbortSignal.any([
    signal,
    AbortSignal.timeout(DNS_QUERY_TIMEOUT_MS),
  ]);

  return dnssecLookUp(
    new Question(query.owner, "TXT", DnsClass.IN),
    async (question) => {
      // The codec supports EDNS fields that its published OptAnswer type omits.
      const packet = {
        type: "query",
        id: 0,
        flags: RECURSION_DESIRED | CHECKING_DISABLED,
        questions: [
          {
            name: question.name,
            type: question.getTypeName() as RecordType,
            class: "IN",
          },
        ],
        additionals: [
          {
            name: ".",
            type: "OPT",
            udpPayloadSize: 4_096,
            extendedRcode: 0,
            ednsVersion: 0,
            flags: DNSSEC_OK,
            options: [],
          },
        ],
      } as unknown as Packet;
      const wireQuery = new Uint8Array(encode(packet)).buffer;

      let response: Response;
      try {
        response = await fetch(DNS_OVER_HTTPS_URL, {
          method: "POST",
          headers: {
            Accept: "application/dns-message",
            "Content-Type": "application/dns-message",
          },
          body: wireQuery,
          signal: querySignal,
        });
      } catch {
        throw new RpcError({
          code: "DNS_QUERY_FAILED",
          message: "DNS-over-HTTPS query failed",
        });
      }

      const mediaType = response.headers
        .get("content-type")
        ?.split(";", 1)[0]
        ?.trim()
        .toLowerCase();
      if (!response.ok || mediaType !== "application/dns-message") {
        throw new RpcError({
          code: "DNS_QUERY_FAILED",
          message: "DNS-over-HTTPS resolver returned an invalid response",
        });
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.byteLength > 65_535) {
        throw new VerificationError({
          code: "DNS_RESPONSE_INVALID",
          message: "DNS-over-HTTPS wire response exceeds 65535 bytes",
        });
      }
      return bytes;
    },
    { dateOrPeriod: new Date(Number(query.checkedAt) * 1_000) },
  );
};

const resolveSecureTxt = Effect.fn("DnsService.resolveSecureTxt")(function* (
  query: SecureTxtQuery,
) {
  const result = yield* Effect.tryPromise({
    try: (signal) => querySecureTxt(query, signal),
    catch: (cause) => {
      if (cause instanceof RpcError || cause instanceof VerificationError) {
        return cause;
      }
      return new VerificationError({
        code: "DNS_RESPONSE_INVALID",
        message: "DNSSEC response could not be validated",
      });
    },
  });

  if (result.status !== SecurityStatus.SECURE) {
    return yield* new VerificationError({
      code: "DNSSEC_VALIDATION_FAILED",
      message: `DNSSEC validation returned ${result.status.toLowerCase()}`,
    });
  }

  if (result.result.records.length !== 1) {
    return yield* new VerificationError({
      code: "DNS_RESPONSE_INVALID",
      message: "DNS proof owner must contain exactly one TXT record",
    });
  }

  const chunks: unknown = result.result.records[0]?.dataFields;
  if (
    !Array.isArray(chunks) ||
    chunks.some((chunk) => !(chunk instanceof Uint8Array))
  ) {
    return yield* new VerificationError({
      code: "DNS_RESPONSE_INVALID",
      message: "DNS TXT record contains malformed character strings",
    });
  }

  const byteLength = chunks.reduce(
    (length, chunk: Uint8Array) => length + chunk.byteLength,
    0,
  );
  if (byteLength > DNS_TXT_PROOF_MAX_BYTES) {
    return yield* new VerificationError({
      code: "DNS_RESPONSE_INVALID",
      message: `DNS TXT proof exceeds ${DNS_TXT_PROOF_MAX_BYTES} bytes`,
    });
  }

  return {
    bytes: Buffer.concat(chunks),
    cacheUntil: query.checkedAt,
  } satisfies SecureTxtResult;
});

export const NodeDnsServiceLayer = Layer.succeed(
  DnsService,
  DnsService.of({ resolveSecureTxt }),
);
