import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { AuthContext, type AuthState } from "@/features/auth/auth-context";
import { SignInPage } from "@/features/auth/SignInPage";
import { fakeAuthState, fakeUser } from "@/test/auth";

function renderSignIn(state: AuthState) {
  return render(
    <MantineProvider>
      <AuthContext.Provider value={state}>
        <MemoryRouter initialEntries={["/signin"]}>
          <Routes>
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/" element={<p>Protected home</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </MantineProvider>,
  );
}

// Labels carry a required asterisk, so anchor on the start of the label. A
// loose match would also hit the "Toggle password visibility" button.
const EMAIL = /^Email/;
const PASSWORD = /^Password/;

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function submit(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("SignInPage", () => {
  it("signs in with the email and password entered", async () => {
    const state = fakeAuthState();
    renderSignIn(state);

    fill(EMAIL, "seismologist@example.com");
    fill(PASSWORD, "correct-horse");
    submit("Sign in");

    await screen.findByRole("button", { name: "Sign in" });
    expect(state.signIn).toHaveBeenCalledWith(
      "seismologist@example.com",
      "correct-horse",
    );
  });

  it("shows a message that does not reveal which credential was wrong", async () => {
    renderSignIn(
      fakeAuthState({
        signIn: () => Promise.reject({ code: "auth/invalid-credential" }),
      }),
    );

    fill(EMAIL, "nobody@example.com");
    fill(PASSWORD, "wrong");
    submit("Sign in");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Email or password is incorrect.");
  });

  it("confirms a reset without confirming the account exists", async () => {
    renderSignIn(
      fakeAuthState({
        sendPasswordReset: () =>
          Promise.reject({ code: "auth/user-not-found" }),
      }),
    );

    submit("Forgot your password?");
    fill(EMAIL, "nobody@example.com");
    submit("Send reset link");

    const status = await screen.findByRole("status");
    expect(status.textContent).toContain(
      "If an account exists for nobody@example.com",
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("hides the password field while resetting", () => {
    renderSignIn(fakeAuthState());

    submit("Forgot your password?");

    expect(screen.queryByLabelText(PASSWORD)).toBeNull();
    expect(screen.getByLabelText(EMAIL)).toBeTruthy();
  });

  it("leaves the sign-in page once a session exists", () => {
    renderSignIn(fakeAuthState({ user: fakeUser() }));

    expect(screen.getByText("Protected home")).toBeTruthy();
  });
});
