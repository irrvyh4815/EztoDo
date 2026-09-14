import test from "node:test";
import assert from "node:assert/strict";
import createHandler from "../api/projects/[projectId]/records/index.js";
import updateHandler from "../api/projects/[projectId]/records/[recordId].js";
import { createSessionToken } from "../api/_lib/auth.js";
import { listCalendarRecords, listNotificationRecords } from "../api/_lib/db.js";

test("task API validates schedules, persists reminder types and preserves access boundaries", async () => {
  const previous = { pool: globalThis.__eztodoPool, schema: globalThis.__eztodoSchemaPromise, database: process.env.DATABASE_URL, secret: process.env.AUTH_SECRET };
  const user = { id: "staff", role: "member", can_view: true, can_edit: true };
  let canEdit = true;
  const rows = [], sqls = [];
  try {
    process.env.DATABASE_URL = "postgres://localhost/test";
    process.env.AUTH_SECRET = "local-task-timing-secret";
    globalThis.__eztodoSchemaPromise = Promise.resolve();
    globalThis.__eztodoPool = { async query(sql, params) {
      sqls.push(sql);
      if (sql === "select * from users where id = $1") return { rows: [user] };
      if (sql.includes("select p.id as project_id")) return { rows: [{ project_id: params[0], member_role: "editor", can_view: true, can_edit: canEdit }] };
      if (sql.includes("insert into project_records")) {
        const [id, project_id, module, title, status, payload] = params;
        const row = { id, project_id, module, title, status, payload: JSON.parse(payload), attachments: [] };
        rows.push(row); return { rows: [row] };
      }
      if (sql.startsWith("select * from project_records")) return { rows: rows.filter(row => row.project_id === params[0] && row.id === params[1]) };
      if (sql.startsWith("update project_records")) {
        const row = rows.find(row => row.project_id === params[0] && row.id === params[1]);
        Object.assign(row, { title: params[2], status: params[3], payload: JSON.parse(params[4]) }); return { rows: [row] };
      }
      if (sql.includes("from project_records r")) return { rows: [] };
      throw new Error("Unexpected query");
    } };
    const payload = { timingVersion: 1, title: "合成待辦", date: "2026-09-20", time: "09:00", reminderMinutes: 60 };
    const request = (project, method, body = payload, id = "", module = "todos") => new Request(`http://local.test/api/projects/${project}/records${id ? `/${id}` : ""}`, {
      method, headers: { "Content-Type": "application/json", cookie: `eztodo_session=${createSessionToken(user)}` },
      body: JSON.stringify({ module, title: body.title, payload: body }),
    });
    assert.equal((await createHandler.fetch(request("a", "POST"))).status, 201);
    assert.equal(rows[0].payload.reminderMinutes, 60);
    const id = rows[0].id;
    assert.equal((await updateHandler.fetch(request("a", "PATCH", { ...payload, noDeadline: true }, id))).status, 200);
    assert.equal(rows[0].payload.date, ""); assert.equal(rows[0].payload.reminderMinutes, null);
    assert.equal((await updateHandler.fetch(request("a", "PATCH", { ...payload, reminderMinutes: -1 }, id))).status, 400);
    assert.equal((await createHandler.fetch(request("a", "POST", { ...payload, trade: "防水", startDate: "2026-09-20", startTime: "09:00", endDate: "2026-09-19", endTime: "17:00" }, "", "memos"))).status, 400);
    assert.equal((await updateHandler.fetch(request("b", "PATCH", payload, id))).status, 404);
    canEdit = false;
    assert.equal((await createHandler.fetch(request("a", "POST"))).status, 403);
    assert.equal((await updateHandler.fetch(request("a", "PATCH", payload, id))).status, 403);
    await listNotificationRecords(user); await listCalendarRecords(user);
    const notifications = sqls.find(sql => sql.includes('as "timingVersion"'));
    assert.match(notifications, /payload->'reminderMinutes'/); // Keep null vs numbers, never stringify.
    assert.match(notifications, /payload->'noDeadline'/);
    assert.match(notifications, /pm.can_view = true/);
    const calendar = sqls.find(sql => sql.includes('as detail'));
    assert.match(calendar, /payload->>'endTime'/);
    assert.match(calendar, /payload->'noDeadline'/);
    assert.doesNotMatch(calendar, /r\.attachments|r\.payload,/);
  } finally {
    for (const [key, value] of [["DATABASE_URL", previous.database], ["AUTH_SECRET", previous.secret]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    globalThis.__eztodoPool = previous.pool; globalThis.__eztodoSchemaPromise = previous.schema;
  }
});
