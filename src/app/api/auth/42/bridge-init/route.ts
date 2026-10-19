import { NextRequest, NextResponse } from "next/server";
import { verifyBridgeSignature } from "@/lib/auth-hmac";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { code, ts, sig } = body || {};

    if (!code) {
      return NextResponse.json({ error: "Authorization code is required" }, { status: 400 });
    }

    // 1. Primary validation: Stateless HMAC-SHA256 signature
    let isValid = false;
    if (ts && sig && verifyBridgeSignature(code, ts, sig)) {
      isValid = true;
    }

    // 2. Secondary fallback: Check cookie if URL signature was omitted
    if (!isValid) {
      const cookieTicket = request.cookies.get("forty_two_bridge_ticket")?.value;
      if (cookieTicket) {
        try {
          const parsedTicket = JSON.parse(Buffer.from(cookieTicket, "base64").toString("utf-8"));
          if (
            parsedTicket.code === code &&
            Date.now() - parseInt(parsedTicket.ts, 10) <= 5 * 60 * 1000
          ) {
            isValid = true;
          }
        } catch {
          // ignore cookie parse error
        }
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired bridge handshake ticket. Please try signing in again." },
        { status: 401 }
      );
    }

    const rawClientId = process.env.FORTY_TWO_CLIENT_ID || "";
    const rawClientSecret = process.env.FORTY_TWO_CLIENT_SECRET || "";
    const clientId = rawClientId.replace(/^["']|["']$/g, "").trim();
    const clientSecret = rawClientSecret.replace(/^["']|["']$/g, "").trim();

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "OAuth credentials not configured on server" }, { status: 500 });
    }

    const rawOrigin = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const origin = rawOrigin.replace(/\/+$/, "");
    const redirectUri = `${origin}/api/auth/callback/42-school`;

    return NextResponse.json({
      clientId,
      clientSecret,
      code,
      redirectUri,
    });
  } catch (err: any) {
    console.error("Bridge init error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
