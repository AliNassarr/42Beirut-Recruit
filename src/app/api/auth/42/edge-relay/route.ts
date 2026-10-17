export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { client_id, client_secret, code, redirect_uri } = body;

    if (!code || !client_id || !client_secret) {
      return new Response(
        JSON.stringify({ error: "Missing required OAuth parameters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const basicAuth = btoa(`${client_id}:${client_secret}`);

    // Token exchange via Netlify Edge network (BoringSSL Anycast IP)
    const tokenRes = await fetch("https://api.intra.42.fr/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": "42Beirut-Recruit/1.0 (Netlify Edge Network)",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id,
        client_secret,
        code,
        redirect_uri,
      }),
    });

    const status = tokenRes.status;
    const responseText = await tokenRes.text();

    return new Response(responseText, {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Edge relay failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
