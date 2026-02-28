import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initTracking, setupAutoTracking } from "./lib/tracking";

// Initialize attribution tracking
initTracking();
setupAutoTracking();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
