import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SafeMarkdown } from "@/features/chat/SafeMarkdown";

function renderMarkdown(markdown: string) {
  return render(
    <MantineProvider>
      <SafeMarkdown>{markdown}</SafeMarkdown>
    </MantineProvider>,
  );
}

describe("SafeMarkdown", () => {
  it("renders ordinary formatting", () => {
    const { container } = renderMarkdown("Yes. **Five earthquakes** today.");

    expect(container.querySelector("strong")?.textContent).toBe(
      "Five earthquakes",
    );
  });

  it("renders GitHub tables, which answers are allowed to use", () => {
    const { container } = renderMarkdown(
      ["| Magnitude | Place |", "| --- | --- |", "| 2.1 | Pāhala |"].join("\n"),
    );

    expect(container.querySelector("table")).not.toBeNull();
    expect(screen.getByText("Pāhala")).toBeTruthy();
  });

  it("does not render raw HTML from the model", () => {
    const { container } = renderMarkdown(
      "<img src=x onerror=alert(1)><b>bold</b>",
    );

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("<b>bold</b>");
  });

  it("refuses a javascript: link target", () => {
    const { container } = renderMarkdown("[click](javascript:alert(1))");

    const href = container.querySelector("a")?.getAttribute("href");
    expect(href ?? "").not.toContain("javascript:");
  });

  it("opens an ordinary link safely in a new tab", () => {
    const { container } = renderMarkdown("[usgs](https://example.test/page)");

    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://example.test/page");
    expect(link?.getAttribute("rel")).toContain("noopener");
    expect(link?.getAttribute("target")).toBe("_blank");
  });

  it("never fetches a model-supplied image", () => {
    const { container } = renderMarkdown(
      "![a map](https://example.test/x.png)",
    );

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("a map");
  });
});
