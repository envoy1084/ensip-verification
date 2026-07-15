# Record Verification Research

This folder researches verification for ENS records beyond a single `url` text
record. The core problem is that ENS resolver data is currently a public claim
made by a name controller or resolver authority. A client can know what the ENS
record says, but often cannot know whether the referenced website, social
account, payment address, content endpoint, or other target is controlled by the
same entity.

The research is organized to separate evidence from proposal. Files 01–11 are
the exploratory history and may use superseded terminology. Files 12–16 contain
the current review, authority analysis, issue ledger, lifecycle, and adopted
decisions; `16-protocol-decisions.md` wins if an older file conflicts.

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
16. [Protocol decisions](./16-protocol-decisions.md)

## Drafts

- [Record Verification ENSIP working draft](./drafts/record-verification-ensip.md)

The ENSIP draft is preserved as research only. The public documentation now
defines individual protocol components, which will be reviewed and hardened
before a replacement ENSIP is assembled.

## Working Conclusions

- A verified ENS record should not mean "safe", "official", "legal owner", or
  "not phishing". It should mean a precisely stated verification relationship.
- The protocol distinguishes current ENS-authority `authorization`,
  bidirectional target `control`, and third-party `attestation` rather than
  forcing every record into a generic control claim.
- The provisional architecture separates shared components from method
  profiles. Shared components own discovery, descriptor parsing, raw live-value
  hashing, current-authority binding, common claim fields, and result semantics.
  Method profiles own external proof mechanics. ENSIP packaging is deferred
  until these parts are hardened.
- Target and descriptor records are resolved through the Universal Resolver at
  one block. Exact-name authority is a separately versioned algorithm: current
  rules use the Name Wrapper, Base Registrar, and Registry as appropriate.
  Future ENS authority changes allocate a new algorithm version without
  rewriting the verification kernel.
- Verification discovery now follows resolver record classes:
  `verification[text][<key>]`, `verification[addr][<coinType>]`,
  `verification[contenthash]`, and reserved `verification[data][<key>]`.
- The ENS-side descriptor is closed and compact:
  `ensrv1 a=<authority-version> m=<concrete-versioned-method> [u=<uri>] [h=<hash>]`.
  Unknown or duplicate fields are invalid.
- Verifier output exposes only `verified` or `none` as public statuses. Positive
  results carry relationship `authorization`, `control`, or `attestation`;
  failures are stable error codes on `none`.
- The one strict EIP-712 claim binds exact live resolver bytes, authority
  version, immutable method, canonical target, issuance, and expiry. It has no
  nonce or extensions. Replay safety comes from live state and time checks, not
  an unconsumed nonce with no shared state.
- Account targets use CAIP-10. The first account-signature profile supports only
  unambiguous ENSIP-9/11 EVM mappings; other chain families need concrete
  profiles.
- Verification is SDK/verifier-level and deploys no new contract. ENS and
  ERC-1271 checks are read-only calls to existing contracts.
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
