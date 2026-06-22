import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { ApiError, parseCookies, SESSION_COOKIE } from "./http.js";

const textEncoder = new TextEncoder();

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64url(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;

  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw new ApiError(500, "尚未設定 AUTH_SECRET", "AUTH_SECRET_MISSING");
  }

  return "local-development-only-change-me";
}

function sign(payload) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function safeEqual(a, b) {
  const left = textEncoder.encode(a);
  const right = textEncoder.encode(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function publicUser(user) {
  const isAdmin = user.role === "admin";
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    memberNumber: user.member_no ?? user.memberNumber ?? "",
    organizationName: user.organization_name ?? user.organizationName ?? "",
    role: user.role,
    canView: isAdmin ? true : user.can_view ?? user.canView ?? true,
    canEdit: isAdmin ? true : user.can_edit ?? user.canEdit ?? false,
    emailVerified: isAdmin ? true : Boolean(user.email_verified ?? user.emailVerified ?? false),
  };
}

export function emailVerificationRequired() {
  const configured = process.env.EMAIL_VERIFICATION_REQUIRED;
  if (configured === undefined || configured === "") {
    return Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");
  }
  return String(configured).toLowerCase() === "true";
}

export function createSessionToken(user) {
  const days = Number(process.env.SESSION_DAYS || 7);
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      memberNumber: user.member_no ?? user.memberNumber ?? "",
      organizationName: user.organization_name ?? user.organizationName ?? "",
      role: user.role,
      iat: now,
      exp: now + days * 24 * 60 * 60,
    }),
  );

  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token) {
  if (!token || !token.includes(".")) return null;

  const [payload, signature] = token.split(".");
  if (!safeEqual(sign(payload), signature)) return null;

  try {
    const session = JSON.parse(fromBase64url(payload));
    if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) return null;

    return {
      id: session.sub,
      email: session.email,
      name: session.name,
      role: session.role,
    };
  } catch {
    return null;
  }
}

export function requireUser(request) {
  const cookies = parseCookies(request.headers.get("cookie") || "");
  const user = verifySessionToken(cookies[SESSION_COOKIE]);

  if (!user) {
    throw new ApiError(401, "請先登入", "UNAUTHENTICATED");
  }

  return user;
}

export function sessionMaxAgeSeconds() {
  return Number(process.env.SESSION_DAYS || 7) * 24 * 60 * 60;
}
