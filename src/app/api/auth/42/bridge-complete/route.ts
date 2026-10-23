import { NextRequest, NextResponse } from "next/server";
import { extractIntraProfile } from "@/lib/intra/extract-profile";
import { createSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { verifyBridgeSignature } from "@/lib/auth-hmac";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { profile, accessToken, code, ts, sig } = body || {};

    // 1. Verify HMAC signature if provided
    if (code && ts && sig) {
      const isValid = verifyBridgeSignature(code, ts, sig);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid or expired bridge handshake signature" },
          { status: 401 }
        );
      }
    }

    let rawMe = profile;

    const FORTY_TWO_API_BASE = (
      process.env.FORTY_TWO_API_BASE || "https://42beirut-worker.pages.dev"
    ).replace(/\/+$/, "");

    // 2. ONLY attempt server-side fetch if profile was NOT provided by browser and accessToken is present
    if (!rawMe && accessToken) {
      console.warn("Profile not provided by browser, attempting server-side /v2/me fallback via proxy...");
      const meRes = await fetch(`${FORTY_TWO_API_BASE}/v2/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "User-Agent": "PrintCV/1.0 (contact: info@printcv.me)",
        },
      });

      if (!meRes.ok) {
        const errText = await meRes.text();
        console.error("Developer Intra /v2/me fetch in bridge-complete failed:", errText);
        return NextResponse.json(
          { error: `Server profile fetch failed (${meRes.status}). Ensure browser fetches profile directly.` },
          { status: meRes.status }
        );
      }

      rawMe = await meRes.json();
    }

    if (!rawMe || !rawMe.login) {
      return NextResponse.json(
        { error: "Invalid profile payload. Expected valid Developer Intra profile from browser." },
        { status: 400 }
      );
    }

    // 3. Transform raw Developer Intra profile into standard MockIntraUser format
    const studentProfile = extractIntraProfile(rawMe);

    // 4. Persist or update student in Neon PostgreSQL database
    try {
      await prisma.user.upsert({
        where: { login: studentProfile.login },
        update: {
          name: studentProfile.displayname,
          email: studentProfile.email,
          image: studentProfile.image,
          currentLevel: studentProfile.level,
          grade: studentProfile.grade,
          campusName: studentProfile.campusName,
          lastSyncedAt: new Date(),
        },
        create: {
          intraId: studentProfile.id,
          login: studentProfile.login,
          name: studentProfile.displayname,
          email: studentProfile.email,
          image: studentProfile.image,
          campusName: studentProfile.campusName,
          currentLevel: studentProfile.level,
          grade: studentProfile.grade,
          poolMonth: studentProfile.poolMonth,
          poolYear: studentProfile.poolYear,
        },
      });
    } catch (dbErr) {
      console.warn("Non-fatal: Database persistence skipped in bridge-complete:", dbErr);
    }

    // 5. Save session in cache and generate sid
    const sid = createSession(studentProfile);

    const response = NextResponse.json({
      success: true,
      sid,
      user: studentProfile,
    });

    // 6. Set forty_two_sid session cookie
    response.cookies.set("forty_two_sid", sid, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    // 7. Clear one-time bridge ticket cookie if present
    response.cookies.delete("forty_two_bridge_ticket");

    return response;
  } catch (err: any) {
    console.error("Bridge complete error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to finalize OAuth session" },
      { status: 500 }
    );
  }
}
