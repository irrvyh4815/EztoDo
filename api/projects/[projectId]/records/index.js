import {
  ensureSchema,
  insertProjectRecord,
  listProjectRecords,
  getProjectRecord,
} from "../../../_lib/db.js";
import {
  ApiError,
  json,
  jsonError,
  methodNotAllowed,
  readJson,
} from "../../../_lib/http.js";
import { requireProjectAccess, requireProjectModuleAccess } from "../../../_lib/permissions.js";
import { normalizePersonnel } from "../../../../shared/personnel.js";
import { normalizeTimedTask } from "../../../../shared/taskTiming.js";
import { normalizeClaim, normalizeVariations } from "../../../../shared/claimAccounting.js";

function projectIdFromUrl(url) {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const projectIndex = parts.indexOf("projects");
  return projectIndex >= 0 ? decodeURIComponent(parts[projectIndex + 1] || "") : "";
}

export default {
  async fetch(request) {
    if (!["GET", "POST"].includes(request.method)) {
      return methodNotAllowed(["GET", "POST"]);
    }

    try {
      await ensureSchema();

      const projectId = projectIdFromUrl(request.url);
      if (!projectId) {
        throw new ApiError(400, "缺少工地 ID", "PROJECT_ID_REQUIRED");
      }

      const { user } = await requireProjectAccess(
        request,
        projectId,
        request.method === "GET" ? "view" : "edit",
      );

      if (request.method === "GET") {
        const module = new URL(request.url).searchParams.get("module");
        await requireProjectModuleAccess(request, projectId, module, "view");
        return json({ records: await listProjectRecords(projectId, module) });
      }

      const body = await readJson(request);
      if (!body.module?.trim()) {
        throw new ApiError(400, "缺少模組名稱", "MODULE_REQUIRED");
      }
      if (!body.title?.trim()) {
        throw new ApiError(400, "缺少資料標題", "RECORD_TITLE_REQUIRED");
      }
      await requireProjectModuleAccess(request, projectId, body.module, "edit");
      if (body.module === "contracts" && body.payload?.variationVersion === 1) {
        try { body.payload.variations = normalizeVariations(body.payload); }
        catch (error) { throw new ApiError(400, error.message, "INVALID_VARIATION"); }
      }
      if (body.module === "claims" && body.payload?.accountingVersion === 2) {
        let contract = null;
        if (body.payload.sourceType === "contract") {
          await requireProjectModuleAccess(request, projectId, "contracts", "view");
          contract = await getProjectRecord(projectId, body.payload.contractId);
          if (contract?.module !== "contracts") throw new ApiError(400, "找不到連結合約", "INVALID_CONTRACT");
          contract = { ...contract.payload, id: contract.id };
        }
        try { body.payload = normalizeClaim(body.payload, contract); }
        catch (error) { throw new ApiError(400, error.message, "INVALID_CLAIM"); }
      }
      if (["memos", "todos"].includes(body.module) && body.payload?.timingVersion === 1) {
        try { body.payload = normalizeTimedTask(body.payload, body.module); }
        catch (error) { throw new ApiError(400, error.message, "INVALID_TASK_TIMING"); }
        body.title = body.payload.title;
      }
      if (body.module === "personnel") {
        try { body.payload = normalizePersonnel(body.payload); }
        catch (error) { throw new ApiError(400, error.message, "INVALID_PERSONNEL"); }
        body.title = body.payload.name;
        body.status = body.payload.status;
      }

      return json(
        {
          record: await insertProjectRecord(projectId, body, user.id),
        },
        201,
      );
    } catch (error) {
      return jsonError(error);
    }
  },
};
