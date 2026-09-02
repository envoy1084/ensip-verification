import { Link } from "@tanstack/react-router";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Navbar } from "@thenamespace/uikit/navbar";

export function AppNavbar() {
  return (
    <Navbar className="border-border border-b" position="static">
      <Navbar.Header className="px-4 sm:px-6">
        <Navbar.Brand>
          <Link className="flex items-center gap-2.5 font-semibold" to="/">
            <img alt="" className="size-8" src="/ens-logo.svg" />
            <span>Record Verification</span>
          </Link>
        </Navbar.Brand>
        <Navbar.Spacer />
        <ConnectButton />
      </Navbar.Header>
    </Navbar>
  );
}
