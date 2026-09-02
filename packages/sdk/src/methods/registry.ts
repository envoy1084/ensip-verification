import { Effect } from "effect";

import type { DescriptorMethodPolicy } from "../schema/descriptor.js";
import { RecordVerificationError } from "../schema/errors.js";
import type { MethodVerificationInput } from "../schema/methods.js";
import {
  DNS_TXT_METHOD_ID,
  dnsTxtDescriptorPolicy,
} from "./dns-txt-v1/definition.js";
import { dnsTxtMethod } from "./dns-txt-v1/verify.js";
import {
  HTTPS_ORIGIN_METHOD_ID,
  httpsOriginDescriptorPolicy,
} from "./https-origin-v1/definition.js";
import { httpsOriginMethod } from "./https-origin-v1/verify.js";

export const methodRegistry = Object.freeze({
  [HTTPS_ORIGIN_METHOD_ID]: httpsOriginMethod,
  [DNS_TXT_METHOD_ID]: dnsTxtMethod,
});

export type RegisteredMethodId = keyof typeof methodRegistry;

export const descriptorMethodPolicies: ReadonlyMap<
  string,
  DescriptorMethodPolicy
> = new Map<string, DescriptorMethodPolicy>([
  [HTTPS_ORIGIN_METHOD_ID, httpsOriginDescriptorPolicy],
  [DNS_TXT_METHOD_ID, dnsTxtDescriptorPolicy],
]);

export const validateRegisteredMethodDescriptor = Effect.fn(
  "validateRegisteredMethodDescriptor",
)(function* (descriptor: MethodVerificationInput["descriptor"]) {
  const methodPolicy = descriptorMethodPolicies.get(descriptor.method);
  if (methodPolicy === undefined) {
    return yield* new RecordVerificationError({
      code: "UNSUPPORTED_METHOD",
      reason: `unsupported method: ${descriptor.method}`,
    });
  }

  if (
    methodPolicy.proofUri === "forbidden" &&
    descriptor.proofUri !== undefined
  ) {
    return yield* new RecordVerificationError({
      code: "INVALID_DESCRIPTOR",
      reason: `method ${descriptor.method} forbids u`,
    });
  }
  if (
    methodPolicy.proofUri === "required" &&
    descriptor.proofUri === undefined
  ) {
    return yield* new RecordVerificationError({
      code: "INVALID_DESCRIPTOR",
      reason: `method ${descriptor.method} requires u`,
    });
  }
  if (descriptor.proofUri !== undefined && methodPolicy.schemes !== undefined) {
    const scheme = descriptor.proofUri.slice(
      0,
      descriptor.proofUri.indexOf(":"),
    );
    if (!methodPolicy.schemes.has(scheme)) {
      return yield* new RecordVerificationError({
        code: "INVALID_DESCRIPTOR",
        reason: `method ${descriptor.method} does not permit the ${scheme}: scheme`,
      });
    }
  }
});

export const verifyRegisteredMethod = Effect.fn("verifyRegisteredMethod")(
  function* (input: MethodVerificationInput) {
    if (!Object.hasOwn(methodRegistry, input.descriptor.method)) {
      return yield* new RecordVerificationError({
        code: "UNSUPPORTED_METHOD",
        reason: `verification method ${input.descriptor.method} is not implemented`,
      });
    }

    const method =
      methodRegistry[input.descriptor.method as RegisteredMethodId];
    return yield* method.verify(input);
  },
);
