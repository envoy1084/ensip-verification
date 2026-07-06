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
12. [Current architecture review](./12-current-architecture-review.md)
13. [ENS authority model](./13-ens-authority-model.md)
14. [Issue tracker](./14-issues.md)
15. [Proof lifecycle model](./15-proof-lifecycle.md)

## Working Conclusions

- A verified ENS record should not mean "safe", "official", "legal owner", or
  "not phishing". It should mean a precisely stated verification relationship.
- The base relationship worth standardizing is bidirectional record control:
  the current ENS authority still publishes the record, and the target authority
  still publishes or signs a matching proof.
- The current architecture is a small base ENSIP plus method profiles. The base
  owns discovery, descriptor parsing, raw live-value hashing, current-authority
  binding, common claim fields, and result semantics. Method profiles own
  external proof mechanics.
- Current ENS authority should be resolved through the current ENS mainnet
  authority rules. The first release should fail closed: wrapped names use the
  Name Wrapper owner, unwrapped `.eth` second-level names use the Base Registrar
  registrant, and other unwrapped names use the ENS Registry owner for the exact
  node.
- Verification discovery now follows resolver record classes:
  `verification[text][<key>]`, `verification[addr][<coinType>]`,
  `verification[contenthash]`, and reserved `verification[data][<key>]`.
- The ENS-side descriptor is compact: `ensrv1 m=<method> [u=<uri>] [h=<hash>]`.
  There is no `method=none`, descriptor-level `kind`, or descriptor-level
  expiry.
- Verifier output should expose only `verified` or `none` as public statuses.
  Positive results carry kind `control` or `attestation`; failures are error
  codes on `none`.
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
