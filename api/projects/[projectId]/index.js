import { deleteProject, ensureSchema, updateProjectCalendarColor } from "../../_lib/db.js";
import { ApiError, json, jsonError, methodNotAllowed, readJson } from "../../_lib/http.js";
import { requireProjectAccess } from "../../_lib/permissions.js";

export default {
  async fetch(request) {
    if (!["DELETE", "PATCH"].includes(request.method)) return methodNotAllowed(["DELETE", "PATCH"]);

    try {
      await ensureSchema();

      const projectId = new URL(request.url).pathname.split("/").pop();
      await requireProjectAccess(request, projectId, "manage");
      if (request.method === "PATCH") {
        const { calendarColor } = await readJson(request);
        if (typeof calendarColor !== "string" || !/^#[0-9a-f]{6}$/i.test(calendarColor)) {
          throw new ApiError(400, "請選擇有效的工地顏色", "INVALID_CALENDAR_COLOR");
        }
        const project = await updateProjectCalendarColor(projectId, calendarColor.toLowerCase());
        if (!project) throw new ApiError(404, "找不到工地資料", "PROJECT_NOT_FOUND");
        return json({ project });
      }
      const deleted = await deleteProject(projectId);

      if (!deleted) {
        throw new ApiError(404, "找不到工地資料", "PROJECT_NOT_FOUND");
      }

      return json({ ok: true });
    } catch (error) {
      return jsonError(error);
    }
  },
};
