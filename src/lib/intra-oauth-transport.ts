import http2 from "node:http2";
import tls from "node:tls";
import { execFile } from "node:child_process";

export interface TransportResponse {
  transport: string;
  status: number;
  data?: any;
  rawBody: string;
  passedCloudflare: boolean;
  error?: string;
}

const CHROME_CIPHERS =
  "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305";

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export function isCloudflareBlocked(status: number, body: string): boolean {
  return (
    status === 403 ||
    body.includes("Just a moment...") ||
    body.includes("<!DOCTYPE html>") ||
    body.includes("<title>Attention Required") ||
    body.includes("<html")
  );
}

export const FORTY_TWO_API_BASE = (
  process.env.FORTY_TWO_API_BASE || "https://42beirut-worker.pages.dev"
).replace(/\/+$/, "");

// 1. Native node:http2 with Chrome TLS 1.3/1.2 cipher & ALPN h2 emulation
export function requestHttp2(
  method: "GET" | "POST",
  path: string,
  bodyString?: string,
  userAgent: string = CHROME_UA,
  extraHeaders: Record<string, string> = {}
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    let client: http2.ClientHttp2Session | null = null;
    const timeout = setTimeout(() => {
      if (client && !client.closed) client.destroy();
      reject(new Error("HTTP/2 connection timeout (8s)"));
    }, 8000);

    try {
      const urlObj = new URL(FORTY_TWO_API_BASE);
      const isHttps = urlObj.protocol === "https:";
      const targetHost = urlObj.hostname;
      const targetPort = urlObj.port ? parseInt(urlObj.port, 10) : (isHttps ? 443 : 80);

      client = http2.connect(FORTY_TWO_API_BASE, {
        createConnection: () =>
          tls.connect({
            host: targetHost,
            port: targetPort,
            servername: targetHost,
            ALPNProtocols: ["h2", "http/1.1"],
            ciphers: CHROME_CIPHERS,
            ecdhCurve: "X25519:P-256:P-384",
            minVersion: "TLSv1.2",
            maxVersion: "TLSv1.3",
          }),
      });

      client.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      const headers: Record<string, string | number> = {
        ":method": method,
        ":path": path,
        ":scheme": urlObj.protocol.replace(":", ""),
        ":authority": targetHost,
        accept: "application/json",
        "user-agent": userAgent,
        ...extraHeaders,
      };

      if (bodyString && method === "POST") {
        headers["content-type"] = "application/x-www-form-urlencoded";
        headers["content-length"] = Buffer.byteLength(bodyString);
      }

      const req = client.request(headers);

      let status = 0;
      req.on("response", (resHeaders) => {
        status = Number(resHeaders[":status"] || 0);
      });

      let resData = "";
      req.on("data", (chunk) => {
        resData += chunk.toString();
      });

      req.on("end", () => {
        clearTimeout(timeout);
        if (client && !client.closed) client.close();
        resolve({ status, body: resData });
      });

      req.on("error", (err) => {
        clearTimeout(timeout);
        if (client && !client.closed) client.destroy();
        reject(err);
      });

      if (bodyString && method === "POST") {
        req.write(bodyString);
      }
      req.end();
    } catch (e) {
      clearTimeout(timeout);
      if (client && !client.closed) client.destroy();
      reject(e);
    }
  });
}

// 2. System curl subprocess (installed on AWS Lambda / Netlify Linux)
export function requestCurl(
  method: "GET" | "POST",
  path: string,
  bodyString?: string,
  extraHeaders: Record<string, string> = {}
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const url = `${FORTY_TWO_API_BASE}${path}`;
    const args = ["-s", "-i", "-X", method, url, "-H", "Accept: application/json"];
    for (const [k, v] of Object.entries(extraHeaders)) {
      args.push("-H", `${k}: ${v}`);
    }
    if (bodyString && method === "POST") {
      args.push("-H", "Content-Type: application/x-www-form-urlencoded");
      args.push("-d", bodyString);
    }

    execFile("curl", args, { timeout: 8000 }, (err, stdout) => {
      if (err && !stdout) {
        return reject(err);
      }
      const raw = stdout || "";
      const headerEndIndex =
        raw.indexOf("\r\n\r\n") !== -1 ? raw.indexOf("\r\n\r\n") : raw.indexOf("\n\n");
      let status = 0;
      let body = raw;
      if (headerEndIndex !== -1) {
        const headerBlock = raw.slice(0, headerEndIndex);
        body = raw.slice(headerEndIndex).trim();
        const statusMatch = headerBlock.match(/HTTP\/[\d.]+\s+(\d+)/);
        if (statusMatch) {
          status = parseInt(statusMatch[1], 10);
        }
      }
      resolve({ status, body });
    });
  });
}

// 3. Standard Node undici fetch
export async function requestFetch(
  method: "GET" | "POST",
  path: string,
  bodyString?: string,
  extraHeaders: Record<string, string> = {}
): Promise<{ status: number; body: string }> {
  const url = `${FORTY_TWO_API_BASE}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "42Beirut-Recruit/1.0 (contact: info@42beirut.com)",
    ...extraHeaders,
  };
  if (bodyString && method === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: bodyString && method === "POST" ? bodyString : undefined,
  });

  const body = await res.text();
  return { status: res.status, body };
}

// Unified multi-transport token exchange
export async function exchange42TokenOnServer(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<TransportResponse> {
  const bodyString = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: params.clientId,
    client_secret: params.clientSecret,
    code: params.code,
    redirect_uri: params.redirectUri,
  }).toString();

  const basicAuth = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64");
  const authHeaders = {
    authorization: `Basic ${basicAuth}`,
  };

  const transportAttempts: {
    name: string;
    fn: () => Promise<{ status: number; body: string }>;
  }[] = [
    {
      name: "proxy-fetch",
      fn: () => requestFetch("POST", "/oauth/token", bodyString, { Authorization: `Basic ${basicAuth}` }),
    },
    {
      name: "proxy-curl",
      fn: () => requestCurl("POST", "/oauth/token", bodyString, { Authorization: `Basic ${basicAuth}` }),
    },
    {
      name: "http2-chrome-tls",
      fn: () => requestHttp2("POST", "/oauth/token", bodyString, CHROME_UA, authHeaders),
    },
  ];

  let lastResponse: TransportResponse | null = null;

  for (const attempt of transportAttempts) {
    try {
      const res = await attempt.fn();
      const isBlocked = isCloudflareBlocked(res.status, res.body);

      let parsedData: any = null;
      try {
        parsedData = JSON.parse(res.body);
      } catch {
        // Not JSON
      }

      const passed = !isBlocked && (res.status === 200 || (parsedData && parsedData.error));

      const transportResult: TransportResponse = {
        transport: attempt.name,
        status: res.status,
        data: parsedData,
        rawBody: res.body,
        passedCloudflare: Boolean(passed),
      };

      if (passed && res.status === 200) {
        return transportResult;
      }

      // If we got a real OAuth error JSON from 42 Intra (e.g. invalid_grant), we bypassed Cloudflare!
      if (passed && parsedData?.error) {
        transportResult.error = parsedData.error_description || parsedData.error;
        return transportResult;
      }

      lastResponse = transportResult;
    } catch (err: any) {
      lastResponse = {
        transport: attempt.name,
        status: 0,
        rawBody: "",
        passedCloudflare: false,
        error: err.message || "Transport error",
      };
    }
  }

  return (
    lastResponse || {
      transport: "none",
      status: 500,
      rawBody: "",
      passedCloudflare: false,
      error: "All server transports failed",
    }
  );
}

// Unified multi-transport profile fetch
export async function fetch42ProfileOnServer(accessToken: string): Promise<any> {
  const authHeaders = {
    authorization: `Bearer ${accessToken}`,
  };

  const attempts: (() => Promise<{ status: number; body: string }>)[] = [
    () => requestFetch("GET", "/v2/me", undefined, { Authorization: `Bearer ${accessToken}` }),
    () => requestCurl("GET", "/v2/me", undefined, { Authorization: `Bearer ${accessToken}` }),
    () => requestHttp2("GET", "/v2/me", undefined, CHROME_UA, authHeaders),
  ];

  for (const fn of attempts) {
    try {
      const res = await fn();
      if (!isCloudflareBlocked(res.status, res.body)) {
        const json = JSON.parse(res.body);
        if (json && json.login) {
          return json;
        }
      }
    } catch {
      // try next
    }
  }

  return null;
}
