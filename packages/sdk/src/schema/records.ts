import { Schema } from "effect";

import { Uint256Decimal, UnicodeScalarString } from "./encoding.js";

export type RecordSelector =
  | { readonly type: "text"; readonly key: string }
  | { readonly type: "addr"; readonly key: string }
  | { readonly type: "contenthash" }
  | { readonly type: "data"; readonly key: string };

export const TextRecordSelector = Schema.Struct({
  type: Schema.Literal("text"),
  key: UnicodeScalarString,
});

export const AddressRecordSelector = Schema.Struct({
  type: Schema.Literal("addr"),
  key: Uint256Decimal,
});

export const ContenthashRecordSelector = Schema.Struct({
  type: Schema.Literal("contenthash"),
});

export const DataRecordSelector = Schema.Struct({
  type: Schema.Literal("data"),
  key: UnicodeScalarString,
});

export const RecordSelectorSchema = Schema.Union([
  TextRecordSelector,
  AddressRecordSelector,
  ContenthashRecordSelector,
  DataRecordSelector,
]);

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

export type LogicalResolverValue =
  | { readonly type: "text"; readonly value: string }
  | { readonly type: "addr"; readonly value: Uint8Array }
  | { readonly type: "contenthash"; readonly value: Uint8Array }
  | { readonly type: "data"; readonly value: Uint8Array };

export const TextResolverValue = Schema.Struct({
  type: Schema.Literal("text"),
  value: UnicodeScalarString,
});

export const AddressResolverValue = Schema.Struct({
  type: Schema.Literal("addr"),
  value: Schema.Uint8Array,
});

export const ContenthashResolverValue = Schema.Struct({
  type: Schema.Literal("contenthash"),
  value: Schema.Uint8Array,
});

export const DataResolverValue = Schema.Struct({
  type: Schema.Literal("data"),
  value: Schema.Uint8Array,
});

export const LogicalResolverValueSchema = Schema.Union([
  TextResolverValue,
  AddressResolverValue,
  ContenthashResolverValue,
  DataResolverValue,
]);
