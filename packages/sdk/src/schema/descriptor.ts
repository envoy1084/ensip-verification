import { Schema } from "effect";

import {
  METHOD_IDENTIFIER_MAX_BYTES,
  PROOF_URI_MAX_BYTES,
} from "../data/limits.js";
import { Uint32 } from "./encoding.js";

export const ProtocolVersion = Schema.Literal("ensrv1");

export type ProtocolVersion = typeof ProtocolVersion.Type;

export const AuthorityVersion = Uint32.check(
  Schema.isGreaterThanBigInt(0n, { expected: "a positive uint32" }),
);

export type AuthorityVersion = typeof AuthorityVersion.Type;

export const MethodIdentifier = Schema.String.check(
  Schema.isPattern(
    /^[a-z](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z](?:[a-z0-9-]*[a-z0-9])?)*\.v[1-9][0-9]*$/,
    { expected: "a method identifier" },
  ),
  Schema.isMaxLength(METHOD_IDENTIFIER_MAX_BYTES),
);

export type MethodIdentifier = typeof MethodIdentifier.Type;

const proofUriValidationError = (value: string): string | undefined => {
  const schemeMatch = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(value);
  if (schemeMatch === null) return "proof URI must contain an RFC 3986 scheme";
  if (value.includes("#")) return "proof URI must not contain a fragment";

  const allowedCharacter = /^[A-Za-z0-9._~:/?[\]@!$&'()*+,;=-]$/;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "%") {
      if (!/^[0-9A-Fa-f]{2}$/.test(value.slice(index + 1, index + 3))) {
        return "proof URI contains an invalid percent-encoding";
      }
      index += 2;
    } else if (!allowedCharacter.test(value[index] ?? "")) {
      return "proof URI contains a character outside RFC 3986";
    }
  }

  const afterScheme = value.slice(schemeMatch[0].length);
  if (afterScheme.startsWith("//")) {
    const authority = afterScheme.slice(2).split(/[/?]/, 1)[0] ?? "";
    if (authority.includes("@")) {
      return "proof URI must not contain user information";
    }
  }

  return undefined;
};

export const AbsoluteProofUri = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(PROOF_URI_MAX_BYTES),
  Schema.makeFilter((value) => proofUriValidationError(value)),
);

export type AbsoluteProofUri = typeof AbsoluteProofUri.Type;

export const Descriptor = Schema.Struct({
  protocolVersion: ProtocolVersion,
  authorityVersion: AuthorityVersion,
  method: MethodIdentifier,
  proofUri: Schema.optionalKey(AbsoluteProofUri),
});

export type Descriptor = typeof Descriptor.Type;

export interface DescriptorMethodPolicy {
  readonly proofUri: "forbidden" | "required";
  readonly schemes?: ReadonlySet<string>;
}

export interface DescriptorRegistry {
  readonly authorityVersions: ReadonlySet<bigint>;
  readonly methods: ReadonlyMap<string, DescriptorMethodPolicy>;
}
