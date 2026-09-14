// Email enumeration protection collapses an unknown address and a wrong
// password into auth/invalid-credential, so the copy below never distinguishes
// the two. Saying more would leak which addresses have accounts.
const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-password": "Enter your password.",
  "auth/user-disabled":
    "This account is disabled. Ask an administrator to re-enable it.",
  "auth/too-many-requests":
    "Too many attempts. Wait a few minutes and try again.",
  "auth/network-request-failed":
    "Could not reach the sign-in service. Check your connection.",
};

const FALLBACK = "Something went wrong. Try again.";

function errorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : "";
}

export function authErrorMessage(error: unknown): string {
  return MESSAGES[errorCode(error)] ?? FALLBACK;
}

// A reset request must not reveal whether an address has an account, so only
// failures the person can act on are worth showing. Anything else is reported
// as sent.
const REPORTABLE_RESET_CODES = new Set([
  "auth/invalid-email",
  "auth/missing-email",
  "auth/too-many-requests",
  "auth/network-request-failed",
]);

export function isReportableResetError(error: unknown): boolean {
  return REPORTABLE_RESET_CODES.has(errorCode(error));
}
