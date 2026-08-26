import { Effect, Schema } from "effect";

import { ClaimError, ProofEnvelope } from "../schema/claims.js";
import { isUnicodeScalarSequence } from "./encoding.js";
import {
  JSON_MAX_DEPTH,
  JSON_MAX_STRING_BYTES,
  JSON_MAX_VALUES,
  PROOF_ENVELOPE_MAX_BYTES,
} from "./limits.js";

export interface StrictJsonLimits {
  readonly maximumBytes?: number;
  readonly maximumDepth?: number;
  readonly maximumValues?: number;
  readonly maximumStringBytes?: number;
}

export const parseStrictJson = Effect.fn("parseStrictJson")(function* (
  bytes: Uint8Array,
  limits: StrictJsonLimits = {},
) {
  const maximumBytes = limits.maximumBytes ?? PROOF_ENVELOPE_MAX_BYTES;
  const maximumDepth = limits.maximumDepth ?? JSON_MAX_DEPTH;
  const maximumValues = limits.maximumValues ?? JSON_MAX_VALUES;
  const maximumStringBytes = limits.maximumStringBytes ?? JSON_MAX_STRING_BYTES;

  if (bytes.byteLength > maximumBytes) {
    return yield* new ClaimError({
      code: "ENVELOPE_TOO_LARGE",
      message: `JSON input exceeds ${maximumBytes} bytes`,
    });
  }
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return yield* new ClaimError({
      code: "INVALID_JSON",
      message: "JSON input must not begin with a byte-order mark",
    });
  }

  const text = yield* Effect.try({
    try: () => new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    catch: (cause) =>
      new ClaimError({
        code: "INVALID_JSON",
        message: "JSON input is not valid UTF-8",
        cause,
      }),
  });

  return yield* Effect.try({
    try: () => {
      let position = 0;
      let valueCount = 0;

      const skipWhitespace = () => {
        while (
          text[position] === " " ||
          text[position] === "\t" ||
          text[position] === "\n" ||
          text[position] === "\r"
        ) {
          position += 1;
        }
      };

      const parseString = (): string => {
        const start = position;
        position += 1;

        while (position < text.length) {
          const codeUnit = text.charCodeAt(position);
          if (codeUnit === 0x22) {
            position += 1;
            let value: string;
            try {
              value = JSON.parse(text.slice(start, position)) as string;
            } catch (cause) {
              throw new ClaimError({
                code: "INVALID_JSON",
                message: "JSON contains an invalid string escape",
                cause,
              });
            }
            if (!isUnicodeScalarSequence(value)) {
              throw new ClaimError({
                code: "INVALID_JSON",
                message: "JSON string contains an invalid Unicode scalar",
              });
            }
            if (
              new TextEncoder().encode(value).byteLength > maximumStringBytes
            ) {
              throw new ClaimError({
                code: "INVALID_JSON",
                message: `JSON string exceeds ${maximumStringBytes} bytes`,
              });
            }
            return value;
          }
          if (codeUnit < 0x20) {
            throw new ClaimError({
              code: "INVALID_JSON",
              message: "JSON string contains an unescaped control character",
            });
          }
          if (codeUnit === 0x5c) {
            position += 1;
            const escape = text[position];
            if (escape === "u") {
              if (
                !/^[0-9A-Fa-f]{4}$/.test(text.slice(position + 1, position + 5))
              ) {
                throw new ClaimError({
                  code: "INVALID_JSON",
                  message: "JSON string contains an invalid Unicode escape",
                });
              }
              position += 5;
              continue;
            }
            if (
              !['"', "\\", "/", "b", "f", "n", "r", "t"].includes(escape ?? "")
            ) {
              throw new ClaimError({
                code: "INVALID_JSON",
                message: "JSON string contains an invalid escape",
              });
            }
          }
          position += 1;
        }

        throw new ClaimError({
          code: "INVALID_JSON",
          message: "JSON string is not terminated",
        });
      };

      const parseValue = (depth: number): unknown => {
        if (depth > maximumDepth) {
          throw new ClaimError({
            code: "INVALID_JSON",
            message: `JSON nesting exceeds ${maximumDepth}`,
          });
        }
        valueCount += 1;
        if (valueCount > maximumValues) {
          throw new ClaimError({
            code: "INVALID_JSON",
            message: `JSON contains more than ${maximumValues} values`,
          });
        }

        skipWhitespace();
        const character = text[position];

        if (character === '"') return parseString();
        if (character === "{") {
          position += 1;
          skipWhitespace();
          const object: Record<string, unknown> = Object.create(null) as Record<
            string,
            unknown
          >;
          const memberNames = new Set<string>();
          if (text[position] === "}") {
            position += 1;
            return object;
          }

          while (position < text.length) {
            if (text[position] !== '"') {
              throw new ClaimError({
                code: "INVALID_JSON",
                message: "JSON object member name must be a string",
              });
            }
            const name = parseString();
            if (memberNames.has(name)) {
              throw new ClaimError({
                code: "DUPLICATE_JSON_MEMBER",
                message: `duplicate JSON member: ${name}`,
              });
            }
            memberNames.add(name);
            skipWhitespace();
            if (text[position] !== ":") {
              throw new ClaimError({
                code: "INVALID_JSON",
                message: "JSON object member is missing a colon",
              });
            }
            position += 1;
            object[name] = parseValue(depth + 1);
            skipWhitespace();
            if (text[position] === "}") {
              position += 1;
              return object;
            }
            if (text[position] !== ",") {
              throw new ClaimError({
                code: "INVALID_JSON",
                message: "JSON object members must be comma-separated",
              });
            }
            position += 1;
            skipWhitespace();
          }
        }
        if (character === "[") {
          position += 1;
          skipWhitespace();
          const array: unknown[] = [];
          if (text[position] === "]") {
            position += 1;
            return array;
          }

          while (position < text.length) {
            array.push(parseValue(depth + 1));
            skipWhitespace();
            if (text[position] === "]") {
              position += 1;
              return array;
            }
            if (text[position] !== ",") {
              throw new ClaimError({
                code: "INVALID_JSON",
                message: "JSON array values must be comma-separated",
              });
            }
            position += 1;
            skipWhitespace();
          }
        }
        if (text.startsWith("true", position)) {
          position += 4;
          return true;
        }
        if (text.startsWith("false", position)) {
          position += 5;
          return false;
        }
        if (text.startsWith("null", position)) {
          position += 4;
          return null;
        }

        const number =
          /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(
            text.slice(position),
          )?.[0];
        if (number !== undefined) {
          position += number.length;
          const value = Number(number);
          if (!Number.isFinite(value)) {
            throw new ClaimError({
              code: "INVALID_JSON",
              message: "JSON number is outside the finite numeric range",
            });
          }
          return value;
        }

        throw new ClaimError({
          code: "INVALID_JSON",
          message: `unexpected JSON token at character ${position}`,
        });
      };

      skipWhitespace();
      const value = parseValue(0);
      skipWhitespace();
      if (position !== text.length) {
        throw new ClaimError({
          code: "INVALID_JSON",
          message: "JSON input contains trailing data",
        });
      }
      return value;
    },
    catch: (cause) =>
      cause instanceof ClaimError
        ? cause
        : new ClaimError({
            code: "INVALID_JSON",
            message: "unable to parse JSON input",
            cause,
          }),
  });
});

export const parseProofEnvelope = Effect.fn("parseProofEnvelope")(function* (
  bytes: Uint8Array,
  limits?: StrictJsonLimits,
) {
  const json = yield* parseStrictJson(bytes, limits);
  return yield* Schema.decodeUnknownEffect(ProofEnvelope)(json).pipe(
    Effect.mapError(
      (cause) =>
        new ClaimError({
          code: "INVALID_ENVELOPE",
          message: "proof envelope does not match the closed common schema",
          cause,
        }),
    ),
  );
});
