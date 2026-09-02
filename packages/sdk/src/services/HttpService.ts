import { Context, type Effect } from "effect";

import type { RecordVerificationError } from "../schema/errors.js";

export interface HttpRequest {
  readonly url: URL;
  readonly maximumBodyBytes: number;
  readonly timeoutMs: number;
}

export interface HttpResponse {
  readonly body: Uint8Array;
  readonly headers: Readonly<Record<string, string>>;
}

export class HttpService extends Context.Service<
  HttpService,
  {
    readonly get: (
      request: HttpRequest,
    ) => Effect.Effect<HttpResponse, RecordVerificationError>;
  }
>()("@thenamespace/record-verification/HttpService") {}
