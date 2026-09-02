import { Effect } from "effect";

import { VerificationError } from "../schema/errors.js";

export const parseHttpsRecordUrl = Effect.fn("parseHttpsRecordUrl")(function* (
  value: string,
) {
  if (
    value.length === 0 ||
    Array.from(value).some((character) => character.charCodeAt(0) <= 0x20)
  ) {
    return yield* new VerificationError({
      code: "INVALID_METHOD_TARGET",
      message:
        "HTTPS URL must be nonempty and contain no ASCII whitespace or controls",
    });
  }

  const url = yield* Effect.try({
    try: () => new URL(value),
    catch: () =>
      new VerificationError({
        code: "INVALID_METHOD_TARGET",
        message: "record value is not an absolute WHATWG URL",
      }),
  });

  if (
    url.protocol !== "https:" ||
    url.host === "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.hostname.endsWith(".") ||
    url.origin === "null"
  ) {
    return yield* new VerificationError({
      code: "INVALID_METHOD_TARGET",
      message: "record value does not satisfy the HTTPS URL policy",
    });
  }

  return url;
});
