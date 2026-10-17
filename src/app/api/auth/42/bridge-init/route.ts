import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const code = body?.code;

    if (!code) {
      return NextResponse.json({ error: "Authorization code is required" }, { status: 400 });
    }

    const cookieTicket = request.cookies.get("forty_two_bridge_ticket")?.value;
    if (!cookieTicket) {
      return NextResponse.json(
        { error: "No active bridge ticket found or ticket expired" },
        { status: 401 }
      );
    }

    let parsedTicket: { code: string; ts: number };
    try {
      parsedTicket = JSON.parse(Buffer.from(cookieTicket, "base64").toString("utf-8"));
    } catch {
      return NextResponse.json({ error: "Malformed bridge ticket" }, { status: 400 });
    }

    // Verify ticket expiration (5 minutes maximum lifespan)
    if (Date.now() - parsedTicket.ts > 5 * 60 * 1000) {
      return NextResponse.json({ error: "Bridge ticket has expired" }, { status: 401 });
    }

    if (parsedTicket.code !== code) {
      return NextResponse.json({ error: "Authorization code mismatch" }, { status: 403 });
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
