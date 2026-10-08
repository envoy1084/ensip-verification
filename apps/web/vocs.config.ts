import { defineConfig } from "vocs/config";

import { abnfGrammar } from "./grammars/abnf";

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
    langs: [abnfGrammar],
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
      text: "Internal Protocol",
      link: "/internal/docs",
      match: "/internal/docs",
    },
    {
      text: "Internal Reference",
      link: "/internal/references",
      match: "/internal/references",
    },
  ],
  sidebar: {
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
