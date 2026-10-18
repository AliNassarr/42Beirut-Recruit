import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/auth-session";

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sidParam = searchParams.get("sid");
  const sidCookie = req.cookies.get("forty_two_sid")?.value;
  const legacyCookie = req.cookies.get("forty_two_session")?.value;

  const sid = sidParam || sidCookie;

  if (sid) {
    const user = getSession(sid);
    if (user) {
      return NextResponse.json({ authenticated: true, user, sid });
    }
  }

  // Fallback to legacy cookie if present
  if (legacyCookie) {
    try {
      const user = JSON.parse(legacyCookie);
      return NextResponse.json({ authenticated: true, user });
    } catch {
      // ignore parsing error
    }
  }

  return NextResponse.json({ authenticated: false, user: null });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sidParam = searchParams.get("sid");
  const sidCookie = req.cookies.get("forty_two_sid")?.value;
  const sid = sidParam || sidCookie;

  if (sid) {
    deleteSession(sid);
  }

  const res = NextResponse.json({ success: true });
  res.cookies.delete("forty_two_sid");
  res.cookies.delete("forty_two_session");
  return res;
}
