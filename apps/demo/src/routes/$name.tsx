import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$name")({ component: Name });

function Name() {
  return null;
}
