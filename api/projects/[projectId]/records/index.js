import {
  ensureSchema,
  insertProjectRecord,
  listProjectRecords,
} from "../../../_lib/db.js";
import {
  ApiError,
  json,
  jsonError,
  methodNotAllowed,
  readJson,
} from "../../../_lib/http.js";
import { requireProjectAccess, requireProjectModuleAccess } from "../../../_lib/permissions.js";

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
