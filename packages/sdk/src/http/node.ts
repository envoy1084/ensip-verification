import type { IncomingHttpHeaders, IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import type { TLSSocket } from "node:tls";

import { Effect, Layer } from "effect";

import ipaddr from "ipaddr.js";

import {
  HTTP_BODY_TIMEOUT_MS,
  HTTP_CONNECT_TIMEOUT_MS,
  HTTP_RESPONSE_HEADER_MAX_BYTES,
  HTTP_RESPONSE_HEADER_TIMEOUT_MS,
} from "../data/http.js";
import { RpcError, VerificationError } from "../schema/errors.js";
import { resolveHttpAddress } from "./address.js";
import { HttpService, type HttpRequest, type HttpResponse } from "./service.js";

const normalizeHeaders = (
  headers: IncomingHttpHeaders,
): Readonly<Record<string, string>> => {
  const normalized: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined) {
      normalized[name] = Array.isArray(value) ? value.join(", ") : value;
    }
  }
  return normalized;
};

const validateResponse = (
  response: IncomingMessage,
  maximumBodyBytes: number,
): VerificationError | undefined => {
  const status = response.statusCode;
  if (status !== undefined && status >= 300 && status < 400) {
    return new VerificationError({
      code: "HTTP_REDIRECT",
      message: "HTTP proof request returned a redirect",
    });
  }
  if (status !== 200) {
    return new VerificationError({
      code: "HTTP_INVALID_STATUS",
      message: "HTTP proof request did not return status 200",
    });
  }

  const contentType = response.headers["content-type"];
  const mediaType = Array.isArray(contentType)
    ? undefined
    : contentType?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    return new VerificationError({
      code: "HTTP_INVALID_CONTENT_TYPE",
      message: "HTTP proof response must have application/json media type",
    });
  }

  const contentEncoding = response.headers["content-encoding"];
  if (
    contentEncoding !== undefined &&
    (Array.isArray(contentEncoding) ||
      contentEncoding.trim().toLowerCase() !== "identity")
  ) {
    return new VerificationError({
      code: "HTTP_UNSUPPORTED_ENCODING",
      message: "HTTP proof response uses an unsupported content encoding",
    });
  }

  const contentLength = response.headers["content-length"];
  if (
    Array.isArray(contentLength) ||
    (contentLength !== undefined && !/^(0|[1-9][0-9]*)$/.test(contentLength))
  ) {
    return new VerificationError({
      code: "HTTP_INVALID_RESPONSE",
      message: "HTTP proof response has an invalid content length",
    });
  }
  if (
    contentLength !== undefined &&
    BigInt(contentLength) > BigInt(maximumBodyBytes)
  ) {
    return new VerificationError({
      code: "HTTP_BODY_TOO_LARGE",
      message: "HTTP proof response exceeds the body limit",
    });
  }

  return undefined;
};

const requestBytes = (
  input: HttpRequest,
  destination: { readonly address: string; readonly family: 4 | 6 },
  signal: AbortSignal,
): Promise<HttpResponse> =>
  new Promise((resolve, reject) => {
    let settled = false;
    let response: IncomingMessage | undefined;
    let bodyTimer: ReturnType<typeof setTimeout> | undefined;

    const clearTimers = () => {
      clearTimeout(connectTimer);
      clearTimeout(headerTimer);
      if (bodyTimer !== undefined) clearTimeout(bodyTimer);
      clearTimeout(totalTimer);
    };

    const complete = (result: HttpResponse) => {
      if (settled) return;
      settled = true;
      clearTimers();
      signal.removeEventListener("abort", abort);
      resolve(result);
    };

    const fail = (error: RpcError | VerificationError) => {
      if (settled) return;
      settled = true;
      clearTimers();
      signal.removeEventListener("abort", abort);
      response?.destroy();
      request.destroy();
      reject(error);
    };

    const timeout = (stage: string) =>
      fail(
        new RpcError({
          code: "HTTP_TIMEOUT",
          message: `HTTP proof request exceeded the ${stage} deadline`,
        }),
      );

    const request = httpsRequest({
      protocol: "https:",
      hostname: destination.address,
      family: destination.family,
      port: input.url.port === "" ? 443 : Number(input.url.port),
      path: `${input.url.pathname}${input.url.search}`,
      method: "GET",
      servername: isIPHostname(input.url.hostname)
        ? undefined
        : input.url.hostname,
      rejectUnauthorized: true,
      agent: false,
      maxHeaderSize: HTTP_RESPONSE_HEADER_MAX_BYTES,
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "identity",
        Host: input.url.host,
      },
    });

    const abort = () =>
      fail(
        new RpcError({
          code: "HTTP_REQUEST_FAILED",
          message: "HTTP proof request was cancelled",
        }),
      );

    const totalTimer = setTimeout(() => timeout("total"), input.timeoutMs);
    const connectTimer = setTimeout(
      () => timeout("connection"),
      Math.min(input.timeoutMs, HTTP_CONNECT_TIMEOUT_MS),
    );
    const headerTimer = setTimeout(
      () => timeout("response-header"),
      Math.min(input.timeoutMs, HTTP_RESPONSE_HEADER_TIMEOUT_MS),
    );

    signal.addEventListener("abort", abort, { once: true });
    request.once("socket", (socket) => {
      const tlsSocket = socket as TLSSocket;
      tlsSocket.once("secureConnect", () => {
        clearTimeout(connectTimer);
        const peerAddress = tlsSocket.remoteAddress;
        if (
          peerAddress === undefined ||
          ipaddr.process(peerAddress).range() !== "unicast" ||
          ipaddr.process(peerAddress).toString() !==
            ipaddr.process(destination.address).toString()
        ) {
          fail(
            new VerificationError({
              code: "HTTP_ADDRESS_BLOCKED",
              message: "connected HTTP peer is not the approved destination",
            }),
          );
        }
      });
    });
    request.once("response", (incoming) => {
      response = incoming;
      clearTimeout(headerTimer);

      const responseError = validateResponse(incoming, input.maximumBodyBytes);
      if (responseError !== undefined) {
        fail(responseError);
        return;
      }

      bodyTimer = setTimeout(
        () => timeout("response-body"),
        Math.min(input.timeoutMs, HTTP_BODY_TIMEOUT_MS),
      );
      const chunks: Array<Uint8Array> = [];
      let byteLength = 0;

      incoming.on("data", (chunk: Buffer) => {
        byteLength += chunk.byteLength;
        if (byteLength > input.maximumBodyBytes) {
          fail(
            new VerificationError({
              code: "HTTP_BODY_TOO_LARGE",
              message: "HTTP proof response exceeds the body limit",
            }),
          );
          return;
        }
        chunks.push(chunk);
      });
      incoming.once("aborted", () =>
        fail(
          new RpcError({
            code: "HTTP_REQUEST_FAILED",
            message: "HTTP proof response ended unexpectedly",
          }),
        ),
      );
      incoming.once("error", () =>
        fail(
          new RpcError({
            code: "HTTP_REQUEST_FAILED",
            message: "unable to read the HTTP proof response",
          }),
        ),
      );
      incoming.once("end", () => {
        const body = new Uint8Array(byteLength);
        let offset = 0;
        for (const chunk of chunks) {
          body.set(chunk, offset);
          offset += chunk.byteLength;
        }
        complete({ body, headers: normalizeHeaders(incoming.headers) });
      });
    });
    request.once("error", (error) => {
      if (Reflect.get(error, "code") === "HPE_HEADER_OVERFLOW") {
        fail(
          new VerificationError({
            code: "HTTP_HEADERS_TOO_LARGE",
            message: "HTTP proof response exceeds the header limit",
          }),
        );
        return;
      }

      fail(
        new RpcError({
          code: "HTTP_REQUEST_FAILED",
          message: "unable to complete the HTTP proof request",
        }),
      );
    });
    request.end();
  });

const isIPHostname = (hostname: string): boolean =>
  ipaddr.isValid(
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname,
  );

const get = Effect.fn("HttpService.get")(function* (input: HttpRequest) {
  if (
    input.url.protocol !== "https:" ||
    input.url.username !== "" ||
    input.url.password !== ""
  ) {
    return yield* new VerificationError({
      code: "HTTP_URL_NOT_ALLOWED",
      message: "HTTP service requires a credentialless HTTPS URL",
    });
  }
  const destination = yield* resolveHttpAddress(input.url.hostname);
  return yield* Effect.tryPromise({
    try: (signal) => requestBytes(input, destination, signal),
    catch: (error) =>
      error instanceof RpcError || error instanceof VerificationError
        ? error
        : new RpcError({
            code: "HTTP_REQUEST_FAILED",
            message: "unable to complete the HTTP proof request",
          }),
  });
});

export const NodeHttpServiceLayer = Layer.succeed(
  HttpService,
  HttpService.of({ get }),
);
