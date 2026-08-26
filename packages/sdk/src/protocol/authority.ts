import { Effect } from "effect";

import {
  isAddressEqual,
  keccak256,
  type PublicClient,
  toBytes,
  zeroAddress,
} from "viem";

import {
  baseRegistrarAbi,
  ensRegistryAbi,
  nameWrapperAbi,
} from "../data/abi.js";
import {
  ENS_BASE_REGISTRAR_ADDRESS,
  ENS_NAME_WRAPPER_ADDRESS,
  ENS_REGISTRY_ADDRESS,
} from "../data/contracts.js";
import { PARENT_CANNOT_CONTROL } from "../data/ens.js";
import {
  type EnsAuthority,
  type ResolveEnsAuthorityV1Input,
} from "../schema/ens.js";
import { RpcError, VerificationError } from "../schema/errors.js";

export const resolveEnsAuthorityV1: (
  publicClient: PublicClient,
  input: ResolveEnsAuthorityV1Input,
) => Effect.Effect<EnsAuthority, RpcError | VerificationError> = Effect.fn(
  "resolveEnsAuthorityV1",
)(function* (
  publicClient: PublicClient,
  { name, snapshot }: ResolveEnsAuthorityV1Input,
) {
  const labels = name.normalizedName.split(".");
  if (labels.at(-1) === "reverse") {
    return yield* new VerificationError({
      code: "UNSUPPORTED_NAME",
      message: "reverse names do not have a supported verification authority",
    });
  }

  const registryOwner = yield* Effect.tryPromise({
    try: () =>
      publicClient.readContract({
        address: ENS_REGISTRY_ADDRESS,
        abi: ensRegistryAbi,
        functionName: "owner",
        args: [name.node as `0x${string}`],
        blockNumber: snapshot.blockNumber,
      }),
    catch: () =>
      new RpcError({
        code: "AUTHORITY_READ_FAILED",
        message: "unable to read the ENS Registry owner",
      }),
  });

  const isEthSecondLevel = labels.length === 2 && labels[1] === "eth";
  const isWrapped = isAddressEqual(registryOwner, ENS_NAME_WRAPPER_ADDRESS);

  if (isWrapped) {
    const [wrappedOwner, fuses, wrapperExpiry] = yield* Effect.tryPromise({
      try: () =>
        publicClient.readContract({
          address: ENS_NAME_WRAPPER_ADDRESS,
          abi: nameWrapperAbi,
          functionName: "getData",
          args: [BigInt(name.node)],
          blockNumber: snapshot.blockNumber,
        }),
      catch: () =>
        new RpcError({
          code: "AUTHORITY_READ_FAILED",
          message: "unable to read Name Wrapper state",
        }),
    });

    if (isAddressEqual(wrappedOwner, zeroAddress)) {
      return yield* new VerificationError({
        code: "OWNER_NOT_FOUND",
        message: "wrapped ENS name has no owner",
      });
    }

    if (isEthSecondLevel) {
      const tokenId = BigInt(keccak256(toBytes(labels[0] ?? "")));
      const registrarExpiry = yield* Effect.tryPromise({
        try: () =>
          publicClient.readContract({
            address: ENS_BASE_REGISTRAR_ADDRESS,
            abi: baseRegistrarAbi,
            functionName: "nameExpires",
            args: [tokenId],
            blockNumber: snapshot.blockNumber,
          }),
        catch: () =>
          new RpcError({
            code: "AUTHORITY_READ_FAILED",
            message: "unable to read .eth registration expiry",
          }),
      });

      if (snapshot.blockTimestamp >= registrarExpiry) {
        return yield* new VerificationError({
          code: "NAME_EXPIRED",
          message: ".eth registration is expired at the ENS snapshot",
        });
      }

      const registrarOwner = yield* Effect.tryPromise({
        try: () =>
          publicClient.readContract({
            address: ENS_BASE_REGISTRAR_ADDRESS,
            abi: baseRegistrarAbi,
            functionName: "ownerOf",
            args: [tokenId],
            blockNumber: snapshot.blockNumber,
          }),
        catch: () =>
          new RpcError({
            code: "AUTHORITY_READ_FAILED",
            message: "unable to read .eth registrar owner",
          }),
      });

      if (!isAddressEqual(registrarOwner, ENS_NAME_WRAPPER_ADDRESS)) {
        return yield* new VerificationError({
          code: "INVALID_AUTHORITY_STATE",
          message: "wrapped .eth name is not owned by the Name Wrapper",
        });
      }

      return {
        authority: wrappedOwner,
        authorityValidUntil: registrarExpiry,
      };
    }

    if ((fuses & PARENT_CANNOT_CONTROL) !== 0) {
      if (snapshot.blockTimestamp >= wrapperExpiry) {
        return yield* new VerificationError({
          code: "NAME_EXPIRED",
          message: "wrapped ENS name is expired at the ENS snapshot",
        });
      }

      return {
        authority: wrappedOwner,
        authorityValidUntil: wrapperExpiry,
      };
    }

    return { authority: wrappedOwner };
  }

  if (isEthSecondLevel) {
    const tokenId = BigInt(keccak256(toBytes(labels[0] ?? "")));
    const registrarExpiry = yield* Effect.tryPromise({
      try: () =>
        publicClient.readContract({
          address: ENS_BASE_REGISTRAR_ADDRESS,
          abi: baseRegistrarAbi,
          functionName: "nameExpires",
          args: [tokenId],
          blockNumber: snapshot.blockNumber,
        }),
      catch: () =>
        new RpcError({
          code: "AUTHORITY_READ_FAILED",
          message: "unable to read .eth registration expiry",
        }),
    });

    if (snapshot.blockTimestamp >= registrarExpiry) {
      return yield* new VerificationError({
        code: "NAME_EXPIRED",
        message: ".eth registration is expired at the ENS snapshot",
      });
    }

    const registrant = yield* Effect.tryPromise({
      try: () =>
        publicClient.readContract({
          address: ENS_BASE_REGISTRAR_ADDRESS,
          abi: baseRegistrarAbi,
          functionName: "ownerOf",
          args: [tokenId],
          blockNumber: snapshot.blockNumber,
        }),
      catch: () =>
        new RpcError({
          code: "AUTHORITY_READ_FAILED",
          message: "unable to read .eth registrar owner",
        }),
    });

    if (isAddressEqual(registrant, zeroAddress)) {
      return yield* new VerificationError({
        code: "OWNER_NOT_FOUND",
        message: ".eth registration has no owner",
      });
    }

    return {
      authority: registrant,
      authorityValidUntil: registrarExpiry,
    };
  }

  if (isAddressEqual(registryOwner, zeroAddress)) {
    return yield* new VerificationError({
      code: "OWNER_NOT_FOUND",
      message: "ENS name has no Registry owner",
    });
  }

  return { authority: registryOwner };
});
