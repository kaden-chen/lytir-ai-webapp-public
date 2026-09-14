import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { AuthContext, type AuthState } from "@/features/auth/auth-context";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { fakeAuthState, fakeUser } from "@/test/auth";

function renderGuard(state: AuthState) {
  return render(
    <MantineProvider>
      <AuthContext.Provider value={state}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/" element={<p>Protected home</p>} />
            </Route>
            <Route path="/signin" element={<p>Sign-in form</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </MantineProvider>,
  );
}

describe("RequireAuth", () => {
  it("waits while the persisted session is restored", () => {
    renderGuard(fakeAuthState({ initialising: true }));

    expect(screen.getByLabelText("Checking your session")).toBeTruthy();
    expect(screen.queryByText("Protected home")).toBeNull();
  });

  it("sends a signed-out visitor to the sign-in page", () => {
    renderGuard(fakeAuthState());

    expect(screen.getByText("Sign-in form")).toBeTruthy();
    expect(screen.queryByText("Protected home")).toBeNull();
  });

  it("renders the route for a signed-in user", () => {
    renderGuard(fakeAuthState({ user: fakeUser() }));

    expect(screen.getByText("Protected home")).toBeTruthy();
  });
});
