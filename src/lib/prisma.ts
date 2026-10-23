import { PrismaClient } from "@prisma/client";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";

// Configure WebSocket constructor for Node.js environments where globalThis.WebSocket is undefined
if (typeof globalThis.WebSocket === "undefined" && typeof window === "undefined") {
  try {
    const ws = require("ws");
    neonConfig.webSocketConstructor = ws;
  } catch {
    // Edge environments (Cloudflare Workers, Vercel Edge) have native WebSocket support
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@ep-empty.us-east-2.aws.neon.tech/neondb?sslmode=require";

  try {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
  } catch (err) {
    console.warn("[prisma] Failed to initialize PrismaNeon adapter:", err);
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
