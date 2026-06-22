import { emailVerificationRequired, hashPassword, requireUser } from "../_lib/auth.js";
import {
  createEmailVerificationToken,
  ensureSchema,
  insertUser,
  listUsers,
  mapUser,
} from "../_lib/db.js";
import {
  emailProviderConfigured,
  sendVerificationEmail,
  verificationUrl,
} from "../_lib/email.js";
import {
  ApiError,
  json,
  jsonError,
  methodNotAllowed,
  readJson,
} from "../_lib/http.js";

const organizationOptions = new Set(["測試分組1", "測試分組2", "測試分組3"]);

function normalizeOrganizationName(value) {
  const organizationName = String(value || "").trim();
  if (!organizationName) {
    throw new ApiError(400, "請選擇所屬單位", "ORGANIZATION_REQUIRED");
  }
  if (!organizationOptions.has(organizationName)) {
    throw new ApiError(400, "所屬單位選項無效", "ORGANIZATION_INVALID");
  }
  return organizationName;
}

function requireAdmin(request) {
  const user = requireUser(request);
  if (user.role !== "admin") {
    throw new ApiError(403, "需要管理員權限", "ADMIN_REQUIRED");
  }
  return user;
}

export default {
  async fetch(request) {
    if (!["GET", "POST"].includes(request.method)) {
      return methodNotAllowed(["GET", "POST"]);
    }

    try {
      requireAdmin(request);
      await ensureSchema();

      if (request.method === "GET") {
        return json({ users: await listUsers() });
      }

      const body = await readJson(request);
      if (!body.email?.trim() || !body.name?.trim() || !body.password) {
        throw new ApiError(400, "請輸入姓名、帳號與密碼", "USER_FIELDS_REQUIRED");
      }
      const organizationName = normalizeOrganizationName(body.organizationName);
      if (body.password.length < 8) {
        throw new ApiError(400, "密碼至少需要 8 碼", "PASSWORD_TOO_SHORT");
      }

      const shouldVerifyEmail =
        emailVerificationRequired() && (body.role || "member") !== "admin";

      if (shouldVerifyEmail && !emailProviderConfigured()) {
        throw new ApiError(
          400,
          "尚未設定寄信服務，請先設定 RESEND_API_KEY 與 EMAIL_FROM。",
          "EMAIL_PROVIDER_MISSING",
        );
      }

      const user = await insertUser({
        email: body.email,
        name: body.name,
        organizationName,
        passwordHash: await hashPassword(body.password),
        role: body.role || "member",
        canView: body.canView ?? true,
        canEdit: body.canEdit ?? false,
        emailVerified: !shouldVerifyEmail,
      });

      if (shouldVerifyEmail) {
        const { token } = await createEmailVerificationToken(user.id);
        await sendVerificationEmail({
          to: user.email,
          name: user.name,
          url: verificationUrl(request, token),
        });
      }

      return json(
        { user: mapUser(user), verificationEmailSent: shouldVerifyEmail },
        201,
      );
    } catch (error) {
      return jsonError(error);
    }
  },
};
