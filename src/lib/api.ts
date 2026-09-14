import { auth } from "@/lib/firebase";

interface ApiErrorOptions {
  status?: number | null;
  correlationId?: string | null;
  cause?: unknown;
}

/**
 * A failed request. `status` is null when no HTTP response arrived at all,
 * which distinguishes a service that answered badly from one that could not be
 * reached.
 */
export class ApiError extends Error {
  readonly status: number | null;
  readonly correlationId: string | null;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.status = options.status ?? null;
    this.correlationId = options.correlationId ?? null;
  }
}

// Every request goes through here so that token attachment exists in exactly
// one place. Several copies of getIdToken would mean several refresh
// behaviours, and failures that only appear once a token expires mid-session.
export async function apiRequest<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const user = auth.currentUser;

  if (!user) {
    throw new ApiError("Not signed in");
  }

  // Returns the cached token unless it is close to expiry, in which case it
  // refreshes first. Callers never deal with token lifetime.
  const token = await user.getIdToken();

  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (cause) {
    throw new ApiError("Could not reach the service", { cause });
  }

  if (!response.ok) {
    throw new ApiError(`Request failed with status ${response.status}`, {
      status: response.status,
      // Surfaced in the interface so a failure can be traced in backend logs.
      correlationId: response.headers.get("x-correlation-id"),
    });
  }

  return (await response.json()) as T;
}
