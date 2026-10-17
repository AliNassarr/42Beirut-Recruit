import { readFileSync } from "fs";

const env = readFileSync(".env", "utf-8");
let clientId = "";
let clientSecret = "";

for (const line of env.split("\n")) {
  const trimmed = line.trim();
  if (trimmed.startsWith("FORTY_TWO_CLIENT_ID=")) {
    clientId = trimmed.slice("FORTY_TWO_CLIENT_ID=".length).replace(/^["']|["']$/g, "").trim();
  }
  if (trimmed.startsWith("FORTY_TWO_CLIENT_SECRET=")) {
    clientSecret = trimmed.slice("FORTY_TWO_CLIENT_SECRET=".length).replace(/^["']|["']$/g, "").trim();
  }
}

console.log("Client ID Length:", clientId.length, "Value:", clientId);
console.log("Client Secret Length:", clientSecret.length);

const redirectUri = "http://localhost:3000/api/auth/callback/42-school";
const authUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=public`;

console.log("\nTesting Auth URL:\n", authUrl);

try {
  const res = await fetch(authUrl);
  console.log("\nResponse Status:", res.status);
  const html = await res.text();
  if (html.includes("Client authentication failed") || html.includes("An error has occurred")) {
    console.log("\n[ERROR DETECTED] 42 Intra rejected the client ID!");
    // Extract error text
    const titleMatch = html.match(/<h[12][^>]*>(.*?)<\/h[12]>/i);
    const pMatch = html.match(/<p[^>]*>(.*?)<\/p>/i);
    console.log("Title:", titleMatch?.[1]);
    console.log("Description:", pMatch?.[1]);
  } else {
    console.log("\n[SUCCESS] 42 Intra accepted the request! Page title/content:");
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    console.log("Title:", titleMatch?.[1]);
  }
} catch (e) {
  console.error("Fetch error:", e.message);
}
