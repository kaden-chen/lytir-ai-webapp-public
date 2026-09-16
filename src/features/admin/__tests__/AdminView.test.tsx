import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";

const { syncDataMock, isAdminMock } = vi.hoisted(() => ({
  syncDataMock: vi.fn<() => Promise<unknown>>(),
  isAdminMock: vi.fn(() => true),
}));

vi.mock("@/features/admin/syncData", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/admin/syncData")
  >("@/features/admin/syncData");
  return { ...actual, syncData: syncDataMock };
});

vi.mock("@/lib/diag", () => ({
  DIAG_QUERY_KEY: ["diag"],
  fetchDiag: vi.fn(async () => ({})),
  isAdmin: () => isAdminMock(),
}));

const { AdminView } = await import("@/features/admin/AdminView");

const RESPONSE = {
  counts: {
    retrieved: 11,
    normalized: 11,
    skipped: 0,
    published: 11,
    failed: 0,
  },
  reason: "OK",
};

function renderAdmin() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");

  render(
    <MantineProvider>
      <QueryClientProvider client={client}>
        <AdminView />
      </QueryClientProvider>
    </MantineProvider>,
  );

  return { invalidate };
}

function trigger() {
  return screen.getByRole("button", { name: /Fetch latest from USGS/ });
}

beforeEach(() => {
  syncDataMock.mockReset();
  isAdminMock.mockReturnValue(true);
});

describe("AdminView", () => {
  it("offers the refresh to an administrator", () => {
    renderAdmin();

    expect((trigger() as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText(/Only an administrator/)).toBeNull();
  });

  it("shows the control to everyone but disables it without the role", () => {
    isAdminMock.mockReturnValue(false);
    renderAdmin();

    const button = trigger() as HTMLButtonElement;

    // Visible rather than hidden, so the interface has one shape, and the
    // reason is stated in text rather than left to a tooltip a disabled
    // control cannot show.
    expect(button.disabled).toBe(true);
    const reason = screen.getByText(/Only an administrator can run a refresh/);
    expect(button.getAttribute("aria-describedby")).toBe(reason.id);
  });

  it("shows the response as evidence that the run happened", async () => {
    syncDataMock.mockResolvedValue(RESPONSE);
    renderAdmin();

    fireEvent.click(trigger());

    expect(await screen.findByText(/Refresh complete/)).toBeTruthy();
    // Verbatim: a refresh can legitimately change nothing on screen, so the
    // receipt is the only proof it ran.
    expect(screen.getByText(/"published": 11/)).toBeTruthy();
  });

  it("re-reads the earthquakes query rather than writing it from the response", async () => {
    syncDataMock.mockResolvedValue(RESPONSE);
    const { invalidate } = renderAdmin();

    fireEvent.click(trigger());
    await screen.findByText(/Refresh complete/);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["earthquakes"] });
  });

  it("refuses a second run while one is in flight", async () => {
    syncDataMock.mockReturnValue(new Promise(() => {}));
    renderAdmin();

    fireEvent.click(trigger());

    // The pending state arrives a microtask after the click, so waiting for
    // it is the assertion rather than an accommodation of the test runner.
    await waitFor(() => {
      expect((trigger() as HTMLButtonElement).disabled).toBe(true);
    });

    fireEvent.click(trigger());

    expect(syncDataMock).toHaveBeenCalledTimes(1);
  });

  it("reports a failure with the identifier that traces it in the logs", async () => {
    syncDataMock.mockRejectedValue(
      new ApiError("Request failed with status 503", {
        status: 503,
        correlationId: "abc-123",
      }),
    );
    renderAdmin();

    fireEvent.click(trigger());

    expect(
      await screen.findByText(/Request failed with status 503/),
    ).toBeTruthy();
    expect(screen.getByText(/abc-123/)).toBeTruthy();
  });
});
