import { useCallback } from "react";

import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@thenamespace/uikit/button";
import { Chip } from "@thenamespace/uikit/chip";
import { Globe02Icon, HugeiconsIcon } from "@thenamespace/uikit/icons";
import { Spinner } from "@thenamespace/uikit/spinner";

import { verifyUrlRecord } from "../verification/verify-url-record.functions";

interface UrlRecordVerificationProps {
  isError: boolean;
  isLoading: boolean;
  name: string;
  value: string | null;
}

export function UrlRecordVerification({
  isError,
  isLoading,
  name,
  value,
}: UrlRecordVerificationProps) {
  const hasValue = value !== null && value.length > 0;
  const verifyOnServer = useServerFn(verifyUrlRecord);
  const verification = useMutation({
    mutationFn: () => verifyOnServer({ data: { name } }),
  });
  const { mutate } = verification;
  const handleVerify = useCallback(() => mutate(), [mutate]);
  const isVerified =
    verification.data?.success === true &&
    verification.data.data.verification.verified &&
    verification.data.data.value === value;
  const verificationError = verification.isError
    ? verification.error.message
    : verification.data?.success === false
      ? verification.data.error.message
      : verification.data?.success === true && !isVerified
        ? "The current URL value could not be verified."
        : null;

  return (
    <section className="mt-12" aria-labelledby="url-record-heading">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-accent text-xs font-bold tracking-[0.16em] uppercase">
            Record verification
          </p>
          <h2
            id="url-record-heading"
            className="mt-1 text-2xl font-semibold tracking-tight"
          >
            URL record
          </h2>
        </div>
        <span className="border-border bg-surface text-muted rounded-full border px-3 py-1 font-mono text-xs">
          text:url
        </span>
      </div>

      <div className="border-border bg-surface overflow-hidden rounded-xl border shadow-[0_12px_40px_rgb(1_26_37/0.07)]">
        <div className="flex min-h-32 flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <span className="bg-[#e8f6fb] text-accent flex size-11 shrink-0 items-center justify-center rounded-lg">
              <HugeiconsIcon icon={Globe02Icon} size={22} strokeWidth={1.8} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-muted text-xs font-semibold tracking-wide uppercase">
                Resolved value
              </p>

              {isLoading ? (
                <div className="text-muted mt-2 flex items-center gap-2 text-sm">
                  <Spinner size="sm" />
                  <span>Reading ENS record</span>
                </div>
              ) : null}

              {!isLoading && isError ? (
                <p className="text-danger mt-2 text-sm font-medium">
                  The URL record could not be read.
                </p>
              ) : null}

              {!isLoading && !isError && !hasValue ? (
                <p className="text-muted mt-2 text-sm">No URL record is set.</p>
              ) : null}

              {!isLoading && !isError && hasValue ? (
                <p className="mt-2 break-all font-mono text-sm font-medium sm:text-base">
                  {value}
                </p>
              ) : null}
            </div>
          </div>

          {isVerified ? (
            <Chip color="success" size="lg" variant="soft">
              Verified
            </Chip>
          ) : (
            <Button
              className="h-11 min-w-24 shrink-0 px-5"
              isDisabled={
                isLoading || isError || !hasValue || verification.isPending
              }
              onPress={handleVerify}
            >
              {verification.isPending ? "Verifying…" : "Verify"}
            </Button>
          )}
        </div>

        {verificationError ? (
          <p
            className="border-border bg-danger/5 text-danger border-t px-5 py-3 text-sm sm:px-6"
            role="alert"
          >
            {verificationError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
