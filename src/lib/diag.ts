import { apiRequest } from "@/lib/api";
import { env } from "@/lib/env";

// Only the fields this application reads are described. Everything is optional
// because the shape belongs to a diagnostics endpoint, which may change or be
// locked down without notice, and an absent field must degrade rather than
// throw. `claims` is deliberately not modelled: it is never rendered or logged.
export interface DiagResponse {
  security?: {
    role?: string;
  };
}

// This lives in `lib` rather than in a feature because the role now decides
// what more than one feature displays, and features do not reach into each
// other's internals.
export const DIAG_QUERY_KEY = ["diag"] as const;

export function fetchDiag(): Promise<DiagResponse> {
  return apiRequest<DiagResponse>(env.api.diag);
}

// Presentation only. The API edge is the authorization control; what the
// interface chooses to render is never a permission.
export function isAdmin(diag: DiagResponse | undefined): boolean {
  return diag?.security?.role === "admin";
}
