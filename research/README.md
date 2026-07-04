# ENS Record Verification Research

This folder researches verification for ENS records beyond a single `url` text
record. The core problem is that ENS resolver data is currently a public claim
made by a name controller or resolver authority. A client can know what the ENS
record says, but often cannot know whether the referenced website, social
account, payment address, content endpoint, or other target is controlled by the
same entity.

The research is organized to separate evidence from proposal:

1. [Problem model](./01-problem-model.md)
2. [ENS current state](./02-ens-current-state.md)
3. [Comparable systems](./03-comparable-systems.md)
4. [Record taxonomy](./04-record-taxonomy.md)
5. [Threat model](./05-threat-model.md)
6. [Architecture options](./06-architecture-options.md)
7. [Proposed singleton verification model](./07-singleton-verification-model.md)
8. [Developer UX and adoption](./08-developer-ux-and-adoption.md)
9. [Open questions and evaluation checklist](./09-open-questions.md)

## Working Conclusions

- A verified ENS record should not mean "safe", "official", "legal owner", or
  "not phishing". It should mean a precisely stated verification relationship.
- The base relationship worth standardizing is bidirectional record control:
  the current ENS authority still publishes the record, and the target authority
  still publishes or signs a matching proof.
- A single generic verification envelope is preferable to one unrelated ENSIP
  per record type, but the evidence methods must remain record-specific.
- Verification should be versioned, short-lived, replay-resistant, and checked
  against live ENS state. Static badges and indefinite cached results are not
  enough.
- Third-party attestations can be useful, but they should be an optional layer
  above record-control verification rather than the root trust model.
- Developer adoption depends on a one-signature flow, deterministic proof
  locations, method adapters, and an SDK that returns explicit result semantics.

## Source Policy

Primary sources are preferred: ENS documentation and ENSIPs, protocol
specifications, EIPs, RFCs, W3C recommendations, and official protocol
documentation. Secondary sources are only useful when they document behavior not
covered by a primary source.

