import test from "node:test";
import assert from "node:assert/strict";
import { draftKey, readDraft, persistentAttachment, needsRecords, localMonth, workspaceHash, parseWorkspaceHash } from "../src/workspaceUX.js";
import { createRecordCache } from "../src/recordCache.js";
import projectsHandler from "../api/projects/index.js";
import { listNotificationRecords } from "../api/_lib/db.js";
import { createSessionToken } from "../api/_lib/auth.js";

test("drafts are isolated by account/project/module and tolerate corrupt storage", () => {
  const keys = [draftKey("a", "p", "daily"), draftKey("b", "p", "daily"), draftKey("a", "q", "daily"), draftKey("a", "p", "personnel")];
  assert.equal(new Set(keys).size, 4);
  assert.equal(draftKey(null, "p", "daily"), null);
  assert.equal(readDraft({ getItem: () => "broken" }, keys[0]), null);
  assert.equal(readDraft({ getItem: () => { throw new Error("blocked"); } }, keys[0]), null);
  assert.deepEqual(readDraft({ getItem: () => JSON.stringify({ version: 1, data: { dailyNote: "文字" } }) }, keys[0]), { dailyNote: "文字" });
  assert.equal(persistentAttachment({ url: "blob:temporary" }), null);
  assert.equal(persistentAttachment({ url: "https://example.test/photo", file: {} }), null);
  assert.deepEqual(persistentAttachment({ url: "https://example.test/photo", name: "saved" }), { url: "https://example.test/photo", name: "saved" });
});

test("workspace routes round-trip and resource requests match the active module", () => {
  assert.deepEqual(parseWorkspaceHash(workspaceHash("a/b 工地", "personnel")), { projectId: "a/b 工地", module: "personnel" });
  assert.equal(parseWorkspaceHash("").projectId, null);
  assert.equal(localMonth(new Date(2028, 0, 1)), "2028-01");
  assert.equal(localMonth(new Date(2026, 11, 31)), "2026-12");
  assert.ok(needsRecords("daily", "commonSettings"));
  assert.ok(!needsRecords("daily", "contracts"));
  assert.ok(!needsRecords("personnel", "daily"));
  assert.ok(!needsRecords("dashboard", "operationLogs"));
});

test("record cache coalesces requests, separates scopes and clears on mutation/session change", async () => {
  const cache = createRecordCache();
  let calls = 0;
  const fetcher = async () => ++calls;
  assert.deepEqual(await Promise.all([cache.read("a", fetcher), cache.read("a", fetcher)]), [1, 1]);
  assert.equal(await cache.read("a", fetcher), 1);
  assert.equal(await cache.read("b", fetcher), 2);
  cache.clear();
  assert.equal(await cache.read("a", fetcher), 3);
  await assert.rejects(cache.read("error", () => Promise.reject(new Error("offline"))));
  assert.equal(await cache.read("error", fetcher), 4);
  const expired = createRecordCache(-1);
  await expired.read("a", fetcher);
  await expired.read("a", fetcher);
  assert.equal(calls, 6);
});

test("notification aggregation requires account access and queries only allowed projects and fields", async () => {
  const previous = { pool: globalThis.__eztodoPool, schema: globalThis.__eztodoSchemaPromise, db: process.env.DATABASE_URL, secret: process.env.AUTH_SECRET };
  try {
    process.env.DATABASE_URL = "postgres://localhost/test";
    process.env.AUTH_SECRET = "ux-tests-secret";
    globalThis.__eztodoSchemaPromise = Promise.resolve();
    const user = { id: "viewer", role: "member", can_view: true };
    const sqls = [];
    globalThis.__eztodoPool = { async query(sql, params) {
      sqls.push({ sql, params });
      if (sql === "select * from users where id = $1") return { rows: [user] };
      return { rows: [] };
    } };
    assert.equal((await projectsHandler.fetch(new Request("http://test/api/projects?notifications=1"))).status, 401);
    const request = () => new Request("http://test/api/projects?notifications=1", { headers: { cookie: `eztodo_session=${createSessionToken(user)}` } });
    assert.equal((await projectsHandler.fetch(request())).status, 200);
    user.can_view = false;
    assert.equal((await projectsHandler.fetch(request())).status, 403);
    await listNotificationRecords({ id: "viewer", role: "member" });
    const query = sqls.find(item => item.sql.includes("r.payload->>'meetingType'"));
    assert.deepEqual(query.params, ["viewer", "member"]);
    assert.match(query.sql, /pm\.can_view = true/);
    assert.match(query.sql, /r\.module in \('announcements', 'defects', 'meetings', 'todos', 'memos'\)/);
    assert.doesNotMatch(query.sql, /select \*|r\.attachments|r\.payload,/);
  } finally {
    globalThis.__eztodoPool = previous.pool; globalThis.__eztodoSchemaPromise = previous.schema;
    if (previous.db === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous.db;
    if (previous.secret === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = previous.secret;
  }
});
