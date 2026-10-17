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

console.log("Client ID:", clientId.slice(0, 15) + "..." + clientId.slice(-5), "Length:", clientId.length);
console.log("Client Secret:", clientSecret.slice(0, 15) + "..." + clientSecret.slice(-5), "Length:", clientSecret.length);

// Method 1: Client credentials in body (application/x-www-form-urlencoded)
console.log("\n--- Testing Method 1: Body parameters ---");
const res1 = await fetch("https://api.intra.42.fr/oauth/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code: "dummy_test_code_12345",
    redirect_uri: "http://localhost:3000/api/auth/callback/42-school",
  }),
});

console.log("Status 1:", res1.status);
const data1 = await res1.text();
console.log("Body 1:", data1);

// Method 2: Basic Auth header (RFC 6749 standard)
console.log("\n--- Testing Method 2: Basic Auth Header ---");
const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
const res2 = await fetch("https://api.intra.42.fr/oauth/token", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: `Basic ${basicAuth}`,
  },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    code: "dummy_test_code_12345",
    redirect_uri: "http://localhost:3000/api/auth/callback/42-school",
  }),
});

console.log("Status 2:", res2.status);
const data2 = await res2.text();
console.log("Body 2:", data2);
