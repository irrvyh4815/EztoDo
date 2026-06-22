import { json, methodNotAllowed } from "./_lib/http.js";

export default {
  fetch(request) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);

    const services = {
      database: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL),
      auth: Boolean(process.env.AUTH_SECRET),
      uploads: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      email:
        Boolean(process.env.RESEND_API_KEY) &&
        Boolean(process.env.EMAIL_FROM),
      ai: Boolean(process.env.OPENAI_API_KEY),
    };

    return json({
      ok: services.database && services.auth,
      services,
      version: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    });
  },
};
