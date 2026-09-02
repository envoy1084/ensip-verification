import "@rainbow-me/rainbowkit/styles.css";
import ReactDOM from "react-dom/client";

import { RouterProvider } from "@tanstack/react-router";

import { AppProviders } from "./providers";
import { getRouter } from "./router";

const router = getRouter();
const rootElement = document.getElementById("app");

if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}
