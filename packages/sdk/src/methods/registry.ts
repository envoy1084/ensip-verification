import { Effect } from "effect";

import { DNS_TXT_METHOD_ID, HTTPS_ORIGIN_METHOD_ID } from "../data/methods.js";
import type { DescriptorMethodPolicy } from "../schema/descriptor.js";
import { VerificationError } from "../schema/errors.js";
import type { MethodVerificationInput } from "../schema/methods.js";
import { dnsTxtDescriptorPolicy, dnsTxtMethod } from "./dns-txt.js";
import {
  httpsOriginDescriptorPolicy,
  httpsOriginMethod,
} from "./https-origin.js";

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
  [
    "account-signature.eip155.v1",
    { proofUri: "required" as const, schemes: new Set(["https"]) },
  ],
]);

export const verifyRegisteredMethod = Effect.fn("verifyRegisteredMethod")(
  function* (input: MethodVerificationInput) {
    if (!Object.hasOwn(methodRegistry, input.descriptor.method)) {
      return yield* new VerificationError({
        code: "VERIFICATION_NOT_IMPLEMENTED",
        message: `verification method ${input.descriptor.method} is not implemented`,
      });
    }

    const method =
      methodRegistry[input.descriptor.method as RegisteredMethodId];
    return yield* method.verify(input);
  },
);
