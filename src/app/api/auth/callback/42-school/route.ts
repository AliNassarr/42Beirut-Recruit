import { NextRequest, NextResponse } from "next/server";
import { MockIntraUser } from "@/lib/intra/mock-data";
import { extractIntraProfile } from "@/lib/intra/extract-profile";
import { createSession } from "@/lib/auth-session";
import { generateBridgeSignature } from "@/lib/auth-hmac";

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
    // 1. Tier 1: Clean RFC-6749 OAuth Token Exchange
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://api.intra.42.fr/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": "42Beirut-Recruit/1.0 (contact: info@42beirut.com)",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const status = tokenRes.status;
      const statusText = tokenRes.statusText;
      const errBody = await tokenRes.text();
      console.error(`42 token exchange failed [HTTP ${status} ${statusText}]:`, errBody);

      // Tier 2: Check if Cloudflare blocked the datacenter IP with a 403 or HTML challenge
      const isCloudflareChallenge =
        status === 403 ||
        errBody.includes("Just a moment") ||
        errBody.includes("<!DOCTYPE") ||
        errBody.includes("<html");

      if (isCloudflareChallenge) {
        console.warn("Cloudflare 403 bot challenge detected on server. Handing over to residential browser bridge with stateless HMAC ticket...");
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
      }

      return redirectToSafeError(origin, `Token exchange failed (${status}): ${errBody}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch authenticated student profile from /v2/me
    const meRes = await fetch("https://api.intra.42.fr/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "User-Agent": "42Beirut-Recruit/1.0 (contact: info@42beirut.com)",
      },
    });

    if (!meRes.ok) {
      const status = meRes.status;
      const statusText = meRes.statusText;
      const errBody = await meRes.text();
      console.error(`42 /v2/me fetch failed [HTTP ${status} ${statusText}]:`, errBody);
      return redirectToSafeError(origin, `Failed to retrieve 42 profile (${status})`);
    }

    const me = await meRes.json();
    const studentProfile = extractIntraProfile(me);

    // Store student profile in server-side session cache (bypassing 4KB cookie limit)
    const sid = createSession(studentProfile);

    // Redirect with auth=success&sid=${sid}
    const redirectUrl = new URL("/", origin);
    redirectUrl.searchParams.set("auth", "success");
    redirectUrl.searchParams.set("sid", sid);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("forty_two_sid", sid, {
      httpOnly: false, // Accessible to client-side hydration
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("42 OAuth callback processing error:", err);
    return redirectToSafeError(origin, err?.message || "OAuth error");
  }
}
