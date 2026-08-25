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
    { text: "Protocol", link: "/docs", match: "/docs" },
    {
      text: "Reference",
      link: "/references",
      match: "/references",
    },
  ],
  sidebar: {
    "/docs": [
      {
        text: "Start",
        items: [{ text: "Introduction", link: "/docs" }],
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
            link: "/docs/components/authority",
          },
          {
            text: "Claims and Target Proofs",
            link: "/docs/components/claims-and-signatures",
          },
          { text: "Lifecycle", link: "/docs/components/lifecycle" },
          { text: "Verification Results", link: "/docs/components/results" },
        ],
      },
      {
        text: "Methods",
        items: [
          { text: "Overview", link: "/docs/methods/overview" },
          { text: "HTTPS Origin", link: "/docs/methods/https-origin" },
          { text: "DNS TXT", link: "/docs/methods/dns-txt" },
          {
            text: "Account Signature",
            link: "/docs/methods/account-signature",
          },
        ],
      },
      {
        text: "Walkthrough",
        items: [{ text: "Protocol Walkthrough", link: "/docs/walkthrough" }],
      },
      {
        text: "References",
        items: [{ text: "References", link: "/docs/reference/references" }],
      },
    ],
    "/references": [
      {
        text: "Start",
        items: [{ text: "Overview and Conformance", link: "/references" }],
      },
    ],
  },
});
