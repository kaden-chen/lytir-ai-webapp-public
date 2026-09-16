import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // MapLibre parses tiles in a web worker that the dependency optimizer drops,
  // which leaves the map blank in development while the style still loads.
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  // MapLibre starts its worker with { type: "module" }, so emit an ES module
  // rather than Vite's default IIFE.
  worker: {
    format: "es",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    env: {
      VITE_APP_VERSION: "0.0.0-test",
      VITE_FIREBASE_API_KEY: "test-api-key",
      VITE_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "test-project",
      VITE_FIREBASE_APP_ID: "1:0:web:test",
      VITE_MAP_STYLE_LIGHT: "https://example.test/styles/light",
      VITE_MAP_STYLE_DARK: "https://example.test/styles/dark",
      VITE_API_DIAG_URL: "https://example.test/api/diag",
      VITE_API_EARTHQUAKES_URL: "https://example.test/api/proxy/earthquakes",
      VITE_API_AI_QA_URL: "https://example.test/api/proxy/ai-qa",
      VITE_API_ADMIN_SYNC_DATA_URL:
        "https://example.test/api/proxy/admin/sync-data",
    },
  },
});
