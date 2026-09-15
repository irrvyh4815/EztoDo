import { emailVerificationRequired, hashPassword } from "../_lib/auth.js";
import {
  createEmailVerificationToken,
  ensureSchema,
  insertUser,
  listUsers,
  mapUser,
  listAccountGroups,
  saveAccountGroup,
} from "../_lib/db.js";
import { requireSystemAdmin } from '../_lib/permissions.js';
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

function normalizeOrganizationName(value) {
  const organizationName = String(value || "").trim();
  if (!organizationName) {
    throw new ApiError(400, "請選擇所屬單位", "ORGANIZATION_REQUIRED");
  }
  if (organizationName.length > 80) {
    throw new ApiError(400, "所屬單位最多 80 字", "ORGANIZATION_INVALID");
  }
  return organizationName;
}

export default {
  async fetch(request) {
    if (!["GET", "POST"].includes(request.method)) {
      return methodNotAllowed(["GET", "POST"]);
    }

    try {
      await ensureSchema();
      await requireSystemAdmin(request);

      if (request.method === "GET") {
        return json({ users: await listUsers(), groups: await listAccountGroups() });
      }

      const body = await readJson(request);
      if (body.action === 'save-group') {
        const group = await saveAccountGroup(body.group || {});
        return json({ group, groups: await listAccountGroups(), users: await listUsers() });
      }
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
