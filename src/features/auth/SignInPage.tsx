import { useState, type FormEvent } from "react";
import {
  Alert,
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/features/auth/auth-context";
import {
  authErrorMessage,
  isReportableResetError,
} from "@/features/auth/authErrors";

type Mode = "signIn" | "reset";

export function SignInPage() {
  const { user, signIn, sendPasswordReset } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? "/"} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (mode === "signIn") {
        await signIn(email, password);
      } else {
        await sendPasswordReset(email);
        setResetSent(true);
      }
    } catch (cause) {
      if (mode === "reset" && !isReportableResetError(cause)) {
        setResetSent(true);
      } else {
        setError(authErrorMessage(cause));
      }
    } finally {
      setBusy(false);
    }
  }

  function switchTo(next: Mode) {
    setMode(next);
    setError(null);
    setResetSent(false);
  }

  return (
    <Container size={420} py="xl">
      <Title order={1} ta="center">
        Lytir AI
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt="xs">
        {mode === "signIn"
          ? "Sign in to continue."
          : "We will email a link to set a new password."}
      </Text>

      <Paper
        component="form"
        onSubmit={handleSubmit}
        withBorder
        shadow="sm"
        radius="md"
        p="lg"
        mt="xl"
      >
        <Stack>
          {error ? (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          ) : null}

          {resetSent ? (
            <Alert color="teal" role="status">
              If an account exists for {email}, a reset link is on its way.
              Check your spam folder if it does not arrive.
            </Alert>
          ) : null}

          <TextInput
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
          />

          {mode === "signIn" ? (
            <PasswordInput
              label="Password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
          ) : null}

          <Button type="submit" loading={busy} fullWidth>
            {mode === "signIn" ? "Sign in" : "Send reset link"}
          </Button>

          <Anchor
            component="button"
            type="button"
            size="sm"
            ta="center"
            onClick={() => switchTo(mode === "signIn" ? "reset" : "signIn")}
          >
            {mode === "signIn" ? "Forgot your password?" : "Back to sign in"}
          </Anchor>
        </Stack>
      </Paper>

      <Text size="xs" c="dimmed" ta="center" mt="md">
        Accounts are created by an administrator.
      </Text>
    </Container>
  );
}
