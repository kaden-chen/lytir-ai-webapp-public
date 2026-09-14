import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom implements neither API, and Mantine components depend on both.
vi.stubGlobal("matchMedia", (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
}));

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

// jsdom does not implement the font loading API. Mantine's autosizing textarea
// listens to it so it can remeasure once a webfont arrives, and reading it
// unguarded throws during mount.
Object.defineProperty(document, "fonts", {
  configurable: true,
  value: {
    addEventListener: () => {},
    removeEventListener: () => {},
  },
});

afterEach(() => {
  cleanup();
});
