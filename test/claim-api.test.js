import test from "node:test";
import assert from "node:assert/strict";
import createHandler from "../api/projects/[projectId]/records/index.js";
import updateHandler from "../api/projects/[projectId]/records/[recordId].js";
import { createSessionToken } from "../api/_lib/auth.js";

test("claim API recalculates totals, checks contract project/access and rejects unapproved extras", async () => {
  const old = { pool: globalThis.__eztodoPool, schema: globalThis.__eztodoSchemaPromise, db: process.env.DATABASE_URL, secret: process.env.AUTH_SECRET };
  const user = { id: "tester", role: "member", can_view: true, can_edit: true };
  let viewContracts = true, edit = true;
  const contract = { id: "c", project_id: "p", module: "contracts", payload: { amount: 100000, variations: [{ id: "v", title: "追加", amount: 20000, status: "已核准" }, { id: "pending", title: "未核准", amount: 30000, status: "待核准" }] } };
  const rows = [contract];
  try {
    process.env.DATABASE_URL = "postgres://localhost/test"; process.env.AUTH_SECRET = "synthetic-claims-secret";
    globalThis.__eztodoSchemaPromise = Promise.resolve();
    globalThis.__eztodoPool = { async query(sql, params) {
      if (sql === "select * from users where id = $1") return { rows: [user] };
      if (sql.includes("select p.id as project_id")) return { rows: [{ project_id: params[0], member_role: "editor", can_view: true, can_edit: edit, can_view_claims: true, can_view_contracts: viewContracts }] };
      if (sql.startsWith("select * from project_records")) return { rows: rows.filter(row => row.project_id === params[0] && row.id === params[1]) };
      if (sql.includes("insert into project_records")) { const [id, project_id, module, title, status, payload] = params; const row = { id, project_id, module, title, status, payload: JSON.parse(payload) }; rows.push(row); return { rows: [row] }; }
      if (sql.startsWith("update project_records")) { const row = rows.find(row => row.project_id === params[0] && row.id === params[1]); row.payload = JSON.parse(params[4]); return { rows: [row] }; }
      throw new Error("Unexpected query");
    } };
    const payload = { accountingVersion: 2, sourceType: "contract", contractId: "c", vendor: "測試廠商", month: "2026/09", grossAmount: 999, netAmount: 999, details: [{ item: "點工", category: "daywork", budgetSource: "variation", variationId: "v", pricingMode: "quantity", quantity: 3, unit: "人日", unitPrice: 2000, amount: 1 }] };
    const request = (body = payload, project = "p", id = "", module = "claims") => new Request(`http://local.test/api/projects/${project}/records${id ? `/${id}` : ""}`, { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json", cookie: `eztodo_session=${createSessionToken(user)}` }, body: JSON.stringify({ module, title: "測試紀錄", payload: body }) });
    assert.equal((await createHandler.fetch(request())).status, 201);
    assert.equal(rows[1].payload.grossAmount, 6000); assert.equal(rows[1].payload.netAmount, 6000);
    assert.equal(rows[1].payload.contractAmount, 120000);
    assert.equal((await updateHandler.fetch(request({ ...payload, details: [{ ...payload.details[0], quantity: 4 }] }, "p", rows[1].id))).status, 200);
    assert.equal(rows[1].payload.grossAmount, 8000);
    assert.equal((await createHandler.fetch(request({ ...payload, details: [{ ...payload.details[0], variationId: "pending" }] }))).status, 400);
    assert.equal((await createHandler.fetch(request(payload, "other-project"))).status, 400);
    assert.equal((await updateHandler.fetch(request({ ...payload, retentionAmount: 10000 }, "p", rows[1].id))).status, 400);
    assert.equal((await updateHandler.fetch(request({ ...contract.payload, variationVersion: 1, variations: [{ id: "bad", title: "減帳", amount: -200000, status: "已核准" }] }, "p", "c", "contracts"))).status, 400);
    viewContracts = false;
    assert.equal((await createHandler.fetch(request())).status, 403);
    edit = false;
    assert.equal((await updateHandler.fetch(request(payload, "p", rows[1].id))).status, 403);
  } finally {
    globalThis.__eztodoPool = old.pool; globalThis.__eztodoSchemaPromise = old.schema;
    if (old.db === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = old.db;
    if (old.secret === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = old.secret;
  }
});
