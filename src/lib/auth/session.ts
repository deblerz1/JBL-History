import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "jbl_museum_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

function requiredSecret(name: "JBL_ACCESS_CODE" | "JBL_SESSION_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function signature(expiresAt: string) {
  return createHmac("sha256", requiredSecret("JBL_SESSION_SECRET")).update(`jbl-history:${expiresAt}`).digest("base64url");
}

export function credentialsMatch(candidate: string) { return safeEqual(candidate, requiredSecret("JBL_ACCESS_CODE")); }

export async function setLeagueSession() {
  const expiresAt = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  (await cookies()).set(COOKIE_NAME, `${expiresAt}.${signature(expiresAt)}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_SECONDS, priority: "high" });
}

export async function isLeagueSessionValid() {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) return false;
  const [expiresAt, suppliedSignature, ...extra] = value.split(".");
  if (!expiresAt || !suppliedSignature || extra.length || !/^\d+$/.test(expiresAt) || Number(expiresAt) <= Date.now() / 1000) return false;
  try { return safeEqual(suppliedSignature, signature(expiresAt)); } catch { return false; }
}

export async function clearLeagueSession() { (await cookies()).delete(COOKIE_NAME); }
