import { Effect, Layer } from "effect";

import { RecordVerificationError } from "../schema/errors.js";
import {
  HttpService,
  type HttpRequest,
  type HttpResponse,
} from "../services/HttpService.js";

export interface BrowserHttpLayerOptions {
  readonly fetch?: typeof globalThis.fetch;
}

const readBoundedBody = async (
  response: Response,
  maximumBodyBytes: number,
  signal: AbortSignal,
): Promise<Uint8Array> => {
  if (response.body === null) return new Uint8Array();

  const reader = response.body.getReader();
  const abort = () => void reader.cancel(signal.reason);
  signal.addEventListener("abort", abort, { once: true });
  const chunks: Array<Uint8Array> = [];
  let byteLength = 0;

  try {
    for (;;) {
      // Stream readers are intentionally consumed in wire order.
      // oxlint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maximumBodyBytes) {
        // oxlint-disable-next-line no-await-in-loop
        await reader.cancel();
        throw new RecordVerificationError({
          code: "INVALID_PROOF",
          reason: `HTTPS proof exceeds ${maximumBodyBytes} bytes`,
        });
      }
      chunks.push(value);
    }
  } finally {
    signal.removeEventListener("abort", abort);
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
};

export const BrowserHttpServiceLayer = ({
  fetch: fetchImplementation = globalThis.fetch,
}: BrowserHttpLayerOptions = {}) => {
  const get = Effect.fn("HttpService.get.browser")((request: HttpRequest) =>
    Effect.gen(function* () {
      const response = yield* Effect.tryPromise({
        try: (signal) =>
          fetchImplementation(request.url, {
            method: "GET",
            cache: "no-store",
            credentials: "omit",
            redirect: "manual",
            referrerPolicy: "no-referrer",
            signal,
          }),
        catch: () =>
          new RecordVerificationError({
            code: "PROOF_READ_FAILED",
            reason: "HTTPS proof request failed",
          }),
      });

      if (response.type === "opaqueredirect" || response.status >= 300) {
        return yield* new RecordVerificationError({
          code: "INVALID_PROOF",
          reason: "HTTPS proof endpoint must not redirect",
        });
      }
      if (response.status !== 200) {
        return yield* new RecordVerificationError({
          code: "INVALID_PROOF",
          reason: `HTTPS proof endpoint returned status ${response.status}`,
        });
      }

      const mediaType = response.headers
        .get("content-type")
        ?.split(";", 1)[0]
        ?.trim()
        .toLowerCase();
      if (mediaType !== "application/json") {
        return yield* new RecordVerificationError({
          code: "INVALID_PROOF",
          reason: "HTTPS proof endpoint must return application/json",
        });
      }

      const contentEncoding = response.headers
        .get("content-encoding")
        ?.trim()
        .toLowerCase();
      if (contentEncoding !== undefined && contentEncoding !== "identity") {
        return yield* new RecordVerificationError({
          code: "INVALID_PROOF",
          reason: "HTTPS proof endpoint must not use content encoding",
        });
      }

      const contentLength = response.headers.get("content-length");
      if (
        contentLength !== null &&
        (!/^(?:0|[1-9][0-9]*)$/.test(contentLength) ||
          BigInt(contentLength) > BigInt(request.maximumBodyBytes))
      ) {
        return yield* new RecordVerificationError({
          code: "INVALID_PROOF",
          reason: `HTTPS proof exceeds ${request.maximumBodyBytes} bytes`,
        });
      }

      const body = yield* Effect.tryPromise({
        try: (signal) =>
          readBoundedBody(response, request.maximumBodyBytes, signal),
        catch: (cause) =>
          cause instanceof RecordVerificationError
            ? cause
            : new RecordVerificationError({
                code: "PROOF_READ_FAILED",
                reason: "unable to read the HTTPS proof response",
              }),
      });

      return {
        body,
        headers: Object.fromEntries(response.headers.entries()),
      } satisfies HttpResponse;
    }).pipe(
      Effect.timeoutOrElse({
        duration: request.timeoutMs,
        orElse: () =>
          new RecordVerificationError({
            code: "PROOF_READ_FAILED",
            reason: "HTTPS proof request timed out",
          }),
      }),
    ),
  );

  return Layer.succeed(HttpService, HttpService.of({ get }));
};
