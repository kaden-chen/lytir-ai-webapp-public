import { createContext, useContext } from "react";
import type { User } from "firebase/auth";

export interface AuthState {
  user: User | null;
  /** True until Firebase has restored any persisted session. */
  initialising: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const state = useContext(AuthContext);

  if (!state) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return state;
}
