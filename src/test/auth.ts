import { vi } from "vitest";
import type { User } from "firebase/auth";
import type { AuthState } from "@/features/auth/auth-context";

export function fakeUser(email = "seismologist@example.com"): User {
  return { email, uid: "test-uid" } as User;
}

/** An AuthState whose methods are spies, signed out unless told otherwise. */
export function fakeAuthState(overrides: Partial<AuthState> = {}): AuthState {
  return {
    user: null,
    initialising: false,
    signIn: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    sendPasswordReset: vi.fn(async () => {}),
    ...overrides,
  };
}
