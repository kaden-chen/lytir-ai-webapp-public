import { describe, expect, it } from "vitest";
import {
  authErrorMessage,
  isReportableResetError,
} from "@/features/auth/authErrors";

describe("authErrorMessage", () => {
  it("does not distinguish an unknown address from a wrong password", () => {
    expect(authErrorMessage({ code: "auth/invalid-credential" })).toBe(
      "Email or password is incorrect.",
    );
  });

  it("explains a rate limit", () => {
    expect(authErrorMessage({ code: "auth/too-many-requests" })).toContain(
      "Too many attempts",
    );
  });

  it("falls back for an unrecognised code", () => {
    expect(authErrorMessage({ code: "auth/internal-error" })).toBe(
      "Something went wrong. Try again.",
    );
  });

  it("falls back for something that is not a Firebase error", () => {
    expect(authErrorMessage(new Error("boom"))).toBe(
      "Something went wrong. Try again.",
    );
  });
});

describe("isReportableResetError", () => {
  it("reports a malformed address, which the person can fix", () => {
    expect(isReportableResetError({ code: "auth/invalid-email" })).toBe(true);
  });

  it("hides an unknown account, which would leak who has one", () => {
    expect(isReportableResetError({ code: "auth/user-not-found" })).toBe(false);
  });
});
