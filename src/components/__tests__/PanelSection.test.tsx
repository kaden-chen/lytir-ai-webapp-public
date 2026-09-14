import { useState } from "react";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PanelSection } from "@/components/PanelSection";

function Harness({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <MantineProvider>
      <PanelSection
        title="Ask Lytir"
        open={open}
        onToggle={() => setOpen((previous) => !previous)}
      >
        <p>section body</p>
      </PanelSection>
    </MantineProvider>
  );
}

describe("PanelSection", () => {
  it("keeps its header when closed, so the panel is never empty", () => {
    render(<Harness />);

    const header = screen.getByRole("button", { name: "Ask Lytir" });
    expect(header.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens and closes from its own header", () => {
    render(<Harness />);

    const header = screen.getByRole("button", { name: "Ask Lytir" });
    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");
  });

  it("hides closed content from assistive technology, not just from view", () => {
    render(<Harness />);

    // `hidden` removes the region from the accessibility tree, so querying by
    // role finds nothing while the content itself stays mounted.
    expect(screen.queryByRole("region")).toBeNull();
    expect(screen.getByText("section body")).toBeTruthy();
  });

  it("keeps its content mounted while closed, so state survives collapsing", () => {
    render(<Harness initiallyOpen />);

    fireEvent.click(screen.getByRole("button", { name: "Ask Lytir" }));

    expect(screen.getByText("section body")).toBeTruthy();
  });

  it("names the open region by its header", () => {
    render(<Harness initiallyOpen />);

    expect(screen.getByRole("region", { name: "Ask Lytir" })).toBeTruthy();
  });
});
