import { Effect, Schema } from "effect";

import { DESCRIPTOR_MAX_BYTES } from "../data/limits.js";
import { descriptorMethodPolicies } from "../methods/registry.js";
import {
  AbsoluteProofUri,
  type Descriptor,
  type DescriptorRegistry,
  MethodIdentifier,
  AuthorityVersion,
} from "../schema/descriptor.js";
import { ValidationError } from "../schema/errors.js";

export const v0DescriptorRegistry: DescriptorRegistry = {
  authorityVersions: new Set([1n]),
  methods: descriptorMethodPolicies,
};

export const parseDescriptor = Effect.fn("parseDescriptor")(function* (
  input: string,
  registry: DescriptorRegistry = v0DescriptorRegistry,
): Effect.fn.Return<Descriptor, ValidationError> {
  if (
    input.length === 0 ||
    input.length > DESCRIPTOR_MAX_BYTES ||
    Array.from(input).some((character) => character.charCodeAt(0) > 0x7f)
  ) {
    return yield* new ValidationError({
      code: "INVALID_ENCODING",
      message: "descriptor must contain 1-2048 ASCII bytes",
    });
  }

  const tokens = input.split(" ");
  if (
    tokens.some((token) => token.length === 0) ||
    tokens.length < 3 ||
    tokens.length > 4
  ) {
    return yield* new ValidationError({
      code: "INVALID_STRUCTURE",
      message:
        "descriptor must contain a version and two or three single-space fields",
    });
  }
  if (tokens[0] !== "ensrv1") {
    return yield* new ValidationError({
      code: "INVALID_STRUCTURE",
      message: "unsupported common protocol version",
    });
  }

  const fields = new Map<string, string>();
  for (const token of tokens.slice(1)) {
    const separator = token.indexOf("=");
    if (separator <= 0 || separator === token.length - 1) {
      return yield* new ValidationError({
        code: "INVALID_FIELD",
        message: "descriptor field must have a non-empty name and value",
      });
    }
    const name = token.slice(0, separator);
    if (name !== "a" && name !== "m" && name !== "u") {
      return yield* new ValidationError({
        code: "INVALID_FIELD",
        message: `unknown descriptor field: ${name}`,
      });
    }
    if (fields.has(name)) {
      return yield* new ValidationError({
        code: "DUPLICATE_FIELD",
        message: `duplicate descriptor field: ${name}`,
      });
    }
    fields.set(name, token.slice(separator + 1));
  }

  const authorityInput = fields.get("a");
  const methodInput = fields.get("m");
  if (authorityInput === undefined || methodInput === undefined) {
    return yield* new ValidationError({
      code: "MISSING_FIELD",
      message: "descriptor requires exactly one a field and one m field",
    });
  }

  const authorityVersion = yield* Schema.decodeUnknownEffect(AuthorityVersion)(
    authorityInput,
  ).pipe(
    Effect.mapError(
      () =>
        new ValidationError({
          code: "INVALID_FIELD",
          message: "invalid authority version",
        }),
    ),
  );
  const method = yield* Schema.decodeUnknownEffect(MethodIdentifier)(
    methodInput,
  ).pipe(
    Effect.mapError(
      () =>
        new ValidationError({
          code: "INVALID_FIELD",
          message: "invalid method identifier",
        }),
    ),
  );

  if (!registry.authorityVersions.has(authorityVersion)) {
    return yield* new ValidationError({
      code: "UNSUPPORTED_AUTHORITY",
      message: `unsupported authority version: ${authorityVersion}`,
    });
  }
  const methodPolicy = registry.methods.get(method);
  if (methodPolicy === undefined) {
    return yield* new ValidationError({
      code: "UNSUPPORTED_METHOD",
      message: `unsupported method: ${method}`,
    });
  }

  const uriInput = fields.get("u");
  let proofUri: Descriptor["proofUri"];
  if (uriInput !== undefined) {
    proofUri = yield* Schema.decodeUnknownEffect(AbsoluteProofUri)(
      uriInput,
    ).pipe(
      Effect.mapError(
        () =>
          new ValidationError({
            code: "INVALID_URI",
            message: "invalid absolute proof URI",
          }),
      ),
    );
  }

  if (methodPolicy.proofUri === "forbidden" && proofUri !== undefined) {
    return yield* new ValidationError({
      code: "URI_POLICY",
      message: `method ${method} forbids u`,
    });
  }
  if (methodPolicy.proofUri === "required" && proofUri === undefined) {
    return yield* new ValidationError({
      code: "URI_POLICY",
      message: `method ${method} requires u`,
    });
  }
  if (proofUri !== undefined && methodPolicy.schemes !== undefined) {
    const scheme = proofUri.slice(0, proofUri.indexOf(":"));
    if (!methodPolicy.schemes.has(scheme)) {
      return yield* new ValidationError({
        code: "URI_POLICY",
        message: `method ${method} does not permit the ${scheme}: scheme`,
      });
    }
  }

  return {
    protocolVersion: "ensrv1",
    authorityVersion,
    method,
    ...(proofUri === undefined ? {} : { proofUri }),
  };
});

export const serializeDescriptor = (descriptor: Descriptor): string => {
  const prefix = `${descriptor.protocolVersion} a=${descriptor.authorityVersion.toString(10)} m=${descriptor.method}`;
  return descriptor.proofUri === undefined
    ? prefix
    : `${prefix} u=${descriptor.proofUri}`;
};
