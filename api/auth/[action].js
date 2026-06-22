import {
  createSessionToken,
  emailVerificationRequired,
  hashPassword,
  publicUser,
  requireUser,
  sessionMaxAgeSeconds,
  verifyPassword,
} from "../_lib/auth.js";
import {
  emailProviderConfigured,
  sendVerificationEmail,
  verificationUrl,
  appOrigin,
} from "../_lib/email.js";
import {
  createEmailVerificationToken,
  ensureSchema,
  findUserByEmail,
  findUserById,
  insertUser,
  markUserLogin,
  updateUserPassword,
  updateUserProfile,
  verifyEmailToken,
} from "../_lib/db.js";
import {
  ApiError,
  json,
  jsonError,
  methodNotAllowed,
  readJson,
  sessionCookie,
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

function actionFromUrl(url) {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const authIndex = parts.indexOf("auth");
  return authIndex >= 0 ? parts[authIndex + 1] || "" : "";
}

function htmlPage({ title, message, href, ok }) {
  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;background:#f8fafc;font-family:Arial,'Noto Sans TC',sans-serif;color:#0f172a">
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px">
      <section style="max-width:480px;width:100%;border:1px solid #e2e8f0;border-radius:20px;background:white;padding:28px;box-shadow:0 10px 30px rgba(15,23,42,.08)">
        <p style="margin:0 0 12px;color:${ok ? "#047857" : "#b91c1c"};font-weight:700">${ok ? "驗證成功" : "驗證失敗"}</p>
        <h1 style="margin:0 0 12px;font-size:24px">EZtoDO工程管理程式</h1>
        <p style="margin:0 0 20px;line-height:1.7;color:#475569">${message}</p>
        <a href="${href}" style="display:inline-block;border-radius:12px;background:#0f172a;color:white;padding:10px 16px;text-decoration:none;font-weight:700">返回登入頁</a>
      </section>
    </main>
  </body>
</html>`;
}

async function login(request) {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);

  const { email, password } = await readJson(request);
  if (!email || !password) {
    throw new ApiError(400, "請輸入帳號與密碼", "LOGIN_FIELDS_REQUIRED");
  }

  await ensureSchema();

  const user = await findUserByEmail(email);
  const valid = user && (await verifyPassword(password, user.password_hash));
  if (!valid) {
    throw new ApiError(401, "帳號或密碼錯誤", "INVALID_CREDENTIALS");
  }

  if (emailVerificationRequired() && user.role !== "admin" && !user.email_verified) {
    throw new ApiError(403, "請先完成信箱驗證，再登入系統。", "EMAIL_NOT_VERIFIED");
  }

  const loggedInUser = await markUserLogin(user.id);

  return json(
    { user: publicUser(loggedInUser || user) },
    200,
    {
      "Set-Cookie": sessionCookie(createSessionToken(user), sessionMaxAgeSeconds()),
    },
  );
}

async function logout(request) {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
}

async function me(request) {
  if (request.method !== "GET") return methodNotAllowed(["GET"]);

  const sessionUser = requireUser(request);
  await ensureSchema();

  const user = await findUserById(sessionUser.id);
  if (!user) {
    throw new ApiError(401, "請重新登入", "SESSION_USER_NOT_FOUND");
  }

  return json({ user: publicUser(user) });
}

async function register(request) {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);

  const { email, password, name, organizationName } = await readJson(request);
  if (!email?.trim() || !password || !name?.trim()) {
    throw new ApiError(400, "請輸入姓名、帳號與密碼", "REGISTER_FIELDS_REQUIRED");
  }
  const cleanOrganizationName = normalizeOrganizationName(organizationName);
  if (password.length < 8) {
    throw new ApiError(400, "密碼至少需要 8 碼", "PASSWORD_TOO_SHORT");
  }

  await ensureSchema();

  const existing = await findUserByEmail(email);
  if (existing) {
    throw new ApiError(409, "此帳號已註冊", "EMAIL_ALREADY_EXISTS");
  }

  const requireVerification = emailVerificationRequired();
  if (requireVerification && !emailProviderConfigured()) {
    throw new ApiError(
      400,
      "尚未設定寄信服務，請先設定 RESEND_API_KEY 與 EMAIL_FROM。",
      "EMAIL_PROVIDER_MISSING",
    );
  }

  const user = await insertUser({
    email,
    name,
    organizationName: cleanOrganizationName,
    passwordHash: await hashPassword(password),
    canView: true,
    canEdit: true,
    emailVerified: !requireVerification,
  });

  if (requireVerification) {
    const { token } = await createEmailVerificationToken(user.id);
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      url: verificationUrl(request, token),
    });

    return json(
      {
        user: publicUser(user),
        emailVerificationRequired: true,
        verificationEmailSent: true,
      },
      201,
    );
  }

  return json(
    { user: publicUser(user) },
    201,
    {
      "Set-Cookie": sessionCookie(createSessionToken(user), sessionMaxAgeSeconds()),
    },
  );
}

async function changePassword(request) {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);

  const sessionUser = requireUser(request);
  await ensureSchema();

  const { currentPassword, newPassword } = await readJson(request);
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "請輸入目前密碼與新密碼", "PASSWORD_FIELDS_REQUIRED");
  }
  if (newPassword.length < 8) {
    throw new ApiError(400, "新密碼至少需要 8 碼", "PASSWORD_TOO_SHORT");
  }

  const user = await findUserById(sessionUser.id);
  if (!user) {
    throw new ApiError(401, "請重新登入", "SESSION_USER_NOT_FOUND");
  }

  const valid = await verifyPassword(currentPassword, user.password_hash);
  if (!valid) {
    throw new ApiError(401, "目前密碼不正確", "INVALID_CURRENT_PASSWORD");
  }

  return json({
    user: await updateUserPassword(user.id, await hashPassword(newPassword)),
  });
}

async function updateProfile(request) {
  if (!["PATCH", "POST"].includes(request.method)) {
    return methodNotAllowed(["PATCH", "POST"]);
  }

  const sessionUser = requireUser(request);
  await ensureSchema();

  const { name } = await readJson(request);
  const cleanName = String(name || "").trim();
  if (!cleanName) {
    throw new ApiError(400, "請輸入暱稱", "USER_NAME_REQUIRED");
  }

  const user = await updateUserProfile(sessionUser.id, { name: cleanName });
  if (!user) {
    throw new ApiError(404, "找不到帳號", "USER_NOT_FOUND");
  }

  return json({ user: publicUser(user) });
}

async function resendVerification(request) {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);

  const { email } = await readJson(request);
  if (!email?.trim()) {
    throw new ApiError(400, "請輸入要驗證的 Email", "EMAIL_REQUIRED");
  }

  await ensureSchema();

  const user = await findUserByEmail(email);
  if (!user || user.email_verified || user.role === "admin" || !emailVerificationRequired()) {
    return json({
      ok: true,
      message: "如果此信箱需要驗證，系統會寄出驗證信。",
    });
  }

  const { token } = await createEmailVerificationToken(user.id);
  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    url: verificationUrl(request, token),
  });

  return json({ ok: true, message: "驗證信已寄出，請到信箱收信。" });
}

async function verifyEmail(request) {
  if (request.method !== "GET") return methodNotAllowed(["GET"]);

  const origin = appOrigin(request);

  try {
    await ensureSchema();
    const token = new URL(request.url).searchParams.get("token") || "";
    const user = await verifyEmailToken(token);

    if (!user) {
      return new Response(
        htmlPage({
          title: "信箱驗證失敗",
          message: "驗證連結已失效或不存在，請回登入頁重新寄送驗證信。",
          href: origin,
          ok: false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        },
      );
    }

    return new Response(
      htmlPage({
        title: "信箱驗證成功",
        message: "你的信箱已完成驗證，現在可以回到系統登入。",
        href: origin,
        ok: true,
      }),
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  } catch {
    return new Response(
      htmlPage({
        title: "信箱驗證失敗",
        message: "伺服器暫時無法完成驗證，請稍後再試。",
        href: origin,
        ok: false,
      }),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }
}

export default {
  async fetch(request) {
    try {
      const action = actionFromUrl(request.url);

      if (action === "login") return await login(request);
      if (action === "logout") return await logout(request);
      if (action === "me") return await me(request);
      if (action === "register") return await register(request);
      if (action === "password") return await changePassword(request);
      if (action === "profile") return await updateProfile(request);
      if (action === "resend-verification") return await resendVerification(request);
      if (action === "verify-email") return await verifyEmail(request);

      throw new ApiError(404, "找不到此驗證 API", "AUTH_ROUTE_NOT_FOUND");
    } catch (error) {
      return jsonError(error);
    }
  },
};
