import test from "node:test";
import assert from "node:assert/strict";

import {
  createSessionToken,
  publicUser,
  verifySessionToken,
} from "../api/_lib/auth.js";
import {
  methodNotAllowed,
  parseCookies,
  sessionCookie,
} from "../api/_lib/http.js";

test("session tokens round-trip and reject tampering", () => {
  const previousSecret = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "test-secret-that-is-long-enough-for-tests";

  try {
    const user = {
      id: "user-1",
      email: "member@example.com",
      name: "測試成員",
      role: "member",
    };
    const token = createSessionToken(user);

    assert.deepEqual(verifySessionToken(token), user);
    assert.equal(verifySessionToken(`${token}tampered`), null);
  } finally {
    if (previousSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previousSecret;
  }
});

test("publicUser never lowers administrator permissions", () => {
  assert.deepEqual(
    publicUser({
      id: "admin",
      email: "admin@example.com",
      name: "Admin",
      role: "admin",
      can_view: false,
      can_edit: false,
      email_verified: false,
    }),
    {
      id: "admin",
      email: "admin@example.com",
      name: "Admin",
      memberNumber: "",
      organizationName: "",
      role: "admin",
      canView: true,
      canEdit: true,
      emailVerified: true,
    },
  );
});

test("cookie helpers preserve signed values and security attributes", () => {
  const cookie = sessionCookie("payload.signature", 3600);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.equal(parseCookies(cookie).eztodo_session, "payload.signature");
});

test("methodNotAllowed exposes an Allow header", async () => {
  const response = methodNotAllowed(["GET", "POST"]);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, POST");
  assert.equal((await response.json()).code, "METHOD_NOT_ALLOWED");
});

