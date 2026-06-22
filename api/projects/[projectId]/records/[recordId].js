import {
  deleteProjectRecord,
  ensureSchema,
  getProjectRecord,
  updateProjectRecord,
} from "../../../_lib/db.js";
import {
  ApiError,
  json,
  jsonError,
  methodNotAllowed,
  readJson,
} from "../../../_lib/http.js";
import { requireProjectAccess, requireProjectModuleAccess } from "../../../_lib/permissions.js";

function idsFromUrl(url) {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const projectIndex = parts.indexOf("projects");
  const recordsIndex = parts.indexOf("records");

  return {
    projectId: projectIndex >= 0 ? decodeURIComponent(parts[projectIndex + 1] || "") : "",
    recordId: recordsIndex >= 0 ? decodeURIComponent(parts[recordsIndex + 1] || "") : "",
  };
}

export default {
  async fetch(request) {
    if (!["PATCH", "DELETE"].includes(request.method)) {
      return methodNotAllowed(["PATCH", "DELETE"]);
    }

    try {
      await ensureSchema();

      const { projectId, recordId } = idsFromUrl(request.url);
      if (!projectId || !recordId) {
        throw new ApiError(400, "缺少工地或紀錄 ID", "RECORD_ID_REQUIRED");
      }

      await requireProjectAccess(request, projectId, "edit");
      const existingRecord = await getProjectRecord(projectId, recordId);
      if (!existingRecord) {
        throw new ApiError(404, "找不到紀錄", "RECORD_NOT_FOUND");
      }
      await requireProjectModuleAccess(request, projectId, existingRecord.module, "edit");

      if (request.method === "PATCH") {
        const body = await readJson(request);
        if (!body.title?.trim()) {
          throw new ApiError(400, "請輸入紀錄標題", "RECORD_TITLE_REQUIRED");
        }

        const record = await updateProjectRecord(projectId, recordId, body);

        return json({ record });
      }

      const deleted = await deleteProjectRecord(projectId, recordId);
      if (!deleted) {
        throw new ApiError(404, "找不到紀錄", "RECORD_NOT_FOUND");
      }

      return json({ ok: true });
    } catch (error) {
      return jsonError(error);
    }
  },
};
