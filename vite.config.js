import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During `vite dev`, proxy /api and /.netlify/functions to `netlify dev` (port 8888)
// so the frontend and functions run together. In production Netlify handles both.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8888",
      "/.netlify": "http://localhost:8888",
    },
  },
});
