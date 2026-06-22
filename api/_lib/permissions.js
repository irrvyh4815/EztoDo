import { requireUser } from "./auth.js";
import { findUserById, getProjectAccess } from "./db.js";
import { ApiError } from "./http.js";

function assertAccountPermission(user, permission) {
  if (user.role === "admin") return;

  if (permission === "view" && !user.can_view) {
    throw new ApiError(403, "此帳號尚未開啟閱覽權限", "VIEW_PERMISSION_REQUIRED");
  }

  if ((permission === "edit" || permission === "manage") && !user.can_edit) {
    throw new ApiError(403, "此帳號尚未開啟編輯權限", "EDIT_PERMISSION_REQUIRED");
  }
}

export async function requirePermission(request, permission) {
  const sessionUser = requireUser(request);
  const user = await findUserById(sessionUser.id);

  if (!user) {
    throw new ApiError(401, "請重新登入", "SESSION_USER_NOT_FOUND");
  }

  assertAccountPermission(user, permission);

  return user;
}

export async function requireProjectAccess(request, projectId, permission = "view") {
  const user = await requirePermission(request, permission === "manage" ? "edit" : permission);
  const access = await getProjectAccess(projectId, user.id);

  if (!access) {
    throw new ApiError(404, "找不到工地資料", "PROJECT_NOT_FOUND");
  }

  if (user.role === "admin") {
    return {
      user,
      access: {
        member_role: "admin",
        can_view: true,
        can_edit: true,
        can_view_claims: true,
        can_view_contracts: true,
      },
    };
  }

  if (!access.member_role || !access.can_view) {
    throw new ApiError(403, "此帳號沒有此工地的閱覽權限", "PROJECT_VIEW_REQUIRED");
  }

  if (permission === "edit" && !access.can_edit) {
    throw new ApiError(403, "此帳號沒有此工地的編輯權限", "PROJECT_EDIT_REQUIRED");
  }

  if (permission === "manage" && !["owner", "manager"].includes(access.member_role)) {
    throw new ApiError(403, "此帳號沒有此工地的成員管理權限", "PROJECT_MANAGE_REQUIRED");
  }

  return { user, access };
}

export async function requireProjectModuleAccess(request, projectId, module, permission = "view") {
  const result = await requireProjectAccess(request, projectId, permission);
  const { access } = result;

  if (module === "claims" && access.can_view_claims === false) {
    throw new ApiError(403, "此帳號沒有請款相關文件閱覽權限", "PROJECT_CLAIMS_VIEW_REQUIRED");
  }

  if (module === "contracts" && access.can_view_contracts === false) {
    throw new ApiError(403, "此帳號沒有合約相關文件閱覽權限", "PROJECT_CONTRACTS_VIEW_REQUIRED");
  }

  return result;
}
