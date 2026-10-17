import { NextRequest, NextResponse } from "next/server";
import { MockIntraUser, format42ProjectDate } from "@/lib/intra/mock-data";
import { createSession } from "@/lib/auth-session";

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

  const origin = process.env.NEXTAUTH_URL || request.nextUrl.origin;
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
    // 1. Exchange authorization code for access_token
    // Include both Basic Auth header and form body parameters to guarantee compatibility with 42 Intra Doorkeeper
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://api.intra.42.fr/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": "42Beirut-Recruit/1.0 (Netlify Serverless)",
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
      const errBody = await tokenRes.text();
      console.error("42 token exchange failed:", errBody);
      return redirectToSafeError(origin, `Token exchange failed: ${errBody}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch authenticated student profile from /v2/me
    const meRes = await fetch("https://api.intra.42.fr/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "User-Agent": "42Beirut-Recruit/1.0 (Netlify Serverless)",
      },
    });

    if (!meRes.ok) {
      const errBody = await meRes.text();
      console.error("42 /v2/me fetch failed:", errBody);
      return redirectToSafeError(origin, "Failed to retrieve 42 profile");
    }

    const me = await meRes.json();

    // 3. Extract 42cursus data (cursus_id === 21)
    const cursus42 =
      me.cursus_users?.find((c: any) => c.cursus_id === 21) ||
      me.cursus_users?.sort((a: any, b: any) => (b.level || 0) - (a.level || 0))[0];

    // Primary campus
    const primaryCampus = me.campus_users?.find((c: any) => c.is_primary);
    const campusObj =
      me.campus?.find((c: any) => c.id === primaryCampus?.campus_id) ||
      me.campus?.[0] || { id: 43, name: "Beirut" };

    // Extract validated 42 projects (cursus 21)
    const validatedProjects: MockIntraUser["validatedProjects"] = (me.projects_users || [])
      .filter((pu: any) => {
        const isValid = pu["validated?"] === true || (pu.status === "finished" && (pu.final_mark || 0) >= 75);
        const isCursus21 = !pu.cursus_ids || pu.cursus_ids.length === 0 || pu.cursus_ids.includes(21);
        return isValid && isCursus21;
      })
      .map((pu: any) => {
        const rawSlug = pu.project?.slug || pu.project?.name?.toLowerCase().replace(/[^a-z0-9]/g, "-") || "";
        const cleanSlug = rawSlug.replace(/^42cursus-/, "");
        const rawDate = pu.marked_at || pu.updated_at || new Date().toISOString();
        return {
          id: pu.project?.id || Math.floor(Math.random() * 10000),
          name: pu.project?.name || cleanSlug,
          slug: cleanSlug,
          finalMark: pu.final_mark || 100,
          validated: true,
          markedAt: rawDate,
          date: format42ProjectDate(rawDate),
        };
      });

    // Sort descending chronologically (newest projects first)
    validatedProjects.sort(
      (a, b) => new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime()
    );

    // Construct unified student profile
    const studentProfile: MockIntraUser = {
      id: me.id,
      login: me.login,
      email: me.email,
      displayname: me.usual_full_name || me.displayname || me.login,
      image: me.image?.link || me.image?.versions?.medium || "",
      campusName: campusObj.name || "Beirut",
      campusId: campusObj.id || 43,
      level: cursus42 ? parseFloat(cursus42.level.toFixed(2)) : 0.0,
      grade: cursus42?.grade || "Learner",
      poolMonth: me.pool_month || "",
      poolYear: me.pool_year ? parseInt(me.pool_year) : 2024,
      coalition: "42 Beirut",
      beginAt: cursus42?.begin_at || new Date().toISOString(),
      validatedProjects,
    };

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
