# ENS Record Verification SDK

Promise-based Node.js SDK for reading ENS records and verifying
`https-origin.v1` control proofs. ENS resolution, ownership, expiry, wrapper
state, Universal Resolver routing, and CCIP Read are provided by ENSForge.

```ts
import { RecordVerification } from "@thenamespace/record-verification";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const verification = new RecordVerification({
  publicClient: createPublicClient({ chain: mainnet, transport: http() }),
});

const result = await verification.getRecord({
  name: "example.eth",
  type: "text",
  key: "url",
  verify: true,
});
```

Omit `verify` to read the record without proof verification. Expected failures
are returned as `{ success: false, error }`; invalid mainnet client
configuration is rejected during construction.

The package is currently private while the protocol and public API are under
development.
