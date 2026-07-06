# ENSIP Record Design Practices

This memo reviews the existing ENSIP repository cloned under `.repos/ensips`
and extracts conventions relevant to an ENS record verification proposal. The
most important conclusion is that ENSIPs usually standardize small, precise
record profiles or resolver interfaces. They do not rely on broad, ambiguous
record meanings.

## ENSIP Document Shape

The ENSIP repository template and README require a predictable structure:

- frontmatter with `description`, `contributors`, and `ensip.created` /
  `ensip.status`;
- one title;
- Abstract, Motivation, Specification, Rationale, Backwards Compatibility,
  Security Considerations, and Copyright sections;
- normative language when behavior is required;
- examples, test vectors, and pseudocode where behavior is not obvious.

For verification work, this means each base ENSIP and method profile should be
written as an implementation spec, not as a product narrative. The spec should
define exact keys, exact formats, validation algorithms, failure behavior,
compatibility, and security risks.

## Resolver Profiles vs Text Records

Existing ENSIPs use two main patterns.

### Resolver Profiles

Resolver-profile ENSIPs define ABI methods, ERC-165 interface IDs, expected
return values, events, and compatibility behavior.

Examples:

| ENSIP    | Pattern                                                                    |
| -------- | -------------------------------------------------------------------------- |
| ENSIP-1  | Registry/resolver split, resolver interfaces, `supportsInterface`.         |
| ENSIP-3  | `name(bytes32)` reverse resolver interface and reverse registrar flow.     |
| ENSIP-7  | `contenthash` resolver profile and multicodec encoding.                    |
| ENSIP-9  | `addr(bytes32,uint)` multicoin address resolver, events, encodings, tests. |
| ENSIP-16 | Resolver metadata function and event for offchain data discovery.          |
| ENSIP-23 | Universal Resolver as an entrypoint over existing resolver profiles.       |
| ENSIP-24 | `data(bytes32,string)` arbitrary bytes resolver profile and change event.  |

Best practice:

- use a resolver profile when the record is fundamentally typed data or needs
  ABI-level behavior;
- include interface ID, events, return-empty semantics, and examples;
- preserve existing resolver behavior where possible;
- define how clients behave when an interface is missing or unsupported.

### Text Record Profiles

Text-record ENSIPs extend ENSIP-5 and define keys plus value formats.

Examples:

| ENSIP    | Pattern                                                                     |
| -------- | --------------------------------------------------------------------------- |
| ENSIP-5  | Global keys and service keys for arbitrary text metadata.                   |
| ENSIP-12 | `avatar` text record, URI schemes, NFT avatar verification steps.           |
| ENSIP-18 | Profile keys with description, format, example, design considerations.      |
| ENSIP-25 | Parameterized verification key `agent-registration[<registry>][<agentId>]`. |
| ENSIP-26 | `agent-context` and parameterized `agent-endpoint[<protocol>]`.             |

Best practice:

- use text records when existing resolver support is enough;
- keep the original profile record intact and add verification descriptor
  records only when needed;
- define exact key spelling;
- define value format, including whether value content has semantic meaning;
- define absent, empty, malformed, unsupported, and stale states;
- include examples for every key shape.

## ENSIP-5 Key Rules

ENSIP-5 distinguishes global keys from service keys.

Global keys:

- use lowercase letters, numbers, and hyphen;
- should be broadly useful across ENS clients;
- should not be created for a single vendor or narrow app if service keys work.

Service keys:

- use reverse dot notation for a namespace the service owns;
- must contain at least one dot;
- allow services to define their own keys without updating ENSIP-5;
- support hierarchies such as `com.example.users`.

Verification implication:

- verification descriptor keys should use the global `verification` prefix and
  resolver-class parameters, such as `verification[text][url]` or
  `verification[addr][60]`;
- service-specific claims should bind to the service key, such as `com.github`,
  but should not squat inside the service namespace unless the service itself
  defines that key;
- profile display keys such as `description`, `location`, `alias`, and `theme`
  should generally remain unverified unless a separate attestation profile is
  explicitly used.

## Parameterized Text Keys

ENSIP-25 and ENSIP-26 show that bracketed parameters are acceptable when a key
needs deterministic lookup for a specific target.

Observed forms:

```text
agent-registration[<registry>][<agentId>]
agent-endpoint[<protocol>]
```

Practices to copy:

- define every parameter;
- define canonical encoding for parameters;
- define delimiter parsing. The current verification design allows `[` and `]`
  inside text keys by using the final `]` as the parameter terminator;
- explain uniqueness;
- include at least one full key example;
- define whether the value is semantic or whether non-empty presence is enough.

Verification descriptor examples that fit this pattern:

```text
verification[text][url]
verification[text][com.github]
verification[text][agent-endpoint[mcp]]
verification[addr][60]
verification[contenthash]
verification[data][<data-key>]
```

These identify the resolver record being verified. The descriptor value
identifies the method.

## Value Format Practices

Existing ENSIPs use different value strategies depending on the problem.

| Strategy                  | Example                                         | Use When                            |
| ------------------------- | ----------------------------------------------- | ----------------------------------- |
| Arbitrary UTF-8           | ENSIP-5 text values                             | Human-readable metadata.            |
| Structured string         | ENSIP-17 `ENS1 <resolver> [context]` TXT record | Compact protocol records.           |
| URI                       | ENSIP-12 avatar, ENSIP-26 endpoint              | Existing URI semantics are enough.  |
| Binary canonical encoding | ENSIP-7 contenthash, ENSIP-9 addresses          | Typed data needs exact encoding.    |
| Presence/non-empty        | ENSIP-25 agent registration                     | The key identity carries the claim. |

Verification records should not leave value semantics vague. If a descriptor
uses a compact string, it should define field separators, duplicate-field
behavior, unknown fields, required fields, and malformed values.

## Validation Flow Practices

Several ENSIPs specify algorithms rather than only records.

### Forward-Confirmed Reverse Resolution

ENSIP-3 and ENSIP-19 show the strongest existing ENS validation pattern:

1. one side claims a name;
2. the other side must resolve back to the same address;
3. mismatch invalidates the result.

Verification should copy this bidirectional style where there is a target
authority.

### Avatar Resolution

ENSIP-12 defines:

- unsupported URI schemes are ignored;
- absent resolver, revert, and empty string are treated as no valid avatar;
- NFT avatars should verify token ownership;
- failing ownership check makes the avatar invalid.

Verification should similarly define unsupported methods and failed checks
without hiding the underlying ENS record.

### Registry-to-ENS Verification

ENSIP-25 starts from an external registry entry and verifies that the claimed
ENS name publishes a deterministic parameterized text key. This is useful
precedent for target-to-ENS flows where the target side already has an
identifier, registry, or account ID.

### Offchain and DNS Resolution

ENSIP-17, ENSIP-20, ENSIP-21, and ENSIP-23 show how ENS specs treat offchain
data:

- use explicit gateway or resolver interfaces;
- keep validation inside the method;
- document privacy and availability risks;
- do not treat a gateway response as trusted unless the method validates it.

Verification profiles that use OAuth providers, DNS, HTTPS, CCIP-Read, or
attestation services should follow the same pattern.

## Canonicalization Practices

Existing ENSIPs are precise when ambiguity would break interoperability.

Examples:

- ENSIP-15 defines name normalization before namehashing.
- ENSIP-7 defines contenthash as machine-readable multicodec bytes.
- ENSIP-9 defines native binary address encodings and checksum handling.
- ENSIP-11 defines EVM chain ID to coin type conversion.
- ENSIP-17 defines a fixed TXT prefix, `ENS1`.
- ENSIP-25 uses ERC-7930 interoperable addresses for registry identity.

Verification method profiles should define canonicalization at the same level:

- record selector;
- current record value;
- target identifier;
- method identifier;
- chain or registry identifier;
- hash input;
- user-visible display value.

## Compatibility Practices

Common compatibility patterns:

- unaware clients ignore new text keys;
- existing resolver records remain the canonical record;
- missing records return empty strings or zero-length data;
- legacy records may be queried as fallback;
- resolver upgrades are avoided unless the new behavior really needs a new
  interface;
- compatibility with existing events and interfaces is explicitly stated.

For record verification, the base rule should be:

- verification failure must not make clients hide the underlying ENS record;
- a verified state is an additional property, not a replacement record;
- method profiles should define how old descriptors, stale records, and
  ownership transfers are handled.

## Recommended ENSIP Framing for This Proposal

The proposal should be split into a base ENSIP and method profiles.

### Base ENSIP

Scope:

- verification terminology and result states;
- current ENS authority rules;
- compact descriptor grammar;
- raw live-value hashing rules;
- common EIP-712 claim fields;
- expiry and cache rules;
- requirements for method profiles;
- resolver-class discovery keys.

It should not define separate verification categories such as `url`, `social`,
or `email`.

### Method Profiles

Each profile should include:

- ENS record category;
- exact existing record selector;
- verification descriptor key;
- key parameter grammar;
- descriptor fields used by the method;
- canonicalization;
- target authority;
- validation algorithm;
- expiry and revocation;
- backwards compatibility;
- security considerations;
- examples and test vectors if hashes or signatures are involved.

Initial profiles:

| Profile                              | Existing ENSIP Practice To Follow                                             |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `https-origin`                       | ENSIP-5 text keys, RFC well-known convention, EIP-712/ERC-1271.               |
| `dns-txt`                            | ENSIP-5 text keys, DNS TXT proof treatment, DNSSEC assurance where available. |
| `service-account`                    | ENSIP-5 service keys and ENSIP-18 profile service key guidance.               |
| `account-signature`                  | ENSIP-9/11 address bytes plus EIP-712/ERC-1271 and chain-family signatures.   |
| `content-manifest`                   | ENSIP-7 contenthash encoding and content-root manifest validation.            |
| `email-domain` / `email-attestation` | ENSIP-18 `email` key with explicit domain-vs-mailbox semantics.               |
| `issuer-attestation`                 | Optional attestation reference, with issuer trust and revocation semantics.   |

## Sources

- [ENSIP repository README](https://github.com/ensdomains/ensips)
- [ENSIP template](https://github.com/ensdomains/ensips/blob/main/template.md)
- [ENSIP-1: ENS](https://docs.ens.domains/ensip/1/)
- [ENSIP-3: Reverse Resolution](https://docs.ens.domains/ensip/3/)
- [ENSIP-5: Text Records](https://docs.ens.domains/ensip/5/)
- [ENSIP-7: Contenthash field](https://docs.ens.domains/ensip/7/)
- [ENSIP-9: Multichain Address Resolution](https://docs.ens.domains/ensip/9/)
- [ENSIP-11: EVM compatible Chain Address Resolution](https://docs.ens.domains/ensip/11/)
- [ENSIP-12: Avatar Text Records](https://docs.ens.domains/ensip/12/)
- [ENSIP-15: Name Normalization](https://docs.ens.domains/ensip/15/)
- [ENSIP-16: Metadata Event Discovery](https://docs.ens.domains/ensip/16/)
- [ENSIP-17: Gasless DNS Resolution](https://docs.ens.domains/ensip/17/)
- [ENSIP-18: Profile Text Records](https://docs.ens.domains/ensip/18/)
- [ENSIP-19: Multichain Primary Names](https://docs.ens.domains/ensip/19/)
- [ENSIP-20: Wildcard Writing](https://docs.ens.domains/ensip/20/)
- [ENSIP-21: Batch Gateway Offchain Lookup Protocol](https://docs.ens.domains/ensip/21/)
- [ENSIP-23: Universal Resolver](https://docs.ens.domains/ensip/23/)
- [ENSIP-24: Arbitrary Data Resolution](https://docs.ens.domains/ensip/24/)
- [ENSIP-25: AI Agent Registry ENS Name Verification](https://docs.ens.domains/ensip/25/)
- [ENSIP-26: Agent Text Records](https://docs.ens.domains/ensip/26/)
