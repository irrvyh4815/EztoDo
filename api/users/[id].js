import { hashPassword, requireUser } from "../_lib/auth.js";
import {
  deleteUser,
  ensureSchema,
  updateUserPassword,
  updateUserPermissions,
  updateUserProfile,
} from "../_lib/db.js";
import {
  ApiError,
  json,
  jsonError,
  methodNotAllowed,
  readJson,
} from "../_lib/http.js";

function requireAdmin(request) {
  const user = requireUser(request);
  if (user.role !== "admin") {
    throw new ApiError(403, "需要管理員權限", "ADMIN_REQUIRED");
  }
  return user;
}

export default {
  async fetch(request) {
    if (!["PATCH", "DELETE"].includes(request.method)) {
      return methodNotAllowed(["PATCH", "DELETE"]);
    }

    try {
      requireAdmin(request);
      await ensureSchema();

      const id = new URL(request.url).pathname.split("/").pop();

      if (request.method === "DELETE") {
        const deleted = await deleteUser(id);
        if (!deleted) {
          throw new ApiError(404, "找不到可刪除的帳號", "USER_NOT_FOUND");
        }
        return json({ ok: true });
      }

      const body = await readJson(request);
      if (body.password) {
        if (body.password.length < 8) {
          throw new ApiError(400, "密碼至少需要 8 碼", "PASSWORD_TOO_SHORT");
        }

        const user = await updateUserPassword(id, await hashPassword(body.password));
        if (!user) {
          throw new ApiError(404, "找不到帳號", "USER_NOT_FOUND");
        }

        return json({ user });
      }

      if (typeof body.name === "string") {
        const name = body.name.trim();
        if (!name) {
          throw new ApiError(400, "請輸入暱稱", "USER_NAME_REQUIRED");
        }

        const user = await updateUserProfile(id, { name });
        if (!user) {
          throw new ApiError(404, "找不到帳號", "USER_NOT_FOUND");
        }

        return json({ user });
      }

      const user = await updateUserPermissions(id, {
        role: body.role,
        canView: body.canView,
        canEdit: body.canEdit,
      });

      if (!user) {
        throw new ApiError(404, "找不到帳號", "USER_NOT_FOUND");
      }

      return json({ user });
    } catch (error) {
      return jsonError(error);
    }
  },
};
