import { Layer } from "effect";

import { BrowserHttpServiceLayer } from "../http/browser.js";
import type { RecordVerificationOptions } from "../schema/sdk.js";
import { DnsService } from "../services/DnsService.js";
import { EnsService } from "../services/EnsService.js";
import { RecordVerificationClient } from "./RecordVerification.js";

export class RecordVerification extends RecordVerificationClient {
  constructor(options: RecordVerificationOptions) {
    const fetchOptions =
      options.fetch === undefined ? {} : { fetch: options.fetch };
    const dnsOptions = {
      ...fetchOptions,
      ...(options.dnsOverHttpsUrl === undefined
        ? {}
        : { dnsOverHttpsUrl: options.dnsOverHttpsUrl }),
    };
    super(
      Layer.mergeAll(
        BrowserHttpServiceLayer(fetchOptions),
        EnsService.layerBrowser({ publicClient: options.publicClient }),
        DnsService.layerBrowser(dnsOptions),
      ),
    );
  }
}
