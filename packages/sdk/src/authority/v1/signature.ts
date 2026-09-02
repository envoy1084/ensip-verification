import { Effect } from "effect";

import {
  encodeFunctionData,
  isAddressEqual,
  recoverAddress,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";

import {
  ERC1271_CANONICAL_RESULT,
  SECP256K1_HALF_ORDER,
  SECP256K1_ORDER,
} from "../../core/eip712.js";
import type { ValidateAuthoritySignatureInput } from "../../schema/claims.js";
import { RecordVerificationError } from "../../schema/errors.js";
import { AUTHORITY_SIGNATURE_MAX_BYTES } from "../../spec/limits.js";
import { erc1271Abi } from "./erc1271.js";

const validateEoaSignature = Effect.fn("validateEoaSignature")(function* (
  authority: Address,
  digest: Hex,
  signature: string,
) {
  if (!/^0x[0-9a-f]{130}$/.test(signature)) {
    return yield* new RecordVerificationError({
      code: "AUTHORITY_INVALID",
      reason: "EOA authority signature must be exactly 65 lowercase-hex bytes",
    });
  }

  const r = BigInt(`0x${signature.slice(2, 66)}`);
  const s = BigInt(`0x${signature.slice(66, 130)}`);
  const v = Number.parseInt(signature.slice(130, 132), 16);
  if (
    r < 1n ||
    r >= SECP256K1_ORDER ||
    s < 1n ||
    s > SECP256K1_HALF_ORDER ||
    (v !== 27 && v !== 28)
  ) {
    return yield* new RecordVerificationError({
      code: "AUTHORITY_INVALID",
      reason: "EOA authority signature is non-canonical",
    });
  }

  const recovered = yield* Effect.tryPromise({
    try: () => recoverAddress({ hash: digest, signature: signature as Hex }),
    catch: () =>
      new RecordVerificationError({
        code: "AUTHORITY_INVALID",
        reason: "unable to recover the EOA authority signature",
      }),
  });
  if (
    isAddressEqual(recovered, zeroAddress) ||
    !isAddressEqual(recovered, authority)
  ) {
    return yield* new RecordVerificationError({
      code: "AUTHORITY_INVALID",
      reason: "EOA authority signature does not recover the ENS authority",
    });
  }
});

export const validateAuthoritySignature: (
  publicClient: PublicClient,
  input: ValidateAuthoritySignatureInput,
) => Effect.Effect<void, RecordVerificationError> = Effect.fn(
  "validateAuthoritySignature",
)(function* (
  publicClient: PublicClient,
  input: ValidateAuthoritySignatureInput,
) {
  const authority = input.authority as Address;
  const code = yield* Effect.tryPromise({
    try: () =>
      publicClient.getCode({
        address: authority,
        blockNumber: input.blockNumber,
      }),
    catch: () =>
      new RecordVerificationError({
        code: "ENS_READ_FAILED",
        reason: "unable to read ENS authority code",
      }),
  });

  if (code === undefined || code === "0x") {
    return yield* validateEoaSignature(
      authority,
      input.digest,
      input.signature,
    );
  }

  if (
    !/^0x(?:[0-9a-f]{2})+$/.test(input.signature) ||
    input.signature.length > 2 + AUTHORITY_SIGNATURE_MAX_BYTES * 2
  ) {
    return yield* new RecordVerificationError({
      code: "AUTHORITY_INVALID",
      reason: `contract authority signature must contain 1-${AUTHORITY_SIGNATURE_MAX_BYTES} lowercase-hex bytes`,
    });
  }

  const result = yield* Effect.tryPromise({
    try: () =>
      publicClient.call({
        to: authority,
        data: encodeFunctionData({
          abi: erc1271Abi,
          functionName: "isValidSignature",
          args: [input.digest, input.signature as Hex],
        }),
        blockNumber: input.blockNumber,
      }),
    catch: () =>
      new RecordVerificationError({
        code: "ENS_READ_FAILED",
        reason: "ENS authority ERC-1271 call failed",
      }),
  });

  if (result.data !== ERC1271_CANONICAL_RESULT) {
    return yield* new RecordVerificationError({
      code: "AUTHORITY_INVALID",
      reason: "ENS authority returned an invalid ERC-1271 result",
    });
  }
});
