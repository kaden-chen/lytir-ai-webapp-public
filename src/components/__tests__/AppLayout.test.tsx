import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AppLayout } from "@/components/AppLayout";
import { AuthContext, type AuthState } from "@/features/auth/auth-context";
import { fakeAuthState, fakeUser } from "@/test/auth";

// The header's status indicator is covered by its own tests. Stubbing the
// request here keeps this file about the shell and away from Firebase.
vi.mock("@/lib/diag", () => ({
  DIAG_QUERY_KEY: ["diag"],
  fetchDiag: vi.fn(async () => ({})),
  isAdmin: () => false,
}));

function renderLayout(state: AuthState) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <MantineProvider>
      <QueryClientProvider client={client}>
        <AuthContext.Provider value={state}>
          <MemoryRouter initialEntries={["/"]}>
            <Routes>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<p>Protected home</p>} />
              </Route>
              <Route path="/signin" element={<p>Sign-in form</p>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    </MantineProvider>,
  );
}

// The address, the sign-out control and the version all live behind the
// account menu now, so each assertion opens it first. The header itself
// deliberately carries none of them.
function openAccountMenu() {
  fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
}

describe("AppLayout", () => {
  it("keeps the address and the version out of the header", () => {
    renderLayout(fakeAuthState({ user: fakeUser("hekla@example.com") }));

    expect(screen.queryByText("hekla@example.com")).toBeNull();
    expect(screen.queryByText(/0\.0\.0-test/)).toBeNull();
    expect(screen.getByText("Protected home")).toBeTruthy();
  });

  it("shows the signed-in address and the application version on demand", async () => {
    renderLayout(fakeAuthState({ user: fakeUser("hekla@example.com") }));

    openAccountMenu();

    expect(await screen.findByText("hekla@example.com")).toBeTruthy();
    expect(screen.getByText("Version 0.0.0-test")).toBeTruthy();
  });

  it("signs out and returns to the sign-in page", async () => {
    const state = fakeAuthState({ user: fakeUser() });
    renderLayout(state);

    openAccountMenu();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Sign out" }));

    expect(state.signOut).toHaveBeenCalled();
    expect(await screen.findByText("Sign-in form")).toBeTruthy();
  });
});
