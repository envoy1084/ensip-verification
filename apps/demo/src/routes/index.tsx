import { createFileRoute } from "@tanstack/react-router";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <ConnectButton />
    </main>
  );
}
