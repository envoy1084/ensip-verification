import { defineConfig } from "vocs/config";

export default defineConfig({
  title: "ENS Record Verification",
  description: "Record-scoped verification for ENS resolver records.",
  mcp: {
    enabled: true,
  },
  sidebar: [
    {
      text: "Start",
      items: [
        { text: "Introduction", link: "/" },
        { text: "Quickstart", link: "/docs/quickstart" },
      ],
    },
    {
      text: "Specification",
      items: [
        { text: "Overview", link: "/docs/spec/overview" },
        { text: "ENSIP", link: "/docs/spec/ensip" },
        { text: "Discovery Records", link: "/docs/spec/discovery-records" },
        {
          text: "Verification Descriptor",
          link: "/docs/spec/verification-descriptor",
        },
        {
          text: "Claims and Signatures",
          link: "/docs/spec/claims-and-signatures",
        },
        {
          text: "Authority and Lifecycle",
          link: "/docs/spec/authority-and-lifecycle",
        },
        { text: "Results and Errors", link: "/docs/spec/results-and-errors" },
      ],
    },
    {
      text: "Method Profiles",
      items: [
        { text: "Overview", link: "/docs/methods/overview" },
        {
          text: "Authority Signature",
          link: "/docs/methods/authority-signature",
        },
        { text: "HTTPS Origin", link: "/docs/methods/https-origin" },
        { text: "DNS TXT", link: "/docs/methods/dns-txt" },
        { text: "Account Signature", link: "/docs/methods/account-signature" },
        { text: "Service Account", link: "/docs/methods/service-account" },
        {
          text: "Issuer Attestation",
          link: "/docs/methods/issuer-attestation",
        },
      ],
    },
    {
      text: "Record Guides",
      items: [
        { text: "URL Records", link: "/docs/records/url" },
        { text: "Social Accounts", link: "/docs/records/social-accounts" },
        { text: "Address Records", link: "/docs/records/addresses" },
        { text: "Contenthash", link: "/docs/records/contenthash" },
        { text: "Email Records", link: "/docs/records/email" },
        { text: "Agent Endpoints", link: "/docs/records/agent-endpoints" },
      ],
    },
    {
      text: "Implementation Guides",
      items: [
        {
          text: "Publish a Verification",
          link: "/docs/guides/publish-a-verification",
        },
        { text: "Build a Verifier", link: "/docs/guides/build-a-verifier" },
        {
          text: "Wallet and UI Guidelines",
          link: "/docs/guides/wallet-and-ui-guidelines",
        },
      ],
    },
    {
      text: "Reference",
      items: [
        { text: "Errors", link: "/docs/reference/errors" },
        { text: "Test Vectors", link: "/docs/reference/test-vectors" },
        { text: "Schemas", link: "/docs/reference/schemas" },
        { text: "Glossary", link: "/docs/reference/glossary" },
        { text: "References", link: "/docs/reference/references" },
      ],
    },
  ],
});
