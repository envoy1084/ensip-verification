import type { ComponentProps } from "react";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Avatar } from "@thenamespace/uikit/avatar";
import { Button } from "@thenamespace/uikit/button";

type ConnectRenderProps = Parameters<
  ComponentProps<typeof ConnectButton.Custom>["children"]
>[0];

const renderWalletButton = ({
  account,
  authenticationStatus,
  chain,
  mounted,
  openAccountModal,
  openChainModal,
  openConnectModal,
}: ConnectRenderProps) => {
  const ready = mounted && authenticationStatus !== "loading";
  const connected =
    ready &&
    account !== undefined &&
    chain !== undefined &&
    (authenticationStatus === undefined ||
      authenticationStatus === "authenticated");

  if (!connected) {
    return (
      <div
        aria-hidden={!ready}
        className={ready ? undefined : "pointer-events-none opacity-0"}
      >
        <Button onPress={openConnectModal}>Connect Wallet</Button>
      </div>
    );
  }

  if (chain.unsupported) {
    return (
      <Button variant="danger" onPress={openChainModal}>
        Wrong network
      </Button>
    );
  }

  const fallback = (account.ensName ?? account.address.slice(2, 4))
    .slice(0, 2)
    .toUpperCase();

  return (
    <Button variant="tertiary" onPress={openAccountModal}>
      <Avatar className="size-6" size="sm">
        <Avatar.Image alt="" src={account.ensAvatar} />
        <Avatar.Fallback>{fallback}</Avatar.Fallback>
      </Avatar>
      {account.displayName}
    </Button>
  );
};

export function WalletButton() {
  return <ConnectButton.Custom>{renderWalletButton}</ConnectButton.Custom>;
}
