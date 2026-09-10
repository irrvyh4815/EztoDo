import { ensureSchema, insertProject, listProjects, listCalendarRecords, listNotificationRecords } from "../_lib/db.js";
import {
  ApiError,
  json,
  jsonError,
  methodNotAllowed,
  readJson,
} from "../_lib/http.js";
import { requirePermission } from "../_lib/permissions.js";

export default {
  async fetch(request) {
    if (!["GET", "POST"].includes(request.method)) {
      return methodNotAllowed(["GET", "POST"]);
    }

    try {
      await ensureSchema();
      const user = await requirePermission(request, request.method === "GET" ? "view" : "edit");

      if (request.method === "GET") {
        if (new URL(request.url).searchParams.get("notifications") === "1") {
          const [projects, notifications] = await Promise.all([listProjects(user), listNotificationRecords(user)]);
          return json({ projects, notifications });
        }
        if (new URL(request.url).searchParams.get("calendar") === "1") {
          const [projects, events] = await Promise.all([listProjects(user), listCalendarRecords(user)]);
          return json({ projects, events });
        }
        return json({ projects: await listProjects(user) });
      }

      const body = await readJson(request);
      if (!body.name?.trim()) {
        throw new ApiError(400, "請輸入工地名稱", "PROJECT_NAME_REQUIRED");
      }

      const project = await insertProject(body, user.id);
      return json(
        {
          project: {
            ...project,
            createdByName: user.name,
            createdByEmail: user.email,
          },
        },
        201,
      );
    } catch (error) {
      return jsonError(error);
    }
  },
};
