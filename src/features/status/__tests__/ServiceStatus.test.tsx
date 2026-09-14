import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DiagResponse } from "@/lib/diag";

const { fetchDiagMock } = vi.hoisted(() => ({
  fetchDiagMock: vi.fn<() => Promise<DiagResponse>>(),
}));

vi.mock("@/lib/diag", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/diag")>("@/lib/diag");
  return { ...actual, fetchDiag: fetchDiagMock };
});

const { ServiceStatus } = await import("@/features/status/ServiceStatus");

function renderStatus() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <MantineProvider>
      <QueryClientProvider client={client}>
        <ServiceStatus />
      </QueryClientProvider>
    </MantineProvider>,
  );
}

describe("ServiceStatus", () => {
  it("shows the state to an administrator", async () => {
    fetchDiagMock.mockResolvedValue({ security: { role: "admin" } });
    renderStatus();

    const status = await screen.findByRole("status");
    expect(status.getAttribute("aria-label")).toContain("Service online");
    expect(screen.getByText("Online")).toBeTruthy();
  });

  it("is keyboard reachable rather than tooltip-only", async () => {
    fetchDiagMock.mockResolvedValue({ security: { role: "admin" } });
    renderStatus();

    const status = await screen.findByRole("status");
    expect(status.getAttribute("tabindex")).toBe("0");
  });

  it("renders nothing for a non-administrator", async () => {
    fetchDiagMock.mockResolvedValue({ security: { role: "user" } });
    renderStatus();

    await vi.waitFor(() => {
      expect(fetchDiagMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("renders nothing when the role is absent, rather than assuming admin", async () => {
    fetchDiagMock.mockResolvedValue({});
    renderStatus();

    await vi.waitFor(() => {
      expect(fetchDiagMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("renders nothing when the first check fails, because the role is unknown", async () => {
    fetchDiagMock.mockRejectedValue(new Error("unreachable"));
    renderStatus();

    await vi.waitFor(() => {
      expect(fetchDiagMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole("status")).toBeNull();
  });
});
