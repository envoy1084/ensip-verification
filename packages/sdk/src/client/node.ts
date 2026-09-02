import { Layer } from "effect";

import { NodeHttpServiceLayer } from "../http/node.js";
import type { RecordVerificationOptions } from "../schema/sdk.js";
import { DnsService } from "../services/DnsService.js";
import { EnsService } from "../services/EnsService.js";
import { RecordVerificationClient } from "./RecordVerification.js";

export class RecordVerification extends RecordVerificationClient {
  constructor(options: RecordVerificationOptions) {
    const dnsOptions = {
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
      ...(options.dnsOverHttpsUrl === undefined
        ? {}
        : { dnsOverHttpsUrl: options.dnsOverHttpsUrl }),
    };
    super(
      Layer.mergeAll(
        NodeHttpServiceLayer,
        EnsService.layer({ publicClient: options.publicClient }),
        DnsService.layer(dnsOptions),
      ),
    );
  }
}
