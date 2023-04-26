import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/src/server/auth/lucia";

/**
 * User logout
 */
export async function GET(request: NextRequest) {
  const res = new NextResponse();

  // Validate auth session
  const authRequest = auth.handleRequest(request, res);
  const session = await authRequest.validate();
  if (!session) return new Response("Unauthorized", { status: 401 });

  // Invalidate session
  await auth.invalidateSession(session.sessionId);
  authRequest.setSession(null);

  return res;
}