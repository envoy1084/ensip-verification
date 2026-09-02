import { Button } from "@thenamespace/uikit/button";
import {
  Globe02Icon,
  HugeiconsIcon,
  SecurityValidationIcon,
} from "@thenamespace/uikit/icons";
import { Spinner } from "@thenamespace/uikit/spinner";

interface UrlRecordVerificationProps {
  isError: boolean;
  isLoading: boolean;
  value: string | null;
}

export function UrlRecordVerification({
  isError,
  isLoading,
  value,
}: UrlRecordVerificationProps) {
  const hasValue = value !== null && value.length > 0;

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

          <Button
            className="h-11 shrink-0 px-5"
            isDisabled={isLoading || isError || !hasValue}
          >
            <HugeiconsIcon
              icon={SecurityValidationIcon}
              size={18}
              strokeWidth={1.9}
            />
            Verify
          </Button>
        </div>
      </div>
    </section>
  );
}
