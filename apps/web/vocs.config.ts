import { defineConfig } from "vocs/config";

export default defineConfig({
  title: "Record Verification",
  description: "Record-scoped verification for ENS resolver records.",
  mcp: {
    enabled: true,
  },
  sidebar: [
    {
      text: "Start",
      items: [{ text: "Introduction", link: "/" }],
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
          text: "Claims and Target Proofs",
          link: "/docs/spec/claims-and-signatures",
        },
        {
          text: "Authority and Lifecycle",
          link: "/docs/spec/authority-and-lifecycle",
        },
        { text: "Verification Results", link: "/docs/spec/results" },
      ],
    },
    {
      text: "Method Profiles",
      items: [
        { text: "Overview", link: "/docs/methods/overview" },
        { text: "HTTPS Origin", link: "/docs/methods/https-origin" },
        { text: "DNS TXT", link: "/docs/methods/dns-txt" },
        { text: "Account Signature", link: "/docs/methods/account-signature" },
      ],
    },
    {
      text: "Record Guides",
      items: [
        { text: "URL Records", link: "/docs/records/url" },
        { text: "Address Records", link: "/docs/records/addresses" },
      ],
    },
    {
      text: "Reference",
      items: [{ text: "References", link: "/docs/reference/references" }],
    },
  ],
});
