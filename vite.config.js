import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Each Netlify site builds this same repo with its own PERSON env var, so the
// canonical/og:url has to be resolved at build time rather than hardcoded.
// SITE_URL overrides it outright — set that if a person gets a custom domain.
function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  const person = (process.env.PERSON || "emtatu").trim().toLowerCase();
  return `https://who-am-i-youtube-${person}.netlify.app`;
}

// Injects the absolute-URL tags that can't be written statically: og:url,
// og:image, twitter:image and <link rel="canonical">. Open Graph requires
// absolute URLs — relative paths are ignored by every scraper.
function brandUrls() {
  return {
    name: "brand-urls",
    transformIndexHtml(html) {
      const base = siteUrl();
      return html.replace(
        "<!--BRAND_URLS-->",
        [
          `<link rel="canonical" href="${base}/" />`,
          `<meta property="og:url" content="${base}/" />`,
          `<meta property="og:image" content="${base}/og-image.png" />`,
          `<meta name="twitter:image" content="${base}/og-image.png" />`,
        ].join("\n    ")
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), brandUrls()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8888",
      "/.netlify": "http://localhost:8888",
    },
  },
});
