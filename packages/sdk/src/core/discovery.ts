import { Effect } from "effect";

import type { RecordSelector } from "../schema/records.js";
import { enforceUtf8ByteLimit, utf8ByteLength } from "./encoding.js";
import { deriveRecordMetadata } from "./records.js";

export interface DiscoveryKeyOptions {
  /** Protocol limit once frozen, or an application policy limit in the interim. */
  readonly maximumBytes?: number;
}

export interface DerivedDiscoveryKey {
  readonly key: string;
  readonly utf8Bytes: number;
}

export const deriveDiscoveryKey = Effect.fn("deriveDiscoveryKey")(function* (
  selector: RecordSelector,
  options: DiscoveryKeyOptions = {},
) {
  const { recordKey, recordType } = deriveRecordMetadata(selector);
  const key =
    recordType === "contenthash"
      ? "verification[contenthash]"
      : `verification[${recordType}][${recordKey}]`;

  if (options.maximumBytes !== undefined) {
    yield* enforceUtf8ByteLimit(key, options.maximumBytes);
  }

  return {
    key,
    utf8Bytes: yield* utf8ByteLength(key),
  } satisfies DerivedDiscoveryKey;
});
