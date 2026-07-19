import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// On Render.com (or any external host) the API lives on a different domain.
// Set VITE_API_BASE_URL at build time to point to the API server.
// On Replit the variable is empty, so requests stay on the same origin via the proxy.
setBaseUrl((import.meta.env.VITE_API_BASE_URL) || null);

createRoot(document.getElementById("root")!).render(<App />);
