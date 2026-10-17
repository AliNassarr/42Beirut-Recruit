import { MockIntraUser } from "@/lib/intra/mock-data";

// Server-side in-memory + file-backed session cache
// Survives page navigations, hot reloads, and avoids browser 4KB cookie size limits
const globalForSessions = globalThis as unknown as {
  fortyTwoSessions?: Map<string, { user: MockIntraUser; expiresAt: number }>;
};

if (!globalForSessions.fortyTwoSessions) {
  globalForSessions.fortyTwoSessions = new Map();
}

const sessions = globalForSessions.fortyTwoSessions;

function getSafeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "sid_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadFileCache() {
  try {
    if (typeof process !== "undefined" && process.cwd) {
      const fs = require("fs");
      const path = require("path");
      const cacheFile = path.join(process.cwd(), ".sessions-cache.json");
      if (fs.existsSync(cacheFile)) {
        const data = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
        const now = Date.now();
        for (const [sid, entry] of Object.entries(data as Record<string, { user: MockIntraUser; expiresAt: number }>)) {
          if (entry.expiresAt > now && !sessions.has(sid)) {
            sessions.set(sid, entry);
          }
        }
      }
    }
  } catch {
    // Silently continue with in-memory map
  }
}

function saveFileCache() {
  try {
    if (typeof process !== "undefined" && process.cwd) {
      const fs = require("fs");
      const path = require("path");
      const cacheFile = path.join(process.cwd(), ".sessions-cache.json");
      const obj: Record<string, { user: MockIntraUser; expiresAt: number }> = {};
      const now = Date.now();
      for (const [sid, entry] of sessions.entries()) {
        if (entry.expiresAt > now) {
          obj[sid] = entry;
        }
      }
      fs.writeFileSync(cacheFile, JSON.stringify(obj, null, 2), "utf-8");
    }
  } catch {
    // Non-fatal if filesystem write fails
  }
}

// Initial load
loadFileCache();

export function createSession(user: MockIntraUser): string {
  const sid = getSafeUuid();
  // 24 hours expiry
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  sessions.set(sid, { user, expiresAt });
  saveFileCache();
  return sid;
}

export function getSession(sid: string | undefined): MockIntraUser | null {
  if (!sid) return null;

  let entry = sessions.get(sid);
  if (!entry) {
    loadFileCache();
    entry = sessions.get(sid);
  }

  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    sessions.delete(sid);
    saveFileCache();
    return null;
  }
  return entry.user;
}

export function deleteSession(sid: string | undefined): void {
  if (sid) {
    sessions.delete(sid);
    saveFileCache();
  }
}
