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
  },
});
