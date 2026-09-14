import { ApiError } from "@/lib/api";

export type ServiceState = "online" | "offline" | "unknown";

interface ServiceStateInput {
  error: unknown;
  /** `navigator.onLine`, passed in so this stays a pure function. */
  browserOnline: boolean;
}

// Three states rather than two. "offline" asserts that the service answered
// badly; a request that never arrived says nothing about the service, so it
// reports "unknown" instead of blaming the thing being measured.
export function serviceState({
  error,
  browserOnline,
}: ServiceStateInput): ServiceState {
  if (!error) {
    return "online";
  }

  if (!browserOnline) {
    return "unknown";
  }

  if (error instanceof ApiError && error.status !== null) {
    return error.status >= 500 ? "offline" : "unknown";
  }

  return "unknown";
}

export const SERVICE_STATE_LABEL: Record<ServiceState, string> = {
  online: "Online",
  offline: "Offline",
  unknown: "Unknown",
};

export const SERVICE_STATE_DESCRIPTION: Record<ServiceState, string> = {
  online: "Service online: the last check succeeded",
  offline: "Service offline: the last check failed",
  unknown: "Service state unknown: the last check could not be completed",
};
