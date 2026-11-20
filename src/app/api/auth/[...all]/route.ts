import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

// Endpoints de Better Auth: /api/auth/sign-in/email, /api/auth/callback/google,
// /api/auth/get-session, /api/auth/admin/* (estos últimos verifican el rol).
export const { GET, POST } = toNextJsHandler(auth);
