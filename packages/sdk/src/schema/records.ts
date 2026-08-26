import { Schema } from "effect";

import { Uint256, UnicodeScalarString } from "./encoding.js";

export const TextRecordSelector = Schema.TaggedStruct("Text", {
  key: UnicodeScalarString,
});

export const AddressRecordSelector = Schema.TaggedStruct("Address", {
  coinType: Uint256,
});

export const ContenthashRecordSelector = Schema.TaggedStruct("Contenthash", {});

export const DataRecordSelector = Schema.TaggedStruct("Data", {
  key: UnicodeScalarString,
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

export const TextResolverValue = Schema.TaggedStruct("Text", {
  value: UnicodeScalarString,
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
