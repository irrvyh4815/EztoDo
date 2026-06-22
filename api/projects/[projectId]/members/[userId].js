import {
  ensureSchema,
  listProjectMembers,
  removeProjectMember,
  upsertProjectMember,
} from "../../../_lib/db.js";
import {
  ApiError,
  json,
  jsonError,
  methodNotAllowed,
  readJson,
} from "../../../_lib/http.js";
import { requireProjectAccess } from "../../../_lib/permissions.js";

function idsFromUrl(url) {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const projectIndex = parts.indexOf("projects");
  const membersIndex = parts.indexOf("members");
  return {
    projectId: projectIndex >= 0 ? decodeURIComponent(parts[projectIndex + 1] || "") : "",
    userId: membersIndex >= 0 ? decodeURIComponent(parts[membersIndex + 1] || "") : "",
  };
}

function normalizeRole(role) {
  return ["manager", "editor", "viewer"].includes(role) ? role : "viewer";
}

function normalizeJobTitle(jobTitle) {
  const clean = String(jobTitle || "").trim();
  return clean || "現場工程師";
}

export default {
  async fetch(request) {
    if (!["PATCH", "DELETE"].includes(request.method)) {
      return methodNotAllowed(["PATCH", "DELETE"]);
    }

    try {
      await ensureSchema();
      const { projectId, userId } = idsFromUrl(request.url);
      if (!projectId || !userId) {
        throw new ApiError(400, "缺少工地或成員 ID", "PROJECT_MEMBER_ID_REQUIRED");
      }

      await requireProjectAccess(request, projectId, "manage");

      if (request.method === "DELETE") {
        const removed = await removeProjectMember(projectId, userId);
        if (!removed) {
          throw new ApiError(400, "無法移除此工地成員", "PROJECT_MEMBER_REMOVE_FAILED");
        }
        return json({ members: await listProjectMembers(projectId) });
      }

      const body = await readJson(request);
      await upsertProjectMember(projectId, userId, {
        role: normalizeRole(body.role),
        canView: true,
        canEdit: body.role === "viewer" ? Boolean(body.canEdit) : true,
        canViewClaims: body.canViewClaims !== false,
        canViewContracts: body.canViewContracts !== false,
        jobTitle: normalizeJobTitle(body.jobTitle),
      });

      return json({ members: await listProjectMembers(projectId) });
    } catch (error) {
      return jsonError(error);
    }
  },
};
