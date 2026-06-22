import test from "node:test";
import assert from "node:assert/strict";

import healthHandler from "../api/health.js";
import uploadsHandler from "../api/uploads/index.js";

test("health endpoint reports configuration without exposing values", async () => {
  const response = await healthHandler.fetch(
    new Request("http://local.test/api/health"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(typeof body.ok, "boolean");
  assert.deepEqual(Object.keys(body.services).sort(), [
    "ai",
    "auth",
    "database",
    "email",
    "uploads",
  ]);
  assert.equal(JSON.stringify(body).includes("postgres://"), false);
});

test("upload capability endpoint is readable without authentication", async () => {
  const response = await uploadsHandler.fetch(
    new Request("http://local.test/api/uploads"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.maxFileBytes, 4 * 1024 * 1024);
  assert.deepEqual(body.acceptedTypes, [
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);
});

test("upload endpoint rejects unsupported methods", async () => {
  const response = await uploadsHandler.fetch(
    new Request("http://local.test/api/uploads", { method: "DELETE" }),
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, POST");
});

