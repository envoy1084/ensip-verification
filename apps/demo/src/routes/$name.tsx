import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { useEnsforge, useReadBatchSettled } from "@ensforge/react";
import { Avatar } from "@thenamespace/uikit/avatar";
import { Spinner } from "@thenamespace/uikit/spinner";

import { CalendarDate } from "../components/time-display";
import { UrlRecordVerification } from "../components/url-record-verification";
import { getEnsNameDetails } from "../data/ens-subgraph";

export const Route = createFileRoute("/$name")({ component: Name });

function Name() {
  const { name } = Route.useParams();
  const sdk = useEnsforge();
  const requests = useMemo(
    () => ({
      avatar: sdk.records.getAvatar.request({ name }),
      expiry: sdk.name.getExpiry.request({ name }),
      owner: sdk.name.getOwner.request({ name }),
      url: sdk.records.getText.request({ key: "url", name }),
    }),
    [name, sdk],
  );
  const records = useReadBatchSettled({ requests });
  const details = useQuery({
    queryFn: ({ signal }) => getEnsNameDetails(name, signal),
    queryKey: ["ens-name-details", name],
    staleTime: 60_000,
  });
  const isLoading = records.isInitial;
  const owner =
    records.data?.owner.status === "success" ? records.data.owner.value : null;
  const expiry =
    records.data?.expiry.status === "success"
      ? records.data.expiry.value
      : null;
  const avatar =
    records.data?.avatar.status === "success"
      ? records.data.avatar.value
      : null;
  const url =
    records.data?.url.status === "success"
      ? records.data.url.value.value
      : null;
  const avatarSource = avatar?.status === "resolved" ? avatar.uri : null;
  const profileError =
    records.isFailure ||
    records.data?.owner.status === "failure" ||
    records.data?.expiry.status === "failure";
  const urlError = records.isFailure || records.data?.url.status === "failure";

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#fafafa] pb-20">
      <div className="relative h-[clamp(13rem,32vw,24rem)] overflow-hidden">
        <img
          alt=""
          className="size-full object-cover object-center"
          src="/header.svg"
        />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-b from-transparent to-[#fafafa]" />
      </div>

      <section className="relative mx-auto -mt-12 w-[90%] max-w-5xl">
        <h1 className="bg-accent text-accent-foreground inline-block rounded-sm px-4 py-2 text-2xl font-semibold tracking-tight shadow-sm sm:text-3xl">
          {name}
        </h1>

        {isLoading ? (
          <div className="text-muted flex min-h-56 items-center justify-center gap-3">
            <Spinner size="md" />
            <span>Loading name details</span>
          </div>
        ) : null}

        {profileError ? (
          <div className="border-danger/20 bg-surface mt-6 rounded-lg border p-6">
            <p className="font-semibold">Name details are unavailable.</p>
            <p className="text-muted mt-1 text-sm">
              The live ENS state could not be resolved. Try again shortly.
            </p>
          </div>
        ) : null}

        {!isLoading && !profileError ? (
          <>
            <dl className="text-muted mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <NameFact
                label="Owner"
                value={owner?.owner ? shortAddress(owner.owner) : "Unowned"}
              />
              <div className="flex items-baseline gap-2">
                <dt>Registered</dt>
                <dd className="text-foreground font-semibold">
                  <CalendarDate
                    fallback={details.isError ? "Unavailable" : "Not indexed"}
                    timestampSeconds={details.data?.registeredAt ?? null}
                  />
                </dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt>Expires</dt>
                <dd className="text-foreground font-semibold">
                  <CalendarDate
                    timestampSeconds={expiry ? Number(expiry.expiry) : null}
                  />
                </dd>
              </div>
            </dl>

            <article className="border-border bg-surface mt-9 flex flex-col items-center gap-6 rounded-xl border p-6 shadow-[0_12px_40px_rgb(1_26_37/0.07)] sm:flex-row sm:p-8">
              <Avatar
                className="size-32 shrink-0 rounded-lg sm:size-40"
                size="lg"
              >
                {avatarSource ? (
                  <Avatar.Image alt="" src={avatarSource} />
                ) : null}
                <Avatar.Fallback className="bg-[#e8f6fb] text-2xl font-semibold text-[#0080bc]">
                  ENS
                </Avatar.Fallback>
              </Avatar>

              <div className="min-w-0 text-center sm:text-left">
                <p className="text-muted text-xs font-bold tracking-[0.16em] uppercase">
                  ENS profile
                </p>
                <h2 className="mt-2 truncate text-3xl font-semibold tracking-tight sm:text-4xl">
                  {name}
                </h2>
              </div>
            </article>

            <UrlRecordVerification
              key={name}
              isError={urlError}
              isLoading={isLoading}
              name={name}
              value={url}
            />
          </>
        ) : null}
      </section>
    </main>
  );
}

const shortAddress = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`;

interface NameFactProps {
  label: string;
  value: string;
}

function NameFact({ label, value }: NameFactProps) {
  return (
    <div className="flex items-baseline gap-2">
      <dt>{label}</dt>
      <dd className="text-foreground font-semibold">{value}</dd>
    </div>
  );
}
