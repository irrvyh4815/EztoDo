import { ApiError } from "./http.js";

export function emailProviderConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function appOrigin(request) {
  const configured = process.env.APP_ORIGIN?.replace(/\/$/, "");
  if (configured) return configured;

  const origin = request.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost.replace(/\/$/, "")}`;

  return "http://127.0.0.1:5173";
}

export function verificationUrl(request, token) {
  const url = new URL("/api/auth/verify-email", appOrigin(request));
  url.searchParams.set("token", token);
  return url.href;
}

export async function sendVerificationEmail({ to, name, url }) {
  if (!emailProviderConfigured()) {
    throw new ApiError(
      400,
      "尚未設定寄信服務，請先在 Vercel Environment Variables 設定 RESEND_API_KEY 與 EMAIL_FROM。",
      "EMAIL_PROVIDER_MISSING",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject: "請驗證你的 EZtoDO 工程管理程式帳號",
      html: `
        <div style="font-family:Arial,'Noto Sans TC',sans-serif;line-height:1.7;color:#0f172a">
          <h2>EZtoDO工程管理程式</h2>
          <p>${name || "您好"}，請點擊下方按鈕完成信箱驗證。</p>
          <p>
            <a href="${url}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">
              驗證信箱
            </a>
          </p>
          <p style="font-size:13px;color:#64748b">若按鈕無法開啟，請複製以下連結到瀏覽器：</p>
          <p style="font-size:13px;word-break:break-all;color:#334155">${url}</p>
        </div>
      `,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      502,
      data?.message || data?.error?.message || "驗證信寄送失敗，請稍後再試。",
      "EMAIL_SEND_FAILED",
    );
  }

  return data;
}
