import { Center, Loader } from "@mantine/core";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/features/auth/auth-context";

export function RequireAuth() {
  const { user, initialising } = useAuth();
  const location = useLocation();

  if (initialising) {
    return (
      <Center h="100vh">
        <Loader aria-label="Checking your session" />
      </Center>
    );
  }

  if (!user) {
    return (
      <Navigate to="/signin" replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
}
