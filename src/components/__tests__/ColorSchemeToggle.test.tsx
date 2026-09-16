import { MantineProvider, useComputedColorScheme } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColorSchemeToggle } from "@/components/ColorSchemeToggle";

// Reports whichever scheme is actually applied, so the assertions can observe
// the toggle's effect rather than trusting its label.
function CurrentScheme() {
  return <output>{useComputedColorScheme("light")}</output>;
}

// Rendered with the application's own default, so the first assertion in each
// test is a check on the starting state and not just on the toggle.
function renderToggle() {
  return render(
    <MantineProvider defaultColorScheme="light">
      <ColorSchemeToggle />
      <CurrentScheme />
    </MantineProvider>,
  );
}

describe("ColorSchemeToggle", () => {
  it("offers the scheme the reader is not looking at", () => {
    renderToggle();

    expect(screen.getByRole("status").textContent).toBe("light");
    expect(screen.getByRole("button", { name: "Use dark theme" })).toBeTruthy();
  });

  it("switches the scheme and then offers the way back", () => {
    renderToggle();

    fireEvent.click(screen.getByRole("button", { name: "Use dark theme" }));

    expect(screen.getByRole("status").textContent).toBe("dark");
    expect(
      screen.getByRole("button", { name: "Use light theme" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Use light theme" }));

    expect(screen.getByRole("status").textContent).toBe("light");
  });

  it("names the action in words rather than by icon alone", () => {
    renderToggle();

    const button = screen.getByRole("button", { name: "Use dark theme" });
    // An icon carries no accessible name of its own, so the control's label
    // has to. The glyph inside is explicitly hidden from assistive tech.
    expect(button.getAttribute("aria-label")).toBe("Use dark theme");
    expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });
});
