import { describe, expect, it } from "vitest";
import { formatEvidence } from "@/features/admin/syncData";

describe("formatEvidence", () => {
  it("renders the response whole rather than summarising it", () => {
    const text = formatEvidence({
      counts: { retrieved: 11, published: 11, failed: 0 },
      reason: "OK",
    });

    // A summary would have to be trusted; the response speaks for itself.
    expect(text).toContain('"retrieved": 11');
    expect(text).toContain('"reason": "OK"');
  });

  it("keeps a failure visible on an otherwise successful call", () => {
    const text = formatEvidence({
      counts: { retrieved: 11, published: 8, failed: 3 },
    });

    // HTTP 200 with a non-zero `failed` is a partial run. Nothing in the
    // interface interprets that, so the number has to be readable.
    expect(text).toContain('"failed": 3');
  });

  it("indents, so a reader can scan it", () => {
    expect(formatEvidence({ counts: { failed: 0 } })).toBe(
      ["{", '  "counts": {', '    "failed": 0', "  }", "}"].join("\n"),
    );
  });

  it("survives a response that is not an object", () => {
    expect(formatEvidence(null)).toBe("null");
  });
});
