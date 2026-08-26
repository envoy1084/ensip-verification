import { assert, describe, it } from "@effect/vitest";

import { encodeFunctionResult, type PublicClient } from "viem";

import { resolverTextAbi } from "../src/data/abi.js";
import { RecordVerification } from "../src/index.js";

const resolverAddress = "0x0000000000000000000000000000000000000123";

describe("RecordVerification", () => {
  it("returns a Promise result with null verification by default", async () => {
    let resolverReads = 0;
    const publicClient = {
      chain: { id: 1 },
      getBlockNumber: async () => 23_085_558n,
      readContract: async () => {
        resolverReads += 1;
        return [
          encodeFunctionResult({
            abi: resolverTextAbi,
            functionName: "text",
            result: "https://example.com",
          }),
          resolverAddress,
        ] as const;
      },
    } as unknown as PublicClient;

    const sdk = new RecordVerification({ publicClient });
    const result = await sdk.getRecord({
      name: "example.eth",
      type: "text",
      key: "url",
    });

    assert.deepStrictEqual(result, {
      success: true,
      data: {
        value: "https://example.com",
        verification: null,
      },
    });
    assert.strictEqual(resolverReads, 1);
  });

  it("returns expected errors as values", async () => {
    let rpcReads = 0;
    const publicClient = {
      chain: { id: 1 },
      getBlockNumber: async () => {
        rpcReads += 1;
        return 23_085_558n;
      },
    } as unknown as PublicClient;
    const sdk = new RecordVerification({ publicClient });

    assert.deepStrictEqual(
      await sdk.getRecord({
        name: "example.eth",
        type: "addr",
        key: "060",
      }),
      {
        success: false,
        error: {
          code: "INVALID_RECORD_INPUT",
          message: "addr key must be a canonical uint256 decimal",
        },
      },
    );
    assert.strictEqual(rpcReads, 0);
  });

  it("does not run an incomplete verification flow", async () => {
    let rpcReads = 0;
    const publicClient = {
      chain: { id: 1 },
      getBlockNumber: async () => {
        rpcReads += 1;
        return 23_085_558n;
      },
    } as unknown as PublicClient;
    const sdk = new RecordVerification({ publicClient });

    assert.deepStrictEqual(
      await sdk.getRecord({
        name: "example.eth",
        type: "text",
        key: "url",
        verify: true,
      }),
      {
        success: false,
        error: {
          code: "VERIFICATION_NOT_IMPLEMENTED",
          message: "record verification is not implemented yet",
        },
      },
    );
    assert.strictEqual(rpcReads, 0);
  });
});
