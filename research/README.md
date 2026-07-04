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
7. [Layered native verification model](./07-layered-native-verification-model.md)
8. [Developer UX and adoption](./08-developer-ux-and-adoption.md)
9. [Open questions and evaluation checklist](./09-open-questions.md)
10. [Singleton reassessment](./10-singleton-reassessment.md)
11. [ENSIP record design practices](./11-ensip-record-design-practices.md)

## Working Conclusions

- A verified ENS record should not mean "safe", "official", "legal owner", or
  "not phishing". It should mean a precisely stated verification relationship.
- The base relationship worth standardizing is bidirectional record control:
  the current ENS authority still publishes the record, and the target authority
  still publishes or signs a matching proof.
- A mandatory singleton proof envelope is not the best fit. The better model is
  a small base ENSIP for shared semantics plus native method profiles for URLs,
  socials, addresses, contenthashes, attestations, and future records.
- Verification should be versioned, short-lived, replay-resistant, and checked
  against live ENS state. Static badges and indefinite cached results are not
  enough.
- Third-party attestations can be useful, but they should be an optional layer
  above record-control verification rather than the root trust model.
- Developer adoption depends on Ethereum-native signatures where appropriate,
  method-native integrations such as OAuth or DNSSEC, optional discovery, and an
  SDK that hides adapter complexity while returning explicit result semantics.
- ENSIP practice favors small resolver profiles, explicit text-record keys,
  parameter grammar, examples, backwards compatibility, and method-specific
  validation flows over broad underspecified records.

## Source Policy

Primary sources are preferred: ENS documentation and ENSIPs, protocol
specifications, EIPs, RFCs, W3C recommendations, and official protocol
documentation. Secondary sources are only useful when they document behavior not
covered by a primary source.
