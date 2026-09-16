import { describe, expect, it } from "vitest";
import { findMissingEnv } from "@/lib/env";

const complete = {
  VITE_APP_VERSION: "0.9",
  VITE_FIREBASE_API_KEY: "key",
  VITE_FIREBASE_AUTH_DOMAIN: "project.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "project",
  VITE_FIREBASE_APP_ID: "1:0:web:abc",
  VITE_MAP_STYLE_LIGHT: "https://tiles.test/light",
  VITE_MAP_STYLE_DARK: "https://tiles.test/dark",
  VITE_API_DIAG_URL: "https://edge.test/api/diag",
  VITE_API_EARTHQUAKES_URL: "https://edge.test/api/proxy/earthquakes",
  VITE_API_AI_QA_URL: "https://edge.test/api/proxy/ai-qa",
  VITE_API_ADMIN_SYNC_DATA_URL: "https://edge.test/api/proxy/admin/sync-data",
} as const;

describe("findMissingEnv", () => {
  it("reports nothing when every required value is present", () => {
    expect(findMissingEnv(complete)).toEqual([]);
  });

  it("reports every value that is absent", () => {
    expect(findMissingEnv({})).toEqual([
      "VITE_APP_VERSION",
      "VITE_FIREBASE_API_KEY",
      "VITE_FIREBASE_AUTH_DOMAIN",
      "VITE_FIREBASE_PROJECT_ID",
      "VITE_FIREBASE_APP_ID",
      "VITE_MAP_STYLE_LIGHT",
      "VITE_MAP_STYLE_DARK",
      "VITE_API_DIAG_URL",
      "VITE_API_EARTHQUAKES_URL",
      "VITE_API_AI_QA_URL",
      "VITE_API_ADMIN_SYNC_DATA_URL",
    ]);
  });

  it("treats a blank value as missing", () => {
    expect(
      findMissingEnv({ ...complete, VITE_FIREBASE_API_KEY: "   " }),
    ).toEqual(["VITE_FIREBASE_API_KEY"]);
  });
});
