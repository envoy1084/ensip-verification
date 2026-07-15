"use client";

// Adapted from Vocs' MIT-licensed Landing component.
// Copyright (c) Wevm contributors: https://github.com/wevm/vocs/blob/main/site/src/components/Landing.tsx

import { useCallback, useState, type MouseEvent, type ReactNode } from "react";

import { Link } from "vocs";

type Method = "https" | "dns" | "account";

const methods = ["https", "dns", "account"] as const;

const descriptors = {
  https: "ensrv1 a=1 m=https-origin.v1 h=0x…",
  dns: "ensrv1 a=1 m=dns-txt.v1 h=0x…",
  account: "ensrv1 a=1 m=account-signature.v1 h=0x…",
} satisfies Record<Method, string>;

const methodIcons = {
  https: <GlobeIcon aria-hidden />,
  dns: <NetworkIcon aria-hidden />,
  account: <WalletIcon aria-hidden />,
} satisfies Record<Method, ReactNode>;

const agentPrompt = `Read the Record Verification documentation at /docs. Use it to evaluate an ENS resolver record by checking the live record and descriptor, the exact value-bound claim, current ENS authority approval, method proof, and expiry.`;

export function Landing() {
  const [method, setMethod] = useState<Method>("https");
  const [copiedDescriptor, setCopiedDescriptor] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const selectMethod = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setMethod(event.currentTarget.dataset.method as Method);
  }, []);

  const copyDescriptor = useCallback(async () => {
    await navigator.clipboard.writeText(descriptors[method]);
    setCopiedDescriptor(true);
    setTimeout(() => setCopiedDescriptor(false), 2_000);
  }, [method]);

  const copyPrompt = useCallback(async () => {
    await navigator.clipboard.writeText(agentPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2_000);
  }, []);

  return (
    <div className="vocs:relative vocs:left-1/2 vocs:z-50 vocs:mt-[calc(-1*var(--vocs-spacing-banner)-var(--vocs-spacing-content-py))] vocs:mb-[calc(-1*var(--vocs-spacing-content-py))] vocs:flex vocs:h-[100svh] vocs:w-screen vocs:-translate-x-1/2 vocs:flex-col vocs:overflow-hidden vocs:bg-primary vocs:text-heading vocs:max-[700px]:h-auto vocs:max-[700px]:min-h-[100svh] vocs:max-[700px]:overflow-visible">
      <div className="vocs:pointer-events-none vocs:absolute vocs:inset-0 vocs:opacity-35 vocs:dark:opacity-20 vocs:[background-image:repeating-linear-gradient(45deg,transparent_0_27px,light-dark(var(--vocs-color-gray12),var(--vocs-border-color-primary))_27px_28px,transparent_28px_56px),repeating-linear-gradient(-45deg,transparent_0_27px,light-dark(var(--vocs-color-gray12),var(--vocs-border-color-primary))_27px_28px,transparent_28px_56px)]" />
      <header className="vocs:relative vocs:pb-4 vocs:pt-8 vocs:max-[700px]:pt-6">
        <div className="vocs:mx-auto vocs:flex vocs:w-full vocs:max-w-[900px] vocs:items-center vocs:justify-between vocs:gap-6 vocs:px-8 vocs:max-[700px]:px-5">
          <a
            href="/"
            aria-label="Record Verification"
            className="vocs:inline-flex vocs:no-underline"
          >
            <span className="vocs:text-[18px] vocs:font-semibold vocs:text-heading">
              Record Verification
            </span>
          </a>
          <a
            href="/docs"
            className="vocs:inline-flex vocs:items-center vocs:gap-1.5 vocs:text-[13px] vocs:font-medium vocs:text-secondary vocs:no-underline vocs:transition-colors vocs:duration-100 vocs:hover:text-heading vocs:[&_svg]:size-3.5"
          >
            Docs
            <ArrowUpRightIcon aria-hidden />
          </a>
        </div>
      </header>

      <main className="vocs:relative vocs:flex vocs:min-h-0 vocs:flex-1 vocs:items-center vocs:pb-10 vocs:pt-6 vocs:max-[700px]:items-start vocs:max-[700px]:pb-8 vocs:max-[700px]:pt-10">
        <div className="vocs:mx-auto vocs:w-full vocs:max-w-[900px] vocs:px-8 vocs:max-[700px]:px-5">
          <section className="vocs:w-[min(100%,700px)]">
            <h1 className="vocs:m-0 vocs:mb-[18px] vocs:text-[clamp(40px,5.6vw,68px)] vocs:font-semibold vocs:leading-[0.96] vocs:tracking-[-0.025em] vocs:text-heading vocs:max-[700px]:text-[clamp(40px,12vw,54px)]">
              Verify ENS records.{" "}
              <span className="vocs:text-secondary">Trust the target.</span>
            </h1>
            <p className="vocs:m-0 vocs:mb-8 vocs:text-xl vocs:leading-[1.6] vocs:text-secondary vocs:max-[700px]:text-[17px]">
              Bind external resources to live resolver values with scoped,
              authority-approved proofs that any client can verify.
            </p>
            <div className="vocs:mb-10 vocs:flex vocs:flex-wrap vocs:gap-3">
              <Link
                to="/docs"
                className="vocs:inline-flex vocs:min-h-12 vocs:items-center vocs:justify-center vocs:gap-2.5 vocs:rounded-[var(--vocs-radius-lg)] vocs:border vocs:border-solid vocs:border-accent vocs:bg-accent vocs:px-[22px] vocs:text-[15px] vocs:font-medium vocs:text-accentInvert vocs:no-underline vocs:transition-opacity vocs:duration-100 vocs:hover:opacity-90 vocs:max-[700px]:w-full vocs:[&_svg]:size-3.5"
              >
                Read the docs
                <ArrowUpRightIcon aria-hidden />
              </Link>
              <a
                href="https://github.com/envoy1084/ensip-verification"
                className="vocs:inline-flex vocs:min-h-12 vocs:items-center vocs:justify-center vocs:gap-2.5 vocs:rounded-[var(--vocs-radius-lg)] vocs:border vocs:border-solid vocs:border-primary vocs:bg-surface vocs:px-[22px] vocs:text-[15px] vocs:font-medium vocs:text-heading vocs:no-underline vocs:transition-colors vocs:duration-100 vocs:hover:border-secondary vocs:hover:bg-surfaceTint vocs:max-[700px]:w-full vocs:[&_svg]:size-3.5"
              >
                <GitHubIcon aria-hidden />
                GitHub
              </a>
            </div>

            <div className="vocs:mb-4 vocs:w-[min(100%,620px)] vocs:overflow-hidden vocs:rounded-[var(--vocs-radius-lg)] vocs:border vocs:border-solid vocs:border-primary vocs:bg-surface vocs:max-[700px]:w-full">
              <div className="vocs:flex vocs:items-stretch vocs:gap-1 vocs:border-b vocs:border-solid vocs:border-primary vocs:px-1">
                {methods.map((item) => (
                  <button
                    key={item}
                    type="button"
                    data-method={item}
                    data-active={method === item || undefined}
                    onClick={selectMethod}
                    className={`vocs:-mb-px vocs:inline-flex vocs:cursor-pointer vocs:items-center vocs:gap-2 vocs:border-0 vocs:border-b-2 vocs:border-solid vocs:bg-transparent vocs:px-3.5 vocs:pb-[9px] vocs:pt-[11px] vocs:text-[13px] vocs:font-medium vocs:transition-colors vocs:duration-100 vocs:[&_svg]:size-[15px] ${
                      method === item
                        ? "vocs:border-white vocs:text-heading"
                        : "vocs:border-transparent vocs:text-muted vocs:hover:text-heading"
                    }`}
                  >
                    {methodIcons[item]}
                    {item}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-label="Copy verification descriptor"
                onClick={copyDescriptor}
                className="vocs:flex vocs:min-h-[68px] vocs:w-full vocs:cursor-pointer vocs:items-center vocs:gap-[18px] vocs:border-0 vocs:bg-transparent vocs:py-[18px] vocs:pl-0 vocs:pr-3 vocs:text-left vocs:transition-colors vocs:duration-100 vocs:hover:bg-surfaceTint"
              >
                <code className="vocs:font-mono vocs:text-lg vocs:text-accent">
                  <span className="vocs:text-muted">method</span>{" "}
                  {descriptors[method]}
                </code>
                <span
                  data-copied={copiedDescriptor || undefined}
                  className="vocs:ml-auto vocs:inline-flex vocs:size-8 vocs:items-center vocs:justify-center vocs:text-muted vocs:transition-colors vocs:duration-100 vocs:data-copied:text-success vocs:[&_svg]:size-4"
                >
                  {copiedDescriptor ? (
                    <CheckIcon aria-hidden />
                  ) : (
                    <CopyIcon aria-hidden />
                  )}
                </span>
              </button>
            </div>

            <button
              type="button"
              className="vocs:flex vocs:min-h-[52px] vocs:w-[min(100%,620px)] vocs:cursor-pointer vocs:items-center vocs:gap-3 vocs:rounded-[var(--vocs-radius-lg)] vocs:border vocs:border-solid vocs:border-primary vocs:bg-surface vocs:px-5 vocs:text-left vocs:text-[15px] vocs:font-normal vocs:text-secondary vocs:transition-colors vocs:duration-100 vocs:hover:bg-surfaceTint vocs:hover:text-heading vocs:max-[700px]:w-full"
              onClick={copyPrompt}
            >
              <span
                data-copied={copiedPrompt || undefined}
                className="vocs:inline-block vocs:size-[7px] vocs:bg-accent vocs:shadow-[0_0_10px_oklch(from_var(--vocs-color-accent)_l_c_h_/_28%)] vocs:data-copied:bg-success"
              />
              {copiedPrompt
                ? "Copied to clipboard"
                : "Copy verification context for agent"}
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}

type IconProps = { "aria-hidden"?: boolean };

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

function ArrowUpRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 17 17 7M7 7h10v10" />
    </Icon>
  );
}

function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 12 4 4L19 6" />
    </Icon>
  );
}

function CopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Icon>
  );
}

function GitHubIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 .7a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.3c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.4-1.3-5.4-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.4 5.9.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A12 12 0 0 0 12 .7Z" />
    </svg>
  );
}

function GlobeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
    </Icon>
  );
}

function NetworkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect width="6" height="6" x="9" y="2" rx="1" />
      <rect width="6" height="6" x="3" y="16" rx="1" />
      <rect width="6" height="6" x="15" y="16" rx="1" />
      <path d="M12 8v4M6 16v-4h12v4" />
    </Icon>
  );
}

function WalletIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v12H5a3 3 0 0 1-3-3V6" />
      <path d="M16 13h4" />
    </Icon>
  );
}
