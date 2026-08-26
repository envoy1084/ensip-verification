import { Effect } from "effect";

import { bytesToHex } from "viem";

import { type LowercaseHex, TextEncodingError } from "../schema/encoding.js";

export const encodeCanonicalDecimal = (value: bigint): string =>
  value.toString(10);

export const encodeLowercaseHex = (bytes: Uint8Array): LowercaseHex =>
  bytesToHex(bytes) as LowercaseHex;

const findUnicodeScalarError = (
  value: string,
): TextEncodingError | undefined => {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        return new TextEncodingError({
          code: "INVALID_UNICODE_SCALAR",
          message: "string contains an unpaired high surrogate",
        });
      }
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return new TextEncodingError({
        code: "INVALID_UNICODE_SCALAR",
        message: "string contains an unpaired low surrogate",
      });
    }
  }

  return undefined;
};

export const isUnicodeScalarSequence = (value: string): boolean =>
  findUnicodeScalarError(value) === undefined;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

export const encodeUtf8 = Effect.fn("encodeUtf8")(function* (value: string) {
  const error = findUnicodeScalarError(value);
  if (error !== undefined) return yield* error;
  return textEncoder.encode(value);
});

export const decodeStrictUtf8 = Effect.fn("decodeStrictUtf8")(function* (
  bytes: Uint8Array,
) {
  return yield* Effect.try({
    try: () => textDecoder.decode(bytes),
    catch: () =>
      new TextEncodingError({
        code: "INVALID_UTF8",
        message: "input is not valid UTF-8",
      }),
  });
});

export const utf8ByteLength = Effect.fn("utf8ByteLength")(function* (
  value: string,
) {
  return (yield* encodeUtf8(value)).byteLength;
});

export const enforceUtf8ByteLimit = Effect.fn("enforceUtf8ByteLimit")(
  function* (value: string, maximumBytes: number) {
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) {
      return yield* Effect.die(
        new RangeError("maximumBytes must be a non-negative safe integer"),
      );
    }

    const actualBytes = yield* utf8ByteLength(value);
    if (actualBytes > maximumBytes) {
      return yield* new TextEncodingError({
        code: "BYTE_LIMIT_EXCEEDED",
        message: `UTF-8 input is ${actualBytes} bytes; maximum is ${maximumBytes}`,
      });
    }
    return value;
  },
);
