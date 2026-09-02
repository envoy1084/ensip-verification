import { Link } from "@tanstack/react-router";

import { Navbar } from "@thenamespace/uikit/navbar";

import { WalletButton } from "./wallet-button";

export function AppNavbar() {
  return (
    <Navbar
      className="border-border bg-surface border-b shadow-[0_1px_4px_rgb(0_0_0/0.06)]"
      maxWidth="full"
      position="static"
    >
      <Navbar.Header className="mx-auto w-[90%] px-0">
        <Navbar.Brand>
          <Link
            className="flex items-center gap-2.5 text-lg font-semibold"
            to="/"
          >
            <img alt="" className="h-6 w-auto" src="/ens-logo.svg" />
            <span>Record Verification</span>
          </Link>
        </Navbar.Brand>
        <Navbar.Spacer />
        <WalletButton />
      </Navbar.Header>
    </Navbar>
  );
}
