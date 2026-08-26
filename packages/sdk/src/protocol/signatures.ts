import { Effect } from "effect";

import {
  encodeAbiParameters,
  encodeFunctionData,
  isAddressEqual,
  recoverAddress,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";

import {
  ClaimError,
  type ValidateAuthoritySignatureInput,
} from "../schema/claims.js";
import { erc1271Abi } from "./abi.js";
import { AUTHORITY_SIGNATURE_MAX_BYTES } from "./limits.js";

const SECP256K1_ORDER =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const SECP256K1_HALF_ORDER =
  0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0n;
const ERC1271_MAGIC_VALUE = "0x1626ba7e";
const ERC1271_CANONICAL_RESULT = encodeAbiParameters(
  [{ type: "bytes4" }],
  [ERC1271_MAGIC_VALUE],
);

const validateEoaSignature = Effect.fn("validateEoaSignature")(function* (
  authority: Address,
  digest: Hex,
  signature: string,
) {
  if (!/^0x[0-9a-f]{130}$/.test(signature)) {
    return yield* new ClaimError({
      code: "INVALID_AUTHORITY_SIGNATURE",
      message: "EOA authority signature must be exactly 65 lowercase-hex bytes",
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
    return yield* new ClaimError({
      code: "INVALID_AUTHORITY_SIGNATURE",
      message: "EOA authority signature is non-canonical",
    });
  }

  const recovered = yield* Effect.tryPromise({
    try: () => recoverAddress({ hash: digest, signature: signature as Hex }),
    catch: (cause) =>
      new ClaimError({
        code: "INVALID_AUTHORITY_SIGNATURE",
        message: "unable to recover the EOA authority signature",
        cause,
      }),
  });
  if (
    isAddressEqual(recovered, zeroAddress) ||
    !isAddressEqual(recovered, authority)
  ) {
    return yield* new ClaimError({
      code: "INVALID_AUTHORITY_SIGNATURE",
      message: "EOA authority signature does not recover the ENS authority",
    });
  }
});

export const validateAuthoritySignature: (
  publicClient: PublicClient,
  input: ValidateAuthoritySignatureInput,
) => Effect.Effect<void, ClaimError> = Effect.fn("validateAuthoritySignature")(
  function* (
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
      catch: (cause) =>
        new ClaimError({
          code: "AUTHORITY_SIGNATURE_READ_FAILED",
          message: "unable to read ENS authority code",
          cause,
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
      return yield* new ClaimError({
        code: "INVALID_AUTHORITY_SIGNATURE",
        message: `contract authority signature must contain 1-${AUTHORITY_SIGNATURE_MAX_BYTES} lowercase-hex bytes`,
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
      catch: (cause) =>
        new ClaimError({
          code: "AUTHORITY_SIGNATURE_READ_FAILED",
          message: "ENS authority ERC-1271 call failed",
          cause,
        }),
    });

    if (result.data !== ERC1271_CANONICAL_RESULT) {
      return yield* new ClaimError({
        code: "INVALID_AUTHORITY_SIGNATURE",
        message: "ENS authority returned an invalid ERC-1271 result",
      });
    }
  },
);
