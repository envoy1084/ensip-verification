# ENS Record Verification Developer Docs

The normative draft is [ENSIP-X: ENS Record Verification](../ensip-x-verification.md).

These documents are implementation guides for each ENS resolver record class:

1. [Text record verification](./01-text.md)
2. [Addr record verification](./02-addr.md)
3. [Contenthash verification](./03-contenthash.md)

Text verification is unified under `verification[text][<key>]`; the verification
record value declares the proof method or `method=none`.

Each guide includes 0-to-1 setup flows, verification flows, resolver reads,
method examples, and SDK implementation notes.
