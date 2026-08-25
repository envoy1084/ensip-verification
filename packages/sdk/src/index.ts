import { Schema } from "effect";

/** The common protocol version implemented by this SDK. */
export const ProtocolVersion = Schema.Literal("ensrv1");

export type ProtocolVersion = typeof ProtocolVersion.Type;
