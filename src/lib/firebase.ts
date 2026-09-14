import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { env } from "@/lib/env";

// Analytics is deliberately left out: authentication needs only app and auth,
// and analytics adds bundle weight, cookies, and consent obligations.
const app = initializeApp(env.firebase);

export const auth = getAuth(app);
