"use client";

// Adapted from Vocs' MIT-licensed Landing component.
// Copyright (c) Wevm contributors: https://github.com/wevm/vocs/blob/main/site/src/components/Landing.tsx

import { useCallback, useState, type MouseEvent, type ReactNode } from "react";

import { Link } from "vocs";

type PackageManager = "npm" | "pnpm" | "bun";

const packageManagers = ["npm", "pnpm", "bun"] as const;
const showPackageInstall = false;

const commands = {
  npm: "npm add ens-record-verification",
  pnpm: "pnpm add ens-record-verification",
  bun: "bun add ens-record-verification",
} satisfies Record<PackageManager, string>;

const packageIcons = {
  npm: <IconNpm aria-hidden />,
  pnpm: <IconPnpm aria-hidden />,
  bun: <IconBun aria-hidden />,
} satisfies Record<PackageManager, ReactNode>;

export function Landing() {
  const [packageManager, setPackageManager] = useState<PackageManager>("npm");
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const selectPackageManager = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      setPackageManager(
        event.currentTarget.dataset.packageManager as PackageManager,
      );
    },
    [],
  );

  const copyCommand = useCallback(async () => {
    await navigator.clipboard.writeText(commands[packageManager]);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2_000);
  }, [packageManager]);

  const copyPrompt = useCallback(async () => {
    const docsUrl = new URL("/docs", window.location.origin).href;
    const agentPrompt = `Read the Record Verification specification at ${docsUrl} and explain it.`;
    await navigator.clipboard.writeText(agentPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2_000);
  }, []);

  return (
    <div className="relative left-1/2 z-50 mt-[calc(-1*var(--vocs-spacing-banner)-var(--vocs-spacing-content-py))] mb-[calc(-1*var(--vocs-spacing-content-py))] flex h-[100svh] w-screen -translate-x-1/2 flex-col overflow-hidden bg-(--vocs-background-color-primary) text-(--vocs-text-color-heading) max-[700px]:h-auto max-[700px]:min-h-[100svh] max-[700px]:overflow-visible">
      <div className="pointer-events-none absolute inset-0 opacity-35 dark:opacity-20 [background-image:repeating-linear-gradient(45deg,transparent_0_27px,light-dark(var(--vocs-color-gray12),var(--vocs-border-color-primary))_27px_28px,transparent_28px_56px),repeating-linear-gradient(-45deg,transparent_0_27px,light-dark(var(--vocs-color-gray12),var(--vocs-border-color-primary))_27px_28px,transparent_28px_56px)]" />
      <header className="relative pb-4 pt-8 max-[700px]:pt-6">
        <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-6 px-8 max-[700px]:px-5">
          <a
            href="/"
            aria-label="Record Verification"
            className="inline-flex no-underline"
          >
            <span className="text-[18px] font-semibold text-(--vocs-text-color-heading)">
              Record Verification
            </span>
          </a>
          <a
            href="/docs"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-(--vocs-text-color-secondary) no-underline transition-colors duration-100 hover:text-(--vocs-text-color-heading) [&_svg]:size-3.5"
          >
            Docs
            <ArrowUpRightIcon aria-hidden />
          </a>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 items-center pb-10 pt-6 max-[700px]:items-start max-[700px]:pb-8 max-[700px]:pt-10">
        <div className="mx-auto w-full max-w-[900px] px-8 max-[700px]:px-5">
          <section className="w-[min(100%,700px)]">
            <h1 className="m-0 mb-[18px] text-[clamp(40px,5.6vw,68px)] font-semibold leading-[0.96] tracking-[-0.025em] text-(--vocs-text-color-heading) max-[700px]:text-[clamp(40px,12vw,54px)]">
              ENSIP-X
              <br />
              <span className="text-(--vocs-text-color-secondary)">
                Record Verification
              </span>
            </h1>
            <p className="m-0 mb-8 text-xl leading-[1.6] text-(--vocs-text-color-secondary) max-[700px]:text-[17px]">
              ENS records identify external resources but do not prove who
              controls them. Bind proof to the live record value so clients can
              verify the connection.
            </p>
            <div className="mb-10 flex flex-wrap gap-3">
              <Link
                to="/docs"
                className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[var(--vocs-radius-lg)] border border-solid border-(--vocs-color-accent) bg-(--vocs-color-accent) px-[22px] text-[15px] font-medium text-(--vocs-color-accentInvert) no-underline transition-opacity duration-100 hover:opacity-90 max-[700px]:w-full [&_svg]:size-3.5"
              >
                Read the docs
                <ArrowUpRightIcon aria-hidden />
              </Link>
              <a
                href="https://github.com/envoy1084/ensip-verification"
                className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[var(--vocs-radius-lg)] border border-solid border-(--vocs-border-color-primary) bg-(--vocs-background-color-surface) px-[22px] text-[15px] font-medium text-(--vocs-text-color-heading) no-underline transition-colors duration-100 hover:border-(--vocs-border-color-secondary) hover:bg-(--vocs-background-color-surfaceTint) max-[700px]:w-full [&_svg]:size-3.5"
              >
                <GitHubIcon aria-hidden />
                GitHub
              </a>
            </div>

            {/* Temporarily hide package installation until the package is ready. */}
            {showPackageInstall && (
              <div className="mb-4 w-[min(100%,620px)] overflow-hidden rounded-[var(--vocs-radius-lg)] border border-solid border-(--vocs-border-color-primary) bg-(--vocs-background-color-surface) max-[700px]:w-full">
                <div className="flex items-stretch gap-1 border-b border-solid border-(--vocs-border-color-primary) px-1">
                  {packageManagers.map((item) => (
                    <button
                      key={item}
                      type="button"
                      data-package-manager={item}
                      data-active={packageManager === item || undefined}
                      onClick={selectPackageManager}
                      className={`-mb-px inline-flex cursor-pointer items-center gap-2 border-0 border-b-2 border-solid bg-transparent px-3.5 pb-[9px] pt-[11px] text-[13px] font-medium transition-colors duration-100 [&_svg]:size-[15px] ${
                        packageManager === item
                          ? "border-white text-(--vocs-text-color-heading)"
                          : "border-transparent text-(--vocs-text-color-muted) hover:text-(--vocs-text-color-heading)"
                      }`}
                    >
                      {packageIcons[item]}
                      {item}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Copy install command"
                  onClick={copyCommand}
                  className="flex min-h-[68px] w-full cursor-pointer items-center gap-[18px] border-0 bg-transparent py-[18px] pl-0 pr-3 text-left transition-colors duration-100 hover:bg-(--vocs-background-color-surfaceTint)"
                >
                  <code className="font-mono text-lg text-(--vocs-color-accent)">
                    <span className="text-(--vocs-text-color-muted)">
                      {commands[packageManager].split(" ")[0]}
                    </span>{" "}
                    {commands[packageManager].split(" ").slice(1).join(" ")}
                  </code>
                  <span
                    data-copied={copiedCommand || undefined}
                    className="ml-auto inline-flex size-8 items-center justify-center text-(--vocs-text-color-muted) transition-colors duration-100 data-copied:text-(--vocs-color-success) [&_svg]:size-4"
                  >
                    {copiedCommand ? (
                      <CheckIcon aria-hidden />
                    ) : (
                      <CopyIcon aria-hidden />
                    )}
                  </span>
                </button>
              </div>
            )}

            <button
              type="button"
              className="flex min-h-[52px] w-[min(100%,620px)] cursor-pointer items-center gap-3 rounded-[var(--vocs-radius-lg)] border border-solid border-(--vocs-border-color-primary) bg-(--vocs-background-color-surface) px-5 text-left text-[15px] font-normal text-(--vocs-text-color-secondary) transition-colors duration-100 hover:bg-(--vocs-background-color-surfaceTint) hover:text-(--vocs-text-color-heading) max-[700px]:w-full"
              onClick={copyPrompt}
            >
              <span
                data-copied={copiedPrompt || undefined}
                className="inline-block size-[7px] bg-(--vocs-color-accent) shadow-[0_0_10px_oklch(from_var(--vocs-color-accent)_l_c_h_/_28%)] data-copied:bg-(--vocs-color-success)"
              />
              {copiedPrompt
                ? "Copied to clipboard"
                : "Copy specification context for agent"}
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

function IconNpm(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" {...props}>
      <path fill="#c12127" d="M2 2h28v28H2" />
      <path fill="#fff" d="M7.25 7.25h17.5v17.5h-3.5v-14H16v14H7.25" />
    </svg>
  );
}

function IconPnpm(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" {...props}>
      <path
        fill="#f9ad00"
        d="M30 10.75h-8.749V2H30Zm-9.626 0h-8.75V2h8.75Zm-9.625 0H2V2h8.749ZM30 20.375h-8.749v-8.75H30Z"
      />
      <path
        fill="#fff"
        d="M20.374 20.375h-8.75v-8.75h8.75Zm0 9.625h-8.75v-8.75h8.75ZM30 30h-8.749v-8.75H30Zm-19.251 0H2v-8.75h8.749Z"
      />
    </svg>
  );
}

function IconBun(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" {...props}>
      <path
        fill="#fbf0df"
        d="M29 17c0 5.65-5.82 10.23-13 10.23S3 22.61 3 17c0-3.5 2.24-6.6 5.66-8.44S14.21 4.81 16 4.81s3.32 1.54 7.34 3.71C26.76 10.36 29 13.46 29 17"
      />
      <path
        fill="none"
        stroke="#000"
        d="M16 27.65c7.32 0 13.46-4.65 13.46-10.65c0-3.72-2.37-7-5.89-8.85-1.39-.75-2.46-1.41-3.37-2l-1.13-.69A6.14 6.14 0 0 0 16 4.35a6.9 6.9 0 0 0-3.3 1.23c-.42.24-.86.51-1.32.8-.87.54-1.83 1.13-3 1.73C4.91 10 2.54 13.24 2.54 17c0 6 6.14 10.65 13.46 10.65Z"
      />
      <ellipse cx="21.65" cy="18.62" fill="#febbd0" rx="2.17" ry="1.28" />
      <ellipse cx="10.41" cy="18.62" fill="#febbd0" rx="2.17" ry="1.28" />
      <path
        fillRule="evenodd"
        d="M11.43 18.11a2 2 0 1 0-2-2.05a2.05 2.05 0 0 0 2 2.05m9.2 0a2 2 0 1 0-2-2.05a2 2 0 0 0 2 2.05"
      />
      <path
        fill="#fff"
        fillRule="evenodd"
        d="M10.79 16.19a.77.77 0 1 0-.76-.77a.76.76 0 0 0 .76.77m9.2 0a.77.77 0 1 0 0-1.53a.77.77 0 0 0 0 1.53"
      />
      <path
        fill="#b71422"
        stroke="#000"
        strokeWidth=".75"
        d="M18.62 19.67a3.3 3.3 0 0 1-1.09 1.75a2.48 2.48 0 0 1-1.5.69a2.53 2.53 0 0 1-1.5-.69a3.28 3.28 0 0 1-1.08-1.75a.26.26 0 0 1 .29-.3h4.58a.27.27 0 0 1 .3.3Z"
      />
    </svg>
  );
}
