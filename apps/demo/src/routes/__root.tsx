import { Outlet, createRootRoute } from "@tanstack/react-router";

import { AppNavbar } from "../components/app-navbar";

import "../styles.css";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <AppNavbar />
      <Outlet />
    </div>
  );
}
