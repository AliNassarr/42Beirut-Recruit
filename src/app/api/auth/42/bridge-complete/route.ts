import { NextRequest, NextResponse } from "next/server";
import { extractIntraProfile } from "@/lib/intra/extract-profile";
import { createSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { accessToken, profile } = body;

    let rawMe = profile;

    // If profile not provided by browser, fetch /v2/me using accessToken
    if (!rawMe && accessToken) {
      const meRes = await fetch("https://api.intra.42.fr/v2/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "User-Agent": "42Beirut-Recruit/1.0 (contact: info@42beirut.com)",
        },
      });

      if (!meRes.ok) {
        const errText = await meRes.text();
        console.error("42 /v2/me fetch in bridge-complete failed:", errText);
        return NextResponse.json(
          { error: `Failed to fetch 42 profile (${meRes.status})` },
          { status: meRes.status }
        );
      }

      rawMe = await meRes.json();
    }

    if (!rawMe || !rawMe.login) {
      return NextResponse.json(
        { error: "Invalid student profile received from 42 Intra" },
        { status: 400 }
      );
    }

    // Transform into standard MockIntraUser format
    const studentProfile = extractIntraProfile(rawMe);

    // Persist or update student in Neon PostgreSQL database
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

    // Save session in cache and generate sid
    const sid = createSession(studentProfile);

    const response = NextResponse.json({
      success: true,
      sid,
      user: studentProfile,
    });

    // Set forty_two_sid session cookie
    response.cookies.set("forty_two_sid", sid, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    // Clear one-time bridge ticket cookie
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
