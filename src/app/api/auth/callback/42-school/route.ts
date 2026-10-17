import { NextRequest, NextResponse } from "next/server";
import { MockIntraUser } from "@/lib/intra/mock-data";
import { extractIntraProfile } from "@/lib/intra/extract-profile";
import { createSession } from "@/lib/auth-session";
import { generateBridgeSignature } from "@/lib/auth-hmac";
import { exchange42TokenOnServer, fetch42ProfileOnServer } from "@/lib/intra-oauth-transport";

function redirectToSafeError(origin: string, rawMessage: string): NextResponse {
  // Strip HTML tags, remove newlines/tabs, and collapse whitespace
  const cleanMessage = (rawMessage || "OAuth authorization failed")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const safeError = encodeURIComponent(cleanMessage.slice(0, 100));
  return NextResponse.redirect(new URL(`/?error=${safeError}`, origin));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const rawOrigin = process.env.NEXTAUTH_URL || request.nextUrl.origin;
  const origin = rawOrigin.replace(/\/+$/, "");
  const redirectUri = `${origin}/api/auth/callback/42-school`;

  if (error || !code) {
    console.error("42 OAuth callback error:", error, errorDescription);
    return redirectToSafeError(origin, errorDescription || error || "OAuth authorization failed");
  }

  const rawClientId = process.env.FORTY_TWO_CLIENT_ID || "";
  const rawClientSecret = process.env.FORTY_TWO_CLIENT_SECRET || "";

  const clientId = rawClientId.replace(/^["']|["']$/g, "").trim();
  const clientSecret = rawClientSecret.replace(/^["']|["']$/g, "").trim();

  if (!clientId || !clientSecret) {
    return redirectToSafeError(origin, "OAuth credentials missing in .env");
  }

  try {
    // 1. Multi-Transport Server-Side OAuth Exchange (HTTP/2 Chrome TLS, curl subprocess, etc.)
    const transportResult = await exchange42TokenOnServer({
      clientId,
      clientSecret,
      code,
      redirectUri,
    });

    // If server transports bypassed Cloudflare and succeeded:
    if (transportResult.passedCloudflare && transportResult.status === 200 && transportResult.data?.access_token) {
      const accessToken = transportResult.data.access_token;

      // Fetch profile using multi-transport
      const me = await fetch42ProfileOnServer(accessToken);
      if (me && me.login) {
        const studentProfile = extractIntraProfile(me);
        const sid = createSession(studentProfile);

        const redirectUrl = new URL("/", origin);
        redirectUrl.searchParams.set("auth", "success");
        redirectUrl.searchParams.set("sid", sid);
        const response = NextResponse.redirect(redirectUrl);
        response.cookies.set("forty_two_sid", sid, {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24,
          path: "/",
        });
        return response;
      }
    }

    // If 42 Intra returned a real OAuth failure (e.g. expired code):
    if (transportResult.passedCloudflare && transportResult.data?.error) {
      const errMsg = transportResult.data.error_description || transportResult.data.error;
      return redirectToSafeError(origin, `42 Intra: ${errMsg}`);
    }

    // If Cloudflare blocked server-side transports (or profile fetch failed), initiate residential bridge:
    console.warn("Server-side transports challenged by Cloudflare. Handing over to residential browser bridge with stateless HMAC ticket...");
    const ts = Date.now().toString();
    const sig = generateBridgeSignature(code, ts);

    const bridgeUrl = new URL("/", origin);
    bridgeUrl.searchParams.set("oauth_bridge", "1");
    bridgeUrl.searchParams.set("code", code);
    bridgeUrl.searchParams.set("ts", ts);
    bridgeUrl.searchParams.set("sig", sig);

    const bridgeResponse = NextResponse.redirect(bridgeUrl);
    const ticketPayload = JSON.stringify({ code, ts, sig });
    bridgeResponse.cookies.set("forty_two_bridge_ticket", Buffer.from(ticketPayload).toString("base64"), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 300, // 5 minutes
      path: "/",
    });
    return bridgeResponse;
  } catch (err: any) {
    console.error("42 OAuth callback processing error:", err);
    return redirectToSafeError(origin, err?.message || "OAuth error");
  }
}
