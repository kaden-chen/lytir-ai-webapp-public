import { describe, expect, it } from "vitest";
import { basemapStyleUrl } from "@/features/map/basemap";

describe("basemapStyleUrl", () => {
  it("uses the light style for the light colour scheme", () => {
    expect(basemapStyleUrl("light")).toBe("https://example.test/styles/light");
  });

  it("uses the dark style for the dark colour scheme", () => {
    expect(basemapStyleUrl("dark")).toBe("https://example.test/styles/dark");
  });
});
