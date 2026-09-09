import test from "node:test";
import assert from "node:assert/strict";
import { groupHomeProjects, isProjectCreator } from "../src/projectGroups.js";
import handler from "../api/projects/[projectId]/index.js";
import { createSessionToken } from "../api/_lib/auth.js";
import { requireProjectAccess } from "../api/_lib/permissions.js";

test("home groups by creator identity rather than management role or display name", () => {
  const projects = [
    { id: "own", createdBy: "me", memberRole: "owner" },
    { id: "invite", createdBy: "someone", memberRole: "manager", canManage: true },
    { id: "editor", createdBy: "someone", memberRole: "editor" },
    { id: "viewer", createdBy: "someone", memberRole: "viewer" },
    { id: "legacy", ownerId: "me", memberRole: "owner" },
    { id: "admin", createdBy: "someone", memberRole: "admin" },
  ];
  assert.deepEqual(groupHomeProjects(projects, "me").map((g) => g.projects.map((p) => p.id)), [
    ["own", "legacy"], ["invite", "editor", "viewer"], ["admin"],
  ]);
  assert.equal(isProjectCreator({ createdBy: "someone", ownerId: "me" }, "me"), false);
  assert.equal(isProjectCreator({}, undefined), false);
  assert.equal(groupHomeProjects([], "me").length, 2);
});

test("invited managers and non-creator admins cannot delete projects; editing still works", async () => {
  const previous = { pool: globalThis.__eztodoPool, schema: globalThis.__eztodoSchemaPromise, database: process.env.DATABASE_URL, secret: process.env.AUTH_SECRET };
  let user = { id: "member", name: "Test", email: "member@example.test", role: "member", can_view: true, can_edit: true };
  let access = { created_by: "creator", owner_id: "creator", member_role: "manager", can_view: true, can_edit: true };
  const deletes = [];
  try {
    process.env.DATABASE_URL = "postgres://localhost/test";
    process.env.AUTH_SECRET = "local-project-ownership-test-secret";
    globalThis.__eztodoSchemaPromise = Promise.resolve();
    globalThis.__eztodoPool = { async query(sql, params) {
      if (sql === "select * from users where id = $1") return { rows: [user] };
      if (sql.includes("select p.id as project_id")) return { rows: [{ project_id: params[0], ...access }] };
      if (sql.startsWith("delete from projects")) {
        assert.match(sql, /coalesce\(created_by, owner_id\) = \$2/);
        deletes.push(params);
        return { rowCount: 1, rows: [] };
      }
      throw new Error("Unexpected query");
    } };
    const request = () => new Request("http://local.test/api/projects/test-project", { method: "DELETE", headers: { cookie: `eztodo_session=${createSessionToken(user)}` } });
    let response = await handler.fetch(request());
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "PROJECT_CREATOR_REQUIRED");
    assert.equal((await requireProjectAccess(request(), "test-project", "edit")).user.id, "member");
    access.member_role = "editor";
    assert.equal((await handler.fetch(request())).status, 403);
    assert.equal((await requireProjectAccess(request(), "test-project", "edit")).user.id, "member");
    user.role = "admin";
    assert.equal((await handler.fetch(request())).status, 403);
    assert.equal(deletes.length, 0);
    user = { ...user, id: "creator", role: "member" };
    access.member_role = "owner";
    assert.equal((await handler.fetch(request())).status, 200);
    assert.deepEqual(deletes, [["test-project", "creator"]]);
  } finally {
    for (const [key, value] of [["DATABASE_URL", previous.database], ["AUTH_SECRET", previous.secret]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    if (previous.pool === undefined) delete globalThis.__eztodoPool; else globalThis.__eztodoPool = previous.pool;
    if (previous.schema === undefined) delete globalThis.__eztodoSchemaPromise; else globalThis.__eztodoSchemaPromise = previous.schema;
  }
});
