import { describe, expect, it } from "vitest";
import { serviceState } from "@/features/status/serviceState";
import { ApiError } from "@/lib/api";

describe("serviceState", () => {
  it("is online when the last check succeeded", () => {
    expect(serviceState({ error: null, browserOnline: true })).toBe("online");
  });

  it("is offline when the service answered with a server error", () => {
    const error = new ApiError("boom", { status: 502 });

    expect(serviceState({ error, browserOnline: true })).toBe("offline");
  });

  it("is unknown when no response arrived, which says nothing about the service", () => {
    const error = new ApiError("unreachable");

    expect(serviceState({ error, browserOnline: true })).toBe("unknown");
  });

  it("is unknown when this browser is offline", () => {
    const error = new ApiError("unreachable");

    expect(serviceState({ error, browserOnline: false })).toBe("unknown");
  });

  it("does not blame the service for a client error", () => {
    const error = new ApiError("forbidden", { status: 403 });

    expect(serviceState({ error, browserOnline: true })).toBe("unknown");
  });
});
