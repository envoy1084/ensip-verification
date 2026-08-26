import { Schema } from "effect";

export const ProtocolVersion = Schema.Literal("ensrv1");

export type ProtocolVersion = typeof ProtocolVersion.Type;
