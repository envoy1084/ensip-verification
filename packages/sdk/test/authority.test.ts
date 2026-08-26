import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

import type { Address, PublicClient } from "viem";

import {
  ENS_BASE_REGISTRAR_ADDRESS,
  ENS_NAME_WRAPPER_ADDRESS,
  ENS_REGISTRY_ADDRESS,
  PARENT_CANNOT_CONTROL,
  prepareEnsName,
  resolveEnsAuthorityV1,
} from "../src/index.js";

const owner = "0x0000000000000000000000000000000000000001";
const registrant = "0x0000000000000000000000000000000000000002";
const controller = "0x0000000000000000000000000000000000000003";
const blockNumber = 24_000_000n;
const blockTimestamp = 1_000n;
const snapshot = {
  chainId: 1,
  blockNumber,
  blockHash: `0x${"ab".repeat(32)}`,
  blockTimestamp,
} as const;

interface ContractRead {
  readonly address: Address;
  readonly functionName: string;
  readonly blockNumber?: bigint;
}

const mainnetClient = (
  readContract: (parameters: ContractRead) => unknown,
): PublicClient =>
  ({
    chain: { id: 1 },
    readContract: async (parameters: ContractRead) => readContract(parameters),
  }) as unknown as PublicClient;

describe("Authority Algorithm 1", () => {
  it.effect("selects the Registry owner for an ordinary name", () =>
    Effect.gen(function* () {
      const reads: ContractRead[] = [];
      const publicClient = mainnetClient((parameters) => {
        reads.push(parameters);
        return owner;
      });
      const name = yield* prepareEnsName("example.xyz");

      const authority = yield* resolveEnsAuthorityV1(publicClient, {
        name,
        snapshot,
      });

      assert.deepStrictEqual(authority, { authority: owner });
      assert.strictEqual(reads[0]?.address, ENS_REGISTRY_ADDRESS);
      assert.strictEqual(reads[0]?.blockNumber, blockNumber);
    }),
  );

  it.effect("selects the registrar owner for an unwrapped .eth name", () =>
    Effect.gen(function* () {
      const publicClient = mainnetClient(({ address, functionName }) => {
        if (address === ENS_REGISTRY_ADDRESS) return controller;
        if (
          address === ENS_BASE_REGISTRAR_ADDRESS &&
          functionName === "nameExpires"
        ) {
          return 2_000n;
        }
        if (
          address === ENS_BASE_REGISTRAR_ADDRESS &&
          functionName === "ownerOf"
        ) {
          return registrant;
        }
        throw new Error("unexpected contract read");
      });
      const name = yield* prepareEnsName("example.eth");

      assert.deepStrictEqual(
        yield* resolveEnsAuthorityV1(publicClient, { name, snapshot }),
        { authority: registrant, authorityValidUntil: 2_000n },
      );
    }),
  );

  it.effect("selects the wrapped owner for a wrapped .eth name", () =>
    Effect.gen(function* () {
      const publicClient = mainnetClient(({ address, functionName }) => {
        if (address === ENS_REGISTRY_ADDRESS) return ENS_NAME_WRAPPER_ADDRESS;
        if (address === ENS_NAME_WRAPPER_ADDRESS)
          return [owner, 0, 3_000n] as const;
        if (functionName === "nameExpires") return 2_000n;
        if (functionName === "ownerOf") return ENS_NAME_WRAPPER_ADDRESS;
        throw new Error("unexpected contract read");
      });
      const name = yield* prepareEnsName("example.eth");

      assert.deepStrictEqual(
        yield* resolveEnsAuthorityV1(publicClient, { name, snapshot }),
        { authority: owner, authorityValidUntil: 2_000n },
      );
    }),
  );

  it.effect("bounds an emancipated wrapped subname by wrapper expiry", () =>
    Effect.gen(function* () {
      const publicClient = mainnetClient(({ address }) => {
        if (address === ENS_REGISTRY_ADDRESS) return ENS_NAME_WRAPPER_ADDRESS;
        if (address === ENS_NAME_WRAPPER_ADDRESS) {
          return [owner, PARENT_CANNOT_CONTROL, 2_500n] as const;
        }
        throw new Error("unexpected contract read");
      });
      const name = yield* prepareEnsName("sub.example.eth");

      assert.deepStrictEqual(
        yield* resolveEnsAuthorityV1(publicClient, { name, snapshot }),
        { authority: owner, authorityValidUntil: 2_500n },
      );
    }),
  );

  it.effect("rejects reverse names before reading contracts", () =>
    Effect.gen(function* () {
      let contractRead = false;
      const publicClient = mainnetClient(() => {
        contractRead = true;
        return owner;
      });
      const name = yield* prepareEnsName("example.reverse");
      const error = yield* Effect.flip(
        resolveEnsAuthorityV1(publicClient, { name, snapshot }),
      );

      assert.strictEqual(error.reason, "unsupported_name");
      assert.isFalse(contractRead);
    }),
  );

  it.effect("rejects an expired .eth name at the exact boundary", () =>
    Effect.gen(function* () {
      const publicClient = mainnetClient(({ address, functionName }) => {
        if (address === ENS_REGISTRY_ADDRESS) return controller;
        if (functionName === "nameExpires") return blockTimestamp;
        throw new Error("ownerOf must not be read for an expired name");
      });
      const name = yield* prepareEnsName("expired.eth");
      const error = yield* Effect.flip(
        resolveEnsAuthorityV1(publicClient, { name, snapshot }),
      );

      assert.strictEqual(error.reason, "name_expired");
    }),
  );
});
