import test from "node:test";
import assert from "node:assert/strict";
import { normalizePersonnel } from "../shared/personnel.js";
import createHandler from "../api/projects/[projectId]/records/index.js";
import updateHandler from "../api/projects/[projectId]/records/[recordId].js";
import { createSessionToken } from "../api/_lib/auth.js";

const person = { name: " 測試人員 ", jobTitle: "現場工程師", organization: "測試單位", experienceYears: "5.5", workSummary: "品質查验", expertise: "工務協調", certificates: [{ name: "測試證照", issuer: "測試單位", number: "TEST-001", expiresAt: "2028-02-29" }] };

test("personnel preserves experience, certificates and departure history with meaningful validation", () => {
  const normalized = normalizePersonnel(person);
  assert.equal(normalized.name, "測試人員");
  assert.equal(normalized.experienceYears, 5.5);
  assert.equal(normalized.certificates[0].expiresAt, "2028-02-29");
  assert.equal(normalizePersonnel({ ...person, experienceYears: "" }).experienceYears, "");
  assert.equal(normalizePersonnel({ ...person, status: "已離場", startDate: "2026-01-01", endDate: "2026-09-09" }).status, "已離場");
  for (const years of [-1, "abc", Infinity, [], true]) assert.throws(() => normalizePersonnel({ ...person, experienceYears: years }), /年資/);
  assert.throws(() => normalizePersonnel({ ...person, name: " " }), /姓名/);
  assert.throws(() => normalizePersonnel({ ...person, startDate: "2026-02-30" }), /日期/);
  assert.throws(() => normalizePersonnel({ ...person, startDate: "2026-10-01", endDate: "2026-09-01" }), /早於/);
  assert.throws(() => normalizePersonnel({ ...person, certificates: [{ name: "" }] }), /證照名稱/);
});

test("personnel API creates and updates isolated project records and rejects unauthorized writes", async () => {
  const previous = { pool: globalThis.__eztodoPool, schema: globalThis.__eztodoSchemaPromise, database: process.env.DATABASE_URL, secret: process.env.AUTH_SECRET };
  const user = { id: "staff", role: "member", name: "Test", email: "staff@example.test", can_view: true, can_edit: true };
  let canEdit = true;
  const rows = [];
  try {
    process.env.DATABASE_URL = "postgres://localhost/test";
    process.env.AUTH_SECRET = "local-personnel-tests-secret";
    globalThis.__eztodoSchemaPromise = Promise.resolve();
    globalThis.__eztodoPool = { async query(sql, params) {
      if (sql === "select * from users where id = $1") return { rows: [user] };
      if (sql.includes("select p.id as project_id")) return { rows: [{ project_id: params[0], member_role: "editor", can_view: params[0] !== "forbidden", can_edit: canEdit }] };
      if (sql.includes("insert into project_records")) {
        const [id, project_id, module, title, status, payload] = params;
        const row = { id, project_id, module, title, status, payload: JSON.parse(payload), attachments: [] };
        rows.push(row); return { rows: [row] };
      }
      if (sql.startsWith("select * from project_records")) return { rows: rows.filter((row) => row.project_id === params[0] && (sql.includes("id = $2") ? row.id === params[1] : row.module === params[1])) };
      if (sql.startsWith("update project_records")) {
        const row = rows.find((row) => row.project_id === params[0] && row.id === params[1]);
        Object.assign(row, { title: params[2], status: params[3], payload: JSON.parse(params[4]) }); return { rows: [row] };
      }
      throw new Error("Unexpected database operation");
    } };
    const request = (project, method = "POST", payload = person, recordId = "") => new Request(`http://local.test/api/projects/${project}/records${recordId ? `/${recordId}` : "?module=personnel"}`, {
      method, headers: { "Content-Type": "application/json", cookie: `eztodo_session=${createSessionToken(user)}` },
      ...(method !== "GET" ? { body: JSON.stringify({ module: "personnel", title: payload.name, payload }) } : {}),
    });
    assert.equal((await createHandler.fetch(request("a"))).status, 201);
    assert.equal(rows[0].payload.experienceYears, 5.5);
    assert.equal(rows[0].module, "personnel");
    const id = rows[0].id;
    assert.equal((await updateHandler.fetch(request("a", "PATCH", { ...person, status: "已離場" }, id))).status, 200);
    assert.equal(rows[0].status, "已離場");
    assert.deepEqual((await (await createHandler.fetch(request("b", "GET"))).json()).records, []);
    assert.equal((await updateHandler.fetch(request("b", "PATCH", person, id))).status, 404);
    assert.equal((await createHandler.fetch(request("forbidden", "GET"))).status, 403);
    assert.equal((await createHandler.fetch(request("a", "POST", { ...person, experienceYears: -1 }))).status, 400);
    canEdit = false;
    assert.equal((await createHandler.fetch(request("a"))).status, 403);
    assert.equal((await updateHandler.fetch(request("a", "PATCH", person, id))).status, 403);
    assert.equal(rows.length, 1);
  } finally {
    for (const [key, value] of [["DATABASE_URL", previous.database], ["AUTH_SECRET", previous.secret]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (previous.pool === undefined) delete globalThis.__eztodoPool; else globalThis.__eztodoPool = previous.pool;
    if (previous.schema === undefined) delete globalThis.__eztodoSchemaPromise; else globalThis.__eztodoSchemaPromise = previous.schema;
  }
});
