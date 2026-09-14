import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AuthContext, type AuthState } from "@/features/auth/auth-context";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [initialising, setInitialising] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (next) => {
        setUser(next);
        setInitialising(false);
      }),
    [],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      initialising,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      signOut: () => signOut(auth),
      sendPasswordReset: (email) => sendPasswordResetEmail(auth, email),
    }),
    [user, initialising],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
