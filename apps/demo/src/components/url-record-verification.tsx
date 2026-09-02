import { AlertDialog } from "@thenamespace/uikit/alert-dialog";
import { Button } from "@thenamespace/uikit/button";
import { Chip } from "@thenamespace/uikit/chip";
import { Globe02Icon, HugeiconsIcon } from "@thenamespace/uikit/icons";
import { Spinner } from "@thenamespace/uikit/spinner";

import { useUrlDnsVerification } from "../verification/use-url-dns-verification";

interface UrlRecordVerificationProps {
  isError: boolean;
  isLoading: boolean;
  name: string;
  value: string | null;
  verificationDescriptor: string | null;
}

export function UrlRecordVerification({
  isError,
  isLoading,
  name,
  value,
  verificationDescriptor,
}: UrlRecordVerificationProps) {
  const hasValue = value !== null && value.length > 0;
  const verification = useUrlDnsVerification({
    name,
    value,
    verificationDescriptor,
  });

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

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {verification.isVerified ? (
              <Chip color="success" size="lg" variant="soft">
                Verified
              </Chip>
            ) : (
              <Button
                className="h-11 min-w-24 px-5"
                isDisabled={
                  isLoading || isError || !hasValue || verification.isPending
                }
                onPress={verification.verify}
              >
                {verification.actionLabel}
              </Button>
            )}

            {verification.descriptorConfigured ? (
              <RemoveVerificationDialog
                isDisabled={verification.isPending}
                isRemoving={verification.isRemoving}
                name={name}
                onRemove={verification.remove}
              />
            ) : null}
          </div>
        </div>

        {verification.dnsRecord ? (
          <div className="border-border bg-[#f5fbfe] border-t px-5 py-5 sm:px-6">
            <p className="font-semibold">Publish this DNS TXT record</p>
            <p className="text-muted mt-1 text-sm">
              Add it at the DNS provider for the URL hostname. The value below
              uses quoted DNS character-string syntax, including the escaping
              required by Cloudflare. Then check again after DNSSEC has
              propagated.
            </p>

            <DnsRecordField
              label="Record name"
              value={verification.dnsRecord.name}
            />
            <DnsRecordField
              label="TXT value"
              value={verification.dnsRecord.zoneFileValue}
            />
          </div>
        ) : null}

        {verification.error ? (
          <p
            className="border-border bg-danger/5 text-danger border-t px-5 py-3 text-sm sm:px-6"
            role="alert"
          >
            {verification.error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function RemoveVerificationDialog({
  isDisabled,
  isRemoving,
  name,
  onRemove,
}: {
  isDisabled: boolean;
  isRemoving: boolean;
  name: string;
  onRemove: () => Promise<void>;
}) {
  return (
    <AlertDialog>
      <Button className="h-11" isDisabled={isDisabled} variant="danger-soft">
        {isRemoving ? "Removing…" : "Remove verification"}
      </Button>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[420px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Remove verification?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                This clears the URL verification discovery record from {name}.
                It does not delete the TXT proof from your DNS provider.
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                Cancel
              </Button>
              <Button slot="close" variant="danger" onPress={onRemove}>
                Remove record
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

function DnsRecordField({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4">
      <p className="text-muted text-xs font-semibold tracking-wide uppercase">
        {label}
      </p>
      <code className="border-border bg-surface mt-1 block max-h-40 overflow-auto rounded-md border px-3 py-2 text-xs break-all whitespace-pre-wrap">
        {value}
      </code>
    </div>
  );
}
