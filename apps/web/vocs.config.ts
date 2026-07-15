import { defineConfig } from "vocs/config";

export default defineConfig({
  title: "Record Verification",
  description:
    "ENS records identify external resources but do not prove who controls them. Bind proof to the live record value so clients can verify the connection.",
  mcp: {
    enabled: true,
  },
  sidebar: [
    {
      text: "Start",
      items: [{ text: "Introduction", link: "/docs" }],
    },
    {
      text: "Components",
      items: [
        { text: "Overview", link: "/docs/components" },
        {
          text: "Discovery Records",
          link: "/docs/components/discovery-records",
        },
        {
          text: "Verification Descriptor",
          link: "/docs/components/verification-descriptor",
        },
        {
          text: "Claims and Target Proofs",
          link: "/docs/components/claims-and-signatures",
        },
        {
          text: "Authority and Lifecycle",
          link: "/docs/components/authority-and-lifecycle",
        },
        { text: "Verification Results", link: "/docs/components/results" },
      ],
    },
    {
      text: "Methods",
      items: [
        { text: "Overview", link: "/docs/methods/overview" },
        { text: "HTTPS Origin", link: "/docs/methods/https-origin" },
        { text: "DNS TXT", link: "/docs/methods/dns-txt" },
        { text: "Account Signature", link: "/docs/methods/account-signature" },
      ],
    },
    {
      text: "References",
      items: [{ text: "References", link: "/docs/reference/references" }],
    },
  ],
});
