import { useState } from "react";
import {
  AppShell,
  Avatar,
  Box,
  Group,
  Menu,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { Outlet, useNavigate } from "react-router";
import { ColorSchemeToggle } from "@/components/ColorSchemeToggle";
import { useAuth } from "@/features/auth/auth-context";
import { ServiceStatus } from "@/features/status/ServiceStatus";
import { env } from "@/lib/env";

// The first letter of the account, which is all an avatar needs to distinguish
// one signed-in reader from another on a single-tenant screen.
function initial(email: string | null | undefined) {
  return email?.trim()?.[0]?.toUpperCase() ?? "?";
}

export function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await signOut();
      navigate("/signin", { replace: true });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <AppShell header={{ height: 52 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Text fw={600} fz="md" style={{ letterSpacing: "-0.01em" }}>
            Lytir AI
          </Text>
          <Group gap="xs" wrap="nowrap">
            <ColorSchemeToggle />
            <ServiceStatus />
            {/* The address and the sign-out control move behind the avatar.
                An email address is not something the reader needs to be told
                continuously, and on a narrow viewport a bordered Sign out
                button spent scarce width on the least-used action. */}
            <Menu position="bottom-end" withArrow>
              <Menu.Target>
                <UnstyledButton aria-label="Account menu">
                  <Avatar size={28} radius="xl" color="cyan" variant="light">
                    <Text fz="xs" fw={600}>
                      {initial(user?.email)}
                    </Text>
                  </Avatar>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                {user?.email ? (
                  <>
                    <Menu.Label>Signed in as</Menu.Label>
                    <Box px="sm" pb={6}>
                      {/* Rendered as a child, never interpolated. */}
                      <Text size="sm" style={{ wordBreak: "break-all" }}>
                        {user.email}
                      </Text>
                    </Box>
                    <Menu.Divider />
                  </>
                ) : null}
                <Menu.Item onClick={handleSignOut} disabled={signingOut}>
                  {signingOut ? "Signing out…" : "Sign out"}
                </Menu.Item>
                <Menu.Divider />
                {/* The version belongs where someone reporting a problem can
                    find it. As a badge beside the product name it carried the
                    weight of a feature; in a tooltip it would not be reachable
                    by a screen reader or by touch at all. */}
                <Menu.Label>Version {env.appVersion}</Menu.Label>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
