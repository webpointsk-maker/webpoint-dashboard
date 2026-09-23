import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireMember } from "@/lib/auth";
import { GOOGLE_SCOPES, oauthClient } from "@/lib/google/calendar";

export async function GET(request: Request) {
  const { profile } = await requireMember();
  const { origin } = new URL(request.url);
  if (profile.role !== "admin") return NextResponse.redirect(`${origin}/nastavenia?google=forbidden`);

  const state = randomBytes(16).toString("hex");
  const url = oauthClient(`${origin}/api/google/callback`).generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state,
  });
  const res = NextResponse.redirect(url);
  res.cookies.set("g_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
