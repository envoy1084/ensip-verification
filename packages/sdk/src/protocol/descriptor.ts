import { Effect, Schema } from "effect";

import {
  AbsoluteProofUri,
  type Descriptor,
  type DescriptorMethodPolicy,
  DescriptorParseError,
  type DescriptorRegistry,
  MethodIdentifier,
} from "../schema/descriptor.js";
import { AuthorityVersion } from "../schema/encoding.js";
import { DESCRIPTOR_MAX_BYTES } from "./limits.js";

export const v0DescriptorRegistry: DescriptorRegistry = {
  authorityVersions: new Set([1n]),
  methods: new Map<string, DescriptorMethodPolicy>([
    ["https-origin.v1", { proofUri: "forbidden" }],
    ["dns-txt.v1", { proofUri: "forbidden" }],
    [
      "account-signature.eip155.v1",
      { proofUri: "required", schemes: new Set(["https"]) },
    ],
  ]),
};

export const parseDescriptor = Effect.fn("parseDescriptor")(function* (
  input: string,
  registry: DescriptorRegistry = v0DescriptorRegistry,
): Effect.fn.Return<Descriptor, DescriptorParseError> {
  if (
    input.length === 0 ||
    input.length > DESCRIPTOR_MAX_BYTES ||
    Array.from(input).some((character) => character.charCodeAt(0) > 0x7f)
  ) {
    return yield* new DescriptorParseError({
      reason: "invalid_encoding",
      message: "descriptor must contain 1-2048 ASCII bytes",
    });
  }

  const tokens = input.split(" ");
  if (
    tokens.some((token) => token.length === 0) ||
    tokens.length < 3 ||
    tokens.length > 4
  ) {
    return yield* new DescriptorParseError({
      reason: "invalid_structure",
      message:
        "descriptor must contain a version and two or three single-space fields",
    });
  }
  if (tokens[0] !== "ensrv1") {
    return yield* new DescriptorParseError({
      reason: "invalid_structure",
      message: "unsupported common protocol version",
    });
  }

  const fields = new Map<string, string>();
  for (const token of tokens.slice(1)) {
    const separator = token.indexOf("=");
    if (separator <= 0 || separator === token.length - 1) {
      return yield* new DescriptorParseError({
        reason: "invalid_field",
        message: "descriptor field must have a non-empty name and value",
      });
    }
    const name = token.slice(0, separator);
    if (name !== "a" && name !== "m" && name !== "u") {
      return yield* new DescriptorParseError({
        reason: "invalid_field",
        message: `unknown descriptor field: ${name}`,
      });
    }
    if (fields.has(name)) {
      return yield* new DescriptorParseError({
        reason: "duplicate_field",
        message: `duplicate descriptor field: ${name}`,
      });
    }
    fields.set(name, token.slice(separator + 1));
  }

  const authorityInput = fields.get("a");
  const methodInput = fields.get("m");
  if (authorityInput === undefined || methodInput === undefined) {
    return yield* new DescriptorParseError({
      reason: "missing_field",
      message: "descriptor requires exactly one a field and one m field",
    });
  }

  const authorityVersion = yield* Schema.decodeUnknownEffect(AuthorityVersion)(
    authorityInput,
  ).pipe(
    Effect.mapError(
      () =>
        new DescriptorParseError({
          reason: "invalid_field",
          message: "invalid authority version",
        }),
    ),
  );
  const method = yield* Schema.decodeUnknownEffect(MethodIdentifier)(
    methodInput,
  ).pipe(
    Effect.mapError(
      () =>
        new DescriptorParseError({
          reason: "invalid_field",
          message: "invalid method identifier",
        }),
    ),
  );

  if (!registry.authorityVersions.has(authorityVersion)) {
    return yield* new DescriptorParseError({
      reason: "unsupported_authority",
      message: `unsupported authority version: ${authorityVersion}`,
    });
  }
  const methodPolicy = registry.methods.get(method);
  if (methodPolicy === undefined) {
    return yield* new DescriptorParseError({
      reason: "unsupported_method",
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
          new DescriptorParseError({
            reason: "invalid_uri",
            message: "invalid absolute proof URI",
          }),
      ),
    );
  }

  if (methodPolicy.proofUri === "forbidden" && proofUri !== undefined) {
    return yield* new DescriptorParseError({
      reason: "uri_policy",
      message: `method ${method} forbids u`,
    });
  }
  if (methodPolicy.proofUri === "required" && proofUri === undefined) {
    return yield* new DescriptorParseError({
      reason: "uri_policy",
      message: `method ${method} requires u`,
    });
  }
  if (proofUri !== undefined && methodPolicy.schemes !== undefined) {
    const scheme = proofUri.slice(0, proofUri.indexOf(":"));
    if (!methodPolicy.schemes.has(scheme)) {
      return yield* new DescriptorParseError({
        reason: "uri_policy",
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
