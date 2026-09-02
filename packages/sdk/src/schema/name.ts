import type { Namehash, NormalizedName } from "@ensforge/core";

export interface EnsNameIdentity {
  readonly normalizedName: NormalizedName;
  readonly node: Namehash;
}
