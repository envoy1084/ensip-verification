import { defineLibraryConfig } from "klarity/tsdown";
import type { UserConfig } from "tsdown";

const config: UserConfig = defineLibraryConfig({
  entry: ["src/index.ts", "src/browser.ts"],
  deps: {
    neverBundle: [
      "node:dns/promises",
      "node:http",
      "node:https",
      "node:net",
      "node:tls",
    ],
  },
});

export default config;
