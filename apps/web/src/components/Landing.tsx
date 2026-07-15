"use client";

// Adapted from Vocs' MIT-licensed Landing component.
// Copyright (c) Wevm contributors: https://github.com/wevm/vocs/blob/main/site/src/components/Landing.tsx

import { useCallback, useState, type MouseEvent, type ReactNode } from "react";

import { Link } from "vocs";

type PackageManager = "npm" | "pnpm" | "bun";

const packageManagers = ["npm", "pnpm", "bun"] as const;

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
    const agentPrompt = `Read the Record Verification specification at ${docsUrl}. Use it to verify an ENS resolver record. Check the live record and descriptor, bind the claim to the exact resolver value, validate current ENS authority approval, validate the selected method proof, and enforce expiry.`;
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
              ENSIP-X
              <br />
              <span className="vocs:text-secondary">Record Verification</span>
            </h1>
            <p className="vocs:m-0 vocs:mb-8 vocs:text-xl vocs:leading-[1.6] vocs:text-secondary vocs:max-[700px]:text-[17px]">
              ENS records identify external resources but do not prove who
              controls them. Bind proof to the live record value so clients can
              verify the connection.
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
                {packageManagers.map((item) => (
                  <button
                    key={item}
                    type="button"
                    data-package-manager={item}
                    data-active={packageManager === item || undefined}
                    onClick={selectPackageManager}
                    className={`vocs:-mb-px vocs:inline-flex vocs:cursor-pointer vocs:items-center vocs:gap-2 vocs:border-0 vocs:border-b-2 vocs:border-solid vocs:bg-transparent vocs:px-3.5 vocs:pb-[9px] vocs:pt-[11px] vocs:text-[13px] vocs:font-medium vocs:transition-colors vocs:duration-100 vocs:[&_svg]:size-[15px] ${
                      packageManager === item
                        ? "vocs:border-white vocs:text-heading"
                        : "vocs:border-transparent vocs:text-muted vocs:hover:text-heading"
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
                className="vocs:flex vocs:min-h-[68px] vocs:w-full vocs:cursor-pointer vocs:items-center vocs:gap-[18px] vocs:border-0 vocs:bg-transparent vocs:py-[18px] vocs:pl-0 vocs:pr-3 vocs:text-left vocs:transition-colors vocs:duration-100 vocs:hover:bg-surfaceTint"
              >
                <code className="vocs:font-mono vocs:text-lg vocs:text-accent">
                  <span className="vocs:text-muted">
                    {commands[packageManager].split(" ")[0]}
                  </span>{" "}
                  {commands[packageManager].split(" ").slice(1).join(" ")}
                </code>
                <span
                  data-copied={copiedCommand || undefined}
                  className="vocs:ml-auto vocs:inline-flex vocs:size-8 vocs:items-center vocs:justify-center vocs:text-muted vocs:transition-colors vocs:duration-100 vocs:data-copied:text-success vocs:[&_svg]:size-4"
                >
                  {copiedCommand ? (
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
