import { Schema } from "effect";

import { CoinType, UnicodeScalarString } from "./encoding.js";

const RecordKey = UnicodeScalarString.pipe(Schema.brand("RecordKey"));

export const TextRecordSelector = Schema.TaggedStruct("Text", {
  key: RecordKey,
});

export const AddressRecordSelector = Schema.TaggedStruct("Address", {
  coinType: CoinType,
});

export const ContenthashRecordSelector = Schema.TaggedStruct("Contenthash", {});

export const DataRecordSelector = Schema.TaggedStruct("Data", {
  key: RecordKey,
});

export const RecordSelector = Schema.Union([
  TextRecordSelector,
  AddressRecordSelector,
  ContenthashRecordSelector,
  DataRecordSelector,
]);

export type RecordSelector = typeof RecordSelector.Type;

export const RecordType = Schema.Literals([
  "text",
  "addr",
  "contenthash",
  "data",
]);

export type RecordType = typeof RecordType.Type;

export interface RecordMetadata {
  readonly recordType: RecordType;
  readonly recordKey: string;
}

const ResolverText = UnicodeScalarString.pipe(Schema.brand("ResolverText"));

export const TextResolverValue = Schema.TaggedStruct("Text", {
  value: ResolverText,
});

export const AddressResolverValue = Schema.TaggedStruct("Address", {
  value: Schema.Uint8Array,
});

export const ContenthashResolverValue = Schema.TaggedStruct("Contenthash", {
  value: Schema.Uint8Array,
});

export const DataResolverValue = Schema.TaggedStruct("Data", {
  value: Schema.Uint8Array,
});

export const LogicalResolverValue = Schema.Union([
  TextResolverValue,
  AddressResolverValue,
  ContenthashResolverValue,
  DataResolverValue,
]);

export type LogicalResolverValue = typeof LogicalResolverValue.Type;
