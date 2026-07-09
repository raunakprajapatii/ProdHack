const fallbackApiUrl = "http://localhost:3000";

export const API_ORIGIN = (
  import.meta.env.VITE_API_URL || fallbackApiUrl
).replace(/\/$/, "");

export const API_BASE_URL = `${API_ORIGIN}/api`;
