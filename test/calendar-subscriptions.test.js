import test from "node:test";
import assert from "node:assert/strict";
import subscriptions from "../api/calendar/subscriptions.js";
import feed from "../api/calendar/feed.js";
import { createSessionToken } from "../api/_lib/auth.js";

test("subscriptions default off, isolate users/projects, require consent and revoke on disable/rotation/access loss", async () => {
  const old = { pool: globalThis.__eztodoPool, schema: globalThis.__eztodoSchemaPromise, database: process.env.DATABASE_URL, secret: process.env.AUTH_SECRET };
  const users = ["one", "two"].map(id => ({ id, role: "member", can_view: true, can_edit: false }));
  const rows = new Map(); let allowed = true, recordReads = 0;
  try {
    process.env.DATABASE_URL = "postgres://localhost/test";
    process.env.AUTH_SECRET = "synthetic-endpoint-test-secret";
    globalThis.__eztodoSchemaPromise = Promise.resolve();
    globalThis.__eztodoPool = { async query(sql, params) {
      if (sql === "select * from users where id = $1") return { rows: users.filter(u => u.id === params[0]) };
      if (sql.includes("select p.id as project_id")) return { rows: [{ project_id: params[0], member_role: allowed ? "viewer" : null, can_view: allowed, can_edit: false }] };
      if (sql.startsWith("insert into calendar_subscriptions")) {
        const [id, user_id, project_id, nonce, rotate] = params, key = `${user_id}:${project_id}`;
        const existing = rows.get(key);
        rows.set(key, existing ? { ...existing, nonce: rotate ? nonce : existing.nonce } : { id, user_id, project_id, nonce });
        return { rows: [] };
      }
      if (sql.startsWith("delete from calendar_subscriptions")) { rows.delete(params.join(":")); return { rows: [] }; }
      if (sql.startsWith("select * from calendar_subscriptions")) return { rows: [rows.get(params.join(":"))].filter(Boolean) };
      if (sql.startsWith("select s.*")) {
        assert.match(sql, /u.can_view = true and pm.can_view = true/);
        assert.match(sql, /pm.user_id = s.user_id and pm.project_id = s.project_id/);
        return { rows: allowed ? [...rows.values()].filter(row => row.id === params[0] && users.find(u => u.id === row.user_id)?.can_view).map(row => ({ ...row, name: "合成工地" })) : [] };
      }
      if (sql.includes("from project_records")) {
        assert.match(sql, /where project_id = \$1 and module in/);
        recordReads++;
        return { rows: [{ id: "event", project_id: params[0], module: "todos", payload: { date: "2026-09-10", title: "本機合成資料" } }] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    } };
    const request = (user, project = "p", action, extra = {}) => new Request(`https://local.test/api/calendar/subscriptions?projectId=${project}`, {
      method: action ? "POST" : "GET",
      headers: { "Content-Type": "application/json", ...(user ? { cookie: `eztodo_session=${createSessionToken(user)}` } : {}) },
      ...(action ? { body: JSON.stringify({ projectId: project, action, consent: true, ...extra }) } : {}),
    });
    const invoke = (...args) => subscriptions.fetch(request(...args));
    const refresh = (token, method = "GET") => feed.fetch(new Request(`https://local.test/api/calendar/feed?token=${encodeURIComponent(token)}`, { method }));
    assert.equal((await invoke(null)).status, 401);
    assert.deepEqual(await (await invoke(users[0])).json(), { enabled: false });
    assert.equal((await invoke(users[0], "p", "enable", { consent: false })).status, 400);
    assert.equal(rows.size, 0);
    const enabled = await invoke(users[0], "p", "enable", { userId: "two" });
    assert.equal(enabled.headers.get("cache-control"), "no-store");
    const { token } = await enabled.json();
    assert.ok(token);
    assert.deepEqual(await (await invoke(users[1])).json(), { enabled: false });
    assert.deepEqual(await (await invoke(users[0], "q")).json(), { enabled: false });
    assert.equal((await (await invoke(users[0], "p", "enable")).json()).token, token);
    const valid = await refresh(token);
    assert.equal(valid.status, 200);
    assert.match(valid.headers.get("content-type"), /text\/calendar/);
    assert.match(valid.headers.get("cache-control"), /no-store/);
    assert.match(await valid.text(), /BEGIN:VEVENT/);
    assert.equal(await (await refresh(token, "HEAD")).text(), "");
    const reads = recordReads;
    assert.equal((await refresh(token.slice(0, -1) + (token.endsWith("a") ? "b" : "a"))).status, 404);
    assert.equal(recordReads, reads);
    allowed = false;
    assert.equal((await refresh(token)).status, 404);
    assert.equal((await invoke(users[0], "p", "enable")).status, 403);
    allowed = true; users[0].can_view = false;
    assert.equal((await refresh(token)).status, 404);
    users[0].can_view = true;
    const rotated = (await (await invoke(users[0], "p", "rotate")).json()).token;
    assert.notEqual(rotated, token);
    assert.equal((await refresh(token)).status, 404);
    assert.equal((await refresh(rotated)).status, 200);
    await invoke(users[1], "p", "disable");
    assert.equal((await refresh(rotated)).status, 200);
    await invoke(users[0], "p", "disable");
    assert.equal((await refresh(rotated)).status, 404);
    assert.equal((await refresh("invalid")).status, 404);
    assert.equal((await refresh(rotated, "POST")).status, 405);
    const crossOrigin = request(users[0], "p", "enable"); crossOrigin.headers.set("Origin", "https://evil.test");
    assert.equal((await subscriptions.fetch(crossOrigin)).status, 403);
    const plain = request(users[0], "p", "enable"); plain.headers.set("Content-Type", "text/plain");
    assert.equal((await subscriptions.fetch(plain)).status, 415);
  } finally {
    for (const [key, value] of [["DATABASE_URL", old.database], ["AUTH_SECRET", old.secret]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (old.pool === undefined) delete globalThis.__eztodoPool; else globalThis.__eztodoPool = old.pool;
    if (old.schema === undefined) delete globalThis.__eztodoSchemaPromise; else globalThis.__eztodoSchemaPromise = old.schema;
  }
});
