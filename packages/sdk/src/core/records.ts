import { Effect } from "effect";

import {
  type LogicalResolverValue,
  type RecordMetadata,
  type RecordSelector,
} from "../schema/records.js";
import { encodeUtf8 } from "./encoding.js";

export const deriveRecordMetadata = (
  selector: RecordSelector,
): RecordMetadata => {
  switch (selector.type) {
    case "text":
      return { recordType: "text", recordKey: selector.key };
    case "addr":
      return { recordType: "addr", recordKey: selector.key };
    case "contenthash":
      return { recordType: "contenthash", recordKey: "" };
    case "data":
      return { recordType: "data", recordKey: selector.key };
  }
};

export const deriveLogicalResolverValueBytes = Effect.fn(
  "deriveLogicalResolverValueBytes",
)(function* (resolverValue: LogicalResolverValue) {
  if (resolverValue.type === "text") {
    return yield* encodeUtf8(resolverValue.value);
  }

  return resolverValue.value.slice();
});
