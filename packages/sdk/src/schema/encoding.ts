import { Schema, SchemaGetter } from "effect";

import { bytesToHex, hexToBytes, type Hex } from "viem";

const UINT32_MAX = 4_294_967_295n;
const UINT64_MAX = 18_446_744_073_709_551_615n;
const UINT256_MAX = (1n << 256n) - 1n;

export const CanonicalUnsignedDecimal = Schema.String.check(
  Schema.isPattern(/^(?:0|[1-9][0-9]*)$/, {
    expected: "a canonical unsigned decimal",
  }),
);

const bigintFromCanonicalDecimal = <S extends Schema.Codec<bigint, bigint>>(
  target: S,
) =>
  CanonicalUnsignedDecimal.pipe(
    Schema.decodeTo(target, {
      decode: SchemaGetter.transform((value) => BigInt(value)),
      encode: SchemaGetter.transform((value) => value.toString(10)),
    }),
  );

export const Uint32 = bigintFromCanonicalDecimal(
  Schema.BigInt.check(
    Schema.isBetweenBigInt({ minimum: 0n, maximum: UINT32_MAX }),
  ),
);

export type Uint32 = typeof Uint32.Type;

export const Uint64 = bigintFromCanonicalDecimal(
  Schema.BigInt.check(
    Schema.isBetweenBigInt({ minimum: 0n, maximum: UINT64_MAX }),
  ),
);

export type Uint64 = typeof Uint64.Type;

export const Uint256 = bigintFromCanonicalDecimal(
  Schema.BigInt.check(
    Schema.isBetweenBigInt({ minimum: 0n, maximum: UINT256_MAX }),
  ),
);

export type Uint256 = typeof Uint256.Type;

export const EthereumAddress = Schema.String.check(
  Schema.isPattern(/^0x[0-9A-Fa-f]{40}$/, {
    expected: "a 20-byte Ethereum address",
  }),
);

export type EthereumAddress = typeof EthereumAddress.Type;

export const LowercaseHex = Schema.String.check(
  Schema.isPattern(/^0x(?:[0-9a-f]{2})*$/, {
    expected: "0x-prefixed, even-length lowercase hexadecimal",
  }),
);

export type LowercaseHex = typeof LowercaseHex.Type;

const decodeHex = (value: string): Uint8Array => hexToBytes(value as Hex);

const encodeHex = (bytes: Uint8Array): LowercaseHex =>
  bytesToHex(bytes) as LowercaseHex;

export const HexBytes = LowercaseHex.pipe(
  Schema.decodeTo(Schema.Uint8Array, {
    decode: SchemaGetter.transform(decodeHex),
    encode: SchemaGetter.transform(encodeHex),
  }),
);

export type HexBytes = typeof HexBytes.Type;

const isUnicodeScalarSequence = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }
  return true;
};

export const UnicodeScalarString = Schema.String.check(
  Schema.makeFilter(
    (value) =>
      isUnicodeScalarSequence(value) ||
      "string must contain only Unicode scalar values",
  ),
);

export class TextEncodingError extends Schema.TaggedError<TextEncodingError>()(
  "TextEncodingError",
  {
    code: Schema.Literals([
      "INVALID_UNICODE_SCALAR",
      "INVALID_UTF8",
      "BYTE_LIMIT_EXCEEDED",
    ]),
    message: Schema.String,
  },
) {}
