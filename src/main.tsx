import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
// Self-hosted, and imported once here so the whole interface shares one font
// request. The variable file covers every weight the theme asks for.
import "@fontsource-variable/inter";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { missingEnv } from "@/lib/env";
import { theme } from "@/lib/theme";
import { ConfigurationError } from "@/components/ConfigurationError";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { AppRoutes } from "@/routes";

const queryClient = new QueryClient();

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element #root was not found in the document");
}

createRoot(container).render(
  <StrictMode>
    {/* Dark by default rather than following the operating system. Magnitude
        is encoded in warm hues, and warm marks on a pale basemap read as
        washed out while the same marks on a dark one read as data.

        A default and not forced, now that the header carries a toggle:
        `forceColorScheme` makes `setColorScheme` a no-op, so forcing it would
        leave the control inert. The consequence is that a scheme already
        stored in localStorage wins over this default, which is the correct
        behaviour once a reader can choose — their choice should outlast a
        release. */}
    <MantineProvider theme={theme} defaultColorScheme="dark">
      {missingEnv.length > 0 ? (
        <ConfigurationError missing={missingEnv} />
      ) : (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      )}
    </MantineProvider>
  </StrictMode>,
);
