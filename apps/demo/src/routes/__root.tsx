import type { ReactNode } from "react";

import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";

import { AppNavbar } from "../components/app-navbar";
import { AppProviders } from "../providers";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0",
      },
      {
        name: "description",
        content: "A demo for verifying the provenance of ENS records.",
      },
      { name: "theme-color", content: "#ffffff" },
      { title: "ENS Record Verification" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
});

function RootComponent() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <AppNavbar />
      <Outlet />
    </div>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="light" data-theme="ens">
      <head>
        <HeadContent />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
        <Scripts />
      </body>
    </html>
  );
}
