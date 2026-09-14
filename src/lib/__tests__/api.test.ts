import { afterEach, describe, expect, it, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({
  authMock: {
    currentUser: null as { getIdToken: () => Promise<string> } | null,
  },
}));

vi.mock("@/lib/firebase", () => ({ auth: authMock }));

const { ApiError, apiRequest } = await import("@/lib/api");

function signedIn(token = "test-token") {
  authMock.currentUser = { getIdToken: async () => token };
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

afterEach(() => {
  authMock.currentUser = null;
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("attaches the current ID token as a bearer token", async () => {
    signedIn("fresh-token");
    const fetchSpy = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchSpy);

    await apiRequest("https://example.test/api/diag");

    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer fresh-token");
  });

  it("refuses to send a request when nobody is signed in", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(apiRequest("https://example.test/api/diag")).rejects.toThrow(
      "Not signed in",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reports the status and correlation identifier of a failed response", async () => {
    signedIn();
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response("", {
          status: 503,
          headers: { "x-correlation-id": "abc-123" },
        }),
    );

    const error = await apiRequest("https://example.test/api/diag").catch(
      (cause: unknown) => cause,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as InstanceType<typeof ApiError>).status).toBe(503);
    expect((error as InstanceType<typeof ApiError>).correlationId).toBe(
      "abc-123",
    );
  });

  it("leaves status null when no response arrived at all", async () => {
    signedIn();
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("network down");
    });

    const error = await apiRequest("https://example.test/api/diag").catch(
      (cause: unknown) => cause,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as InstanceType<typeof ApiError>).status).toBeNull();
  });

  it("returns the parsed body on success", async () => {
    signedIn();
    vi.stubGlobal("fetch", async () =>
      jsonResponse({ security: { role: "admin" } }),
    );

    await expect(apiRequest("https://example.test/api/diag")).resolves.toEqual({
      security: { role: "admin" },
    });
  });
});
