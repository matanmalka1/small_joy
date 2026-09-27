import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Better Auth HTTP endpoints (email verification links, password-reset callback, session).
export async function GET(req: Request) {
  return toNextJsHandler(auth()).GET(req);
}

export async function POST(req: Request) {
  return toNextJsHandler(auth()).POST(req);
}
