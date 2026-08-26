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
  switch (selector["_tag"]) {
    case "Text":
      return { recordType: "text", recordKey: selector.key };
    case "Address":
      return { recordType: "addr", recordKey: selector.coinType.toString(10) };
    case "Contenthash":
      return { recordType: "contenthash", recordKey: "" };
    case "Data":
      return { recordType: "data", recordKey: selector.key };
  }
};

export const deriveLogicalResolverValueBytes = Effect.fn(
  "deriveLogicalResolverValueBytes",
)(function* (resolverValue: LogicalResolverValue) {
  if (resolverValue["_tag"] === "Text") {
    return yield* encodeUtf8(resolverValue.value);
  }

  return resolverValue.value.slice();
});
