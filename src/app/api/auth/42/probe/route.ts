import { NextResponse } from "next/server";
import {
  requestHttp2,
  requestCurl,
  requestFetch,
  isCloudflareBlocked,
} from "@/lib/intra-oauth-transport";

export const dynamic = "force-dynamic";

export async function GET() {
  const dummyBody = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: "probe_client_id",
    client_secret: "probe_client_secret",
    code: "probe_code_test",
    redirect_uri: "https://42beirut-recruit.netlify.app/api/auth/callback/42-school",
  }).toString();

  const dummyBasicAuth = Buffer.from("probe_client_id:probe_client_secret").toString("base64");
  const authHeaders = { authorization: `Basic ${dummyBasicAuth}` };

  const testList = [
    {
      name: "cloudflare-pages-proxy",
      fn: () => requestFetch("POST", "/oauth/token", dummyBody, { Authorization: `Basic ${dummyBasicAuth}` }),
    },
    {
      name: "proxy-curl",
      fn: () => requestCurl("POST", "/oauth/token", dummyBody, { Authorization: `Basic ${dummyBasicAuth}` }),
    },
    {
      name: "http2-chrome-tls",
      fn: () => requestHttp2("POST", "/oauth/token", dummyBody, undefined, authHeaders),
    },
  ];

  const results = [];
  let anyPassed = false;
  let recommended = "none";

  for (const test of testList) {
    const started = Date.now();
    try {
      const res = await test.fn();
      const durationMs = Date.now() - started;
      const isBlocked = isCloudflareBlocked(res.status, res.body);

      let parsed: any = null;
      try {
        parsed = JSON.parse(res.body);
      } catch {
        // Not JSON
      }

      // If status is 401 and response is JSON from 42 Intra, Cloudflare was 100% bypassed!
      const passed = !isBlocked && (res.status === 401 || res.status === 200 || (parsed && parsed.error));

      if (passed && !anyPassed) {
        anyPassed = true;
        recommended = test.name;
      }

      results.push({
        transport: test.name,
        status: res.status,
        passedCloudflare: Boolean(passed),
        durationMs,
        preview: res.body.slice(0, 120),
      });
    } catch (err: any) {
      results.push({
        transport: test.name,
        status: 0,
        passedCloudflare: false,
        durationMs: Date.now() - started,
        error: err.message || "Failed",
      });
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    anyPassed,
    recommendedTransport: recommended,
    results,
  });
}
