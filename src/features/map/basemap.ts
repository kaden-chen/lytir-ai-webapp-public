import { env } from "@/lib/env";

export type BasemapScheme = "light" | "dark";

// The basemap follows Mantine's colour scheme. Keeping the choice in a pure
// function keeps it testable without a WebGL context.
export function basemapStyleUrl(scheme: BasemapScheme): string {
  return scheme === "dark" ? env.mapStyle.dark : env.mapStyle.light;
}
