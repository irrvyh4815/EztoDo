import {
  ensureSchema,
  findUserByEmail,
  listProjectMembers,
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

function projectIdFromUrl(url) {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const projectIndex = parts.indexOf("projects");
  return projectIndex >= 0 ? decodeURIComponent(parts[projectIndex + 1] || "") : "";
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
    if (!["GET", "POST"].includes(request.method)) {
      return methodNotAllowed(["GET", "POST"]);
    }

    try {
      await ensureSchema();
      const projectId = projectIdFromUrl(request.url);
      if (!projectId) {
        throw new ApiError(400, "缺少工地 ID", "PROJECT_ID_REQUIRED");
      }

      if (request.method === "GET") {
        await requireProjectAccess(request, projectId, "view");
        return json({ members: await listProjectMembers(projectId) });
      }

      const { user } = await requireProjectAccess(request, projectId, "manage");
      const body = await readJson(request);
      if (!body.email?.trim()) {
        throw new ApiError(400, "請輸入已註冊帳號 Email", "MEMBER_EMAIL_REQUIRED");
      }

      const memberUser = await findUserByEmail(body.email);
      if (!memberUser) {
        throw new ApiError(
          404,
          "找不到此 Email 的註冊帳號，請先請對方完成註冊。",
          "MEMBER_USER_NOT_FOUND",
        );
      }

      await upsertProjectMember(projectId, memberUser.id, {
        role: normalizeRole(body.role),
        canView: true,
        canEdit: body.role === "viewer" ? Boolean(body.canEdit) : true,
        canViewClaims: body.canViewClaims !== false,
        canViewContracts: body.canViewContracts !== false,
        jobTitle: normalizeJobTitle(body.jobTitle),
        createdBy: user.id,
      });

      return json({ members: await listProjectMembers(projectId) }, 201);
    } catch (error) {
      return jsonError(error);
    }
  },
};
