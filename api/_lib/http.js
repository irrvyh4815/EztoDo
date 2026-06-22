export const SESSION_COOKIE = "eztodo_session";

export class ApiError extends Error {
  constructor(status, message, code = "API_ERROR") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers });
}

export function jsonError(error) {
  const status = error?.status || 500;
  const message = status >= 500 ? "伺服器暫時無法處理請求" : error.message;

  if (status >= 500) {
    console.error(error);
  }

  return json(
    {
      error: message,
      code: error?.code || "INTERNAL_SERVER_ERROR",
    },
    status,
  );
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "JSON 格式不正確", "INVALID_JSON");
  }
}

export function methodNotAllowed(allowed) {
  return json(
    { error: "不支援的 HTTP 方法", code: "METHOD_NOT_ALLOWED" },
    405,
    { Allow: allowed.join(", ") },
  );
}

export function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((cookies, part) => {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) return cookies;
    cookies[rawName] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});
}

export function sessionCookie(value, maxAge) {
  const secure = process.env.VERCEL || process.env.NODE_ENV === "production";
  const attrs = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];

  if (secure) attrs.push("Secure");

  return attrs.join("; ");
}
