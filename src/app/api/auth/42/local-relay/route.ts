import { NextRequest, NextResponse } from "next/server";
import { requestHttp2, requestFetch } from "@/lib/intra-oauth-transport";
 
export const runtime = 'edge';

function corsHeaders(origin = "*"): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
    "Access-Control-Allow-Private-Network": "true",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || "*";
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") || "*";
  const headers = corsHeaders(origin);

  try {
    const body = await request.json().catch(() => ({}));
    const { clientId, clientSecret, code, redirectUri } = body;

    if (!clientId || !clientSecret || !code) {
      return NextResponse.json(
        { error: "Missing required parameters (clientId, clientSecret, code)" },
        { status: 400, headers }
      );
    }

    const bodyString = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }).toString();

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const authHeader = { authorization: `Basic ${basicAuth}` };

    // 1. Exchange token using residential Node server
    let tokenData: any = null;
    let tokenStatus = 0;

    try {
      const h2Res = await requestHttp2("POST", "/oauth/token", bodyString, undefined, authHeader);
      tokenStatus = h2Res.status;
      tokenData = JSON.parse(h2Res.body);
    } catch {
      const fetchRes = await requestFetch("POST", "/oauth/token", bodyString, {
        Authorization: `Basic ${basicAuth}`,
      });
      tokenStatus = fetchRes.status;
      try {
        tokenData = JSON.parse(fetchRes.body);
      } catch {
        // Not JSON
      }
    }

    if (!tokenData || !tokenData.access_token) {
      return NextResponse.json(
        { error: tokenData?.error_description || tokenData?.error || "Failed to exchange token via local relay" },
        { status: tokenStatus || 400, headers }
      );
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch student profile from /v2/me
    let profile: any = null;
    try {
      const meH2 = await requestHttp2("GET", "/v2/me", undefined, undefined, {
        authorization: `Bearer ${accessToken}`,
      });
      profile = JSON.parse(meH2.body);
    } catch {
      const meFetch = await requestFetch("GET", "/v2/me", undefined, {
        Authorization: `Bearer ${accessToken}`,
      });
      profile = JSON.parse(meFetch.body);
    }

    if (!profile || !profile.login) {
      return NextResponse.json(
        { error: "Failed to retrieve student profile via local relay" },
        { status: 502, headers }
      );
    }

    return NextResponse.json(
      {
        success: true,
        accessToken,
        profile,
      },
      { headers }
    );
  } catch (err: any) {
    console.error("Local relay error:", err);
    return NextResponse.json(
      { error: err.message || "Local relay failed" },
      { status: 500, headers }
    );
  }
}
