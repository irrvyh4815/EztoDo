import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/projects/[projectId]/index.js";
import projectsHandler from "../api/projects/index.js";
import { createSessionToken } from "../api/_lib/auth.js";

test("calendar endpoints require login and color updates require project management access", async () => {
  const original = { pool: globalThis.__eztodoPool, schema: globalThis.__eztodoSchemaPromise, database: process.env.DATABASE_URL, secret: process.env.AUTH_SECRET };
  const user = { id: "member", name: "Test", email: "member@example.test", role: "member", can_view: true, can_edit: true };
  let membership = { member_role: "viewer", can_view: true, can_edit: false };
  const updates = [];
  try {
    process.env.DATABASE_URL = "postgres://localhost/test";
    process.env.AUTH_SECRET = "local-calendar-test-secret";
    globalThis.__eztodoSchemaPromise = Promise.resolve();
    globalThis.__eztodoPool = { async query(sql, params) {
      if (sql === "select * from users where id = $1") return { rows: [user] };
      if (sql.includes("select p.id as project_id")) return { rows: [{ project_id: params[0], ...membership }] };
      if (sql.startsWith("update projects set calendar_color")) {
        updates.push(params);
        return { rows: [{ id: params[0], calendar_color: params[1] }] };
      }
      throw new Error(`Unexpected database operation: ${sql}`);
    } };
    const headers = { "Content-Type": "application/json", cookie: `eztodo_session=${createSessionToken(user)}` };
    const request = (color) => new Request("http://local.test/api/projects/project-a", { method: "PATCH", headers, body: JSON.stringify({ calendarColor: color, name: "must not overwrite" }) });
    assert.equal((await projectsHandler.fetch(new Request("http://local.test/api/projects?calendar=1"))).status, 401);
    assert.equal((await handler.fetch(request("#2563eb"))).status, 403);
    membership = { member_role: null, can_view: false };
    assert.equal((await handler.fetch(request("#2563eb"))).status, 403);
    assert.equal(updates.length, 0);
    membership = { member_role: "manager", can_view: true, can_edit: true };
    assert.equal((await handler.fetch(request("red"))).status, 400);
    assert.equal((await handler.fetch(request("#fff;"))).status, 400);
    const response = await handler.fetch(request("#E11D48"));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { project: { id: "project-a", calendarColor: "#e11d48" } });
    assert.deepEqual(updates, [["project-a", "#e11d48"]]);
  } finally {
    for (const [key, value] of [["DATABASE_URL", original.database], ["AUTH_SECRET", original.secret]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    if (original.pool === undefined) delete globalThis.__eztodoPool; else globalThis.__eztodoPool = original.pool;
    if (original.schema === undefined) delete globalThis.__eztodoSchemaPromise; else globalThis.__eztodoSchemaPromise = original.schema;
  }
});
