import { randomBytes, randomUUID } from "node:crypto";
import { ensureSchema, query } from "../_lib/db.js";
import { requireProjectAccess } from "../_lib/permissions.js";
import { calendarToken } from "../_lib/calendar-feed.js";
import { ApiError, json, jsonError, methodNotAllowed, readJson } from "../_lib/http.js";

export default {
  async fetch(request) {
    if (!["GET", "POST"].includes(request.method)) return methodNotAllowed(["GET", "POST"]);
    try {
      if (request.method === "POST") {
        const origin = request.headers.get("origin");
        if (origin && origin !== new URL(request.url).origin) throw new ApiError(403, "不允許跨網站操作", "INVALID_ORIGIN");
        if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new ApiError(415, "請使用 JSON 格式", "INVALID_CONTENT_TYPE");
      }
      await ensureSchema();
      const body = request.method === "POST" ? await readJson(request) : {};
      const projectId = body.projectId || new URL(request.url).searchParams.get("projectId");
      if (typeof projectId !== "string" || !projectId) throw new ApiError(400, "請選擇工地", "PROJECT_REQUIRED");
      const { user } = await requireProjectAccess(request, projectId, "view");
      if (request.method === "POST") {
        if (!["enable", "rotate", "disable"].includes(body.action)) throw new ApiError(400, "不支援的操作", "INVALID_ACTION");
        if (body.action === "disable") {
          await query("delete from calendar_subscriptions where user_id = $1 and project_id = $2", [user.id, projectId]);
          return json({ enabled: false }, 200, { "Cache-Control": "no-store" });
        }
        if (body.consent !== true) throw new ApiError(400, "請確認私密訂閱連結的資料分享範圍", "CONSENT_REQUIRED");
        if (!process.env.AUTH_SECRET) throw new ApiError(503, "尚未設定行事曆訂閱服務", "CALENDAR_SECRET_MISSING");
        // Enabling twice is idempotent; only explicit rotation revokes a live link.
        await query(`insert into calendar_subscriptions (id, user_id, project_id, nonce)
          values ($1, $2, $3, $4)
          on conflict (user_id, project_id) do update set nonce = case when $5 then excluded.nonce else calendar_subscriptions.nonce end`,
          [randomUUID(), user.id, projectId, randomBytes(32).toString("hex"), body.action === "rotate"]);
      }
      const result = await query("select * from calendar_subscriptions where user_id = $1 and project_id = $2", [user.id, projectId]);
      const row = result.rows[0];
      return json(row ? { enabled: true, token: calendarToken(row) } : { enabled: false }, 200, { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    } catch (error) { const response = jsonError(error); response.headers.set("Cache-Control", "no-store"); return response; }
  },
};
