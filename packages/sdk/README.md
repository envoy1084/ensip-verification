# ENS Record Verification SDK

Promise-based Node.js SDK for reading ENS records and verifying
`https-origin.v1` and `dns-txt.v1` control proofs. ENS resolution, ownership,
expiry, wrapper state, Universal Resolver routing, and CCIP Read are provided
by ENSForge.

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

To publish a DNS proof, call `prepareDnsTxtVerification` after configuring the
record's `dns-txt.v1` discovery descriptor. Sign the returned `typedData` with
the returned ENS `authority`, then pass the preparation and signature to
`createDnsTxtRecord`. The result contains the exact DNS TXT owner and value to
publish. `zoneFileValue` contains the quoted and escaped representation needed
by zone-file-style inputs such as Cloudflare's. An empty discovery record may
be prepared before it is configured; `descriptorConfigured` indicates whether
the caller still needs to set it.

DNS TXT verification validates RRSIG, DNSKEY, and DS records locally against
the bundled IANA root trust anchors. The v0 implementation accepts direct TXT
answers only, rejects aliases, and does not cache DNS evidence.

The package is currently private while the protocol and public API are under
development.
