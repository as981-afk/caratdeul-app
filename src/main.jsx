import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./base.css";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)

// Install the offline service worker in production builds only — a stale cache
// during `npm run dev` is more annoying than an offline demo.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support unavailable (e.g. unsupported context) */
    });
  });
}

