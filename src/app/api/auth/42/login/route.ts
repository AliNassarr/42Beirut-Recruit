import { NextRequest, NextResponse } from "next/server";
 
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const rawClientId = process.env.FORTY_TWO_CLIENT_ID || "";
  const clientId = rawClientId.replace(/^["']|["']$/g, "").trim();

  const rawOrigin = process.env.NEXTAUTH_URL || request.nextUrl.origin;
  const origin = rawOrigin.replace(/\/+$/, "");
  const redirectUri = `${origin}/api/auth/callback/42-school`;

  if (!clientId) {
    return NextResponse.json(
      { error: "FORTY_TWO_CLIENT_ID is not configured in .env" },
      { status: 500 }
    );
  }

  const authUrl = new URL("https://api.intra.42.fr/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "public");

  return NextResponse.redirect(authUrl.toString());
}
