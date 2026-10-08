import { defineConfig } from "vocs/config";

import { abnfGrammar } from "./grammars/abnf";
import { pseudocodeGrammar } from "./grammars/pseudocode";

export default defineConfig({
  title: "Record Verification",
  head: {
    title: "ENSIP-X - Record Verfication",
  },
  description:
    "ENS records identify external resources but do not prove who controls them. Bind proof to the live record value so clients can verify the connection.",
  baseUrl:
    process.env.VERCEL_ENV === "production"
      ? "https://ensip-verification.vercel.app"
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://ensip-verification.vercel.app",
  checkDeadlinks: true,
  codeHighlight: {
    langs: [abnfGrammar, pseudocodeGrammar],
  },
  editLink: {
    link: "https://github.com/envoy1084/ensip-verification/edit/main/apps/web/src/pages/:path",
    text: "Suggest changes to this page",
  },
  iconUrl: "/icon.svg",
  logoUrl: { light: "/logo-light.svg", dark: "/logo-dark.svg" },
  socials: [
    { icon: "github", link: "https://github.com/envoy1084/ensip-verification" },
  ],
  mcp: {
    enabled: true,
  },
  topNav: [
    {
      text: "Learn",
      link: "/docs",
      match: "/docs",
    },
    {
      text: "For Implementers",
      link: "/implementers",
      match: "/implementers",
    },
  ],
  sidebar: {
    "/docs": [
      {
        text: "Learn",
        items: [
          { text: "Introduction", link: "/docs" },
          {
            text: "How Verification Works",
            link: "/docs/how-verification-works",
          },
        ],
      },
      {
        text: "Core Components",
        items: [
          {
            text: "Discovery Records",
            link: "/docs/components/discovery-records",
          },
          {
            text: "Verification Descriptor",
            link: "/docs/components/verification-descriptor",
          },
          {
            text: "Authority",
            collapsed: true,
            items: [
              { text: "Overview", link: "/docs/authority" },
              { text: "Version 1", link: "/docs/authority/version-1" },
            ],
          },
          { text: "Common Claim", link: "/docs/components/common-claim" },
          { text: "Proof Envelope", link: "/docs/components/proof-envelope" },
          { text: "Proof Key", link: "/docs/components/proof-key" },
          { text: "Lifecycle", link: "/docs/components/lifecycle" },
          {
            text: "Verification Results",
            link: "/docs/components/verification-results",
          },
        ],
      },
      {
        text: "Verification Methods",
        items: [
          { text: "Overview", link: "/docs/methods" },
          { text: "HTTPS Origin", link: "/docs/methods/https-origin" },
          { text: "DNS TXT", link: "/docs/methods/dns-txt" },
          {
            text: "Account Signature",
            collapsed: true,
            items: [
              { text: "Overview", link: "/docs/methods/account-signature" },
              {
                text: "EIP-155",
                link: "/docs/methods/account-signature/eip155",
              },
            ],
          },
        ],
      },
    ],
    "/implementers": [
      {
        text: "Learn",
        items: [
          { text: "Introduction", link: "/implementers" },
          {
            text: "Verification Algorithm",
            link: "/implementers/verification-algorithm",
          },
        ],
      },
      {
        text: "Core Components",
        items: [
          {
            text: "Discovery Records",
            link: "/implementers/discovery-records",
          },
          {
            text: "Verification Descriptor",
            link: "/implementers/verification-descriptor",
          },
          {
            text: "Authority",
            collapsed: true,
            items: [
              { text: "Overview", link: "/implementers/authority" },
              { text: "Version 1", link: "/implementers/authority/version-1" },
            ],
          },
          { text: "Common Claim", link: "/implementers/common-claim" },
          {
            text: "Claim Digest (EIP-712)",
            link: "/implementers/claim-digest",
          },
          { text: "Signatures", link: "/implementers/signatures" },
          { text: "Proof Envelope", link: "/implementers/proof-envelope" },
          { text: "Proof Key", link: "/implementers/proof-key" },
          { text: "Lifecycle", link: "/implementers/lifecycle" },
          {
            text: "Verification Results",
            link: "/implementers/verification-results",
          },
        ],
      },
      {
        text: "Verification Methods",
        items: [
          { text: "Overview", link: "/implementers/methods" },
          { text: "HTTPS Origin", link: "/implementers/methods/https-origin" },
          { text: "DNS TXT", link: "/implementers/methods/dns-txt" },
          {
            text: "Account Signature",
            collapsed: true,
            items: [
              {
                text: "Overview",
                link: "/implementers/methods/account-signature",
              },
              {
                text: "EIP-155",
                link: "/implementers/methods/account-signature/eip155",
              },
            ],
          },
        ],
      },
      {
        text: "Proof Retrieval",
        collapsed: true,
        items: [
          { text: "Overview", link: "/implementers/proof-retrieval" },
          {
            text: "Inline Proofs",
            link: "/implementers/proof-retrieval/inline",
          },
          { text: "HTTPS", link: "/implementers/proof-retrieval/https" },
          { text: "IPFS", link: "/implementers/proof-retrieval/ipfs" },
          { text: "IPNS", link: "/implementers/proof-retrieval/ipns" },
          { text: "Swarm", link: "/implementers/proof-retrieval/swarm" },
          { text: "Arweave", link: "/implementers/proof-retrieval/arweave" },
          { text: "Sia / Skynet", link: "/implementers/proof-retrieval/sia" },
          {
            text: "Tor Onion Services",
            link: "/implementers/proof-retrieval/tor",
          },
        ],
      },
    ],
    "/internal/docs": [
      {
        text: "Start",
        items: [{ text: "Introduction", link: "/internal/docs" }],
      },
      {
        text: "Core Components",
        items: [
          {
            text: "Discovery Records",
            link: "/internal/docs/components/discovery-records",
          },
          {
            text: "Verification Descriptor",
            link: "/internal/docs/components/verification-descriptor",
          },
          {
            text: "Authority",
            link: "/internal/docs/components/authority",
          },
          {
            text: "Claims and Target Proofs",
            link: "/internal/docs/components/claims-and-signatures",
          },
          { text: "Lifecycle", link: "/internal/docs/components/lifecycle" },
          {
            text: "Verification Results",
            link: "/internal/docs/components/results",
          },
        ],
      },
      {
        text: "Methods",
        items: [
          { text: "Overview", link: "/internal/docs/methods/overview" },
          { text: "HTTPS Origin", link: "/internal/docs/methods/https-origin" },
          { text: "DNS TXT", link: "/internal/docs/methods/dns-txt" },
          {
            text: "Account Signature",
            link: "/internal/docs/methods/account-signature",
          },
        ],
      },
      {
        text: "Walkthrough",
        items: [
          { text: "Protocol Walkthrough", link: "/internal/docs/walkthrough" },
        ],
      },
      {
        text: "References",
        items: [
          { text: "References", link: "/internal/docs/reference/references" },
        ],
      },
    ],
    "/internal/references": [
      {
        text: "Start",
        items: [
          { text: "Overview and Conformance", link: "/internal/references" },
        ],
      },
      {
        text: "Common",
        items: [
          {
            text: "Data Types and Encoding",
            link: "/internal/references/data-types-and-encoding",
          },
          {
            text: "Discovery and Descriptor Grammar",
            link: "/internal/references/discovery-and-descriptor",
          },
          {
            text: "ENS Snapshot and Authority",
            link: "/internal/references/ens-snapshot-and-authority",
          },
          {
            text: "Claims, Envelopes, and Signatures",
            link: "/internal/references/claims-envelopes-and-signatures",
          },
          {
            text: "Lifecycle and Results",
            link: "/internal/references/lifecycle-and-results",
          },
          {
            text: "Verification Algorithm",
            link: "/internal/references/verification-algorithm",
          },
        ],
      },
      {
        text: "Methods",
        items: [
          {
            text: "HTTPS Origin",
            link: "/internal/references/method-https-origin",
          },
          {
            text: "DNS TXT",
            link: "/internal/references/method-dns-txt",
          },
          {
            text: "EIP-155 Account Signature",
            link: "/internal/references/method-account-signature-eip155",
          },
        ],
      },
      {
        text: "Validation",
        items: [
          {
            text: "Conformance Vectors",
            link: "/internal/references/conformance-vectors",
          },
        ],
      },
    ],
  },
});
