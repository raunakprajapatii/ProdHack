const fallbackApiUrl = "http://localhost:3000";
const configuredApiUrl = import.meta.env.VITE_API_URL;

if (import.meta.env.PROD && !configuredApiUrl) {
  throw new Error("Missing VITE_API_URL. Set it to your Render backend URL in Vercel.");
}

export const API_ORIGIN = (configuredApiUrl || fallbackApiUrl).replace(/\/$/, "");

export const API_BASE_URL = `${API_ORIGIN}/api`;
