import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "@/components/AppLayout";
import { HomeScreen } from "@/components/HomeScreen";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { SignInPage } from "@/features/auth/SignInPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/signin" element={<SignInPage />} />
      <Route element={<RequireAuth />}>
        {/* The map is the application, and the assistant and administrator
            functions are sections beside it rather than separate destinations,
            so that the map stays visible while they are used. */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomeScreen />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
