import { put } from "@vercel/blob";
import { ApiError, json, jsonError, methodNotAllowed } from "../_lib/http.js";
import { requirePermission } from "../_lib/permissions.js";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function safePathPart(value, fallback) {
  const clean = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean || fallback;
}

export default {
  async fetch(request) {
    if (!["GET", "POST"].includes(request.method)) {
      return methodNotAllowed(["GET", "POST"]);
    }

    try {
      if (request.method === "GET") {
        return json({
          provider: "vercel-blob",
          status: process.env.BLOB_READ_WRITE_TOKEN ? "ready" : "configuration-required",
          message: process.env.BLOB_READ_WRITE_TOKEN
            ? "Vercel Blob 圖片上傳已啟用。"
            : "尚未設定 BLOB_READ_WRITE_TOKEN。",
          maxFiles: 10,
          maxFileBytes: MAX_UPLOAD_BYTES,
          acceptedTypes: [...acceptedTypes],
        });
      }

      const user = await requirePermission(request, "edit");
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new ApiError(
          503,
          "尚未設定 Vercel Blob，請先建立 Blob Store 並加入 BLOB_READ_WRITE_TOKEN。",
          "BLOB_NOT_CONFIGURED",
        );
      }

      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        throw new ApiError(400, "請選擇要上傳的圖片。", "UPLOAD_FILE_REQUIRED");
      }
      if (!acceptedTypes.has(file.type)) {
        throw new ApiError(400, "僅支援 JPG、PNG 或 WebP 圖片。", "UPLOAD_TYPE_INVALID");
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new ApiError(413, "單張圖片不可超過 4MB。", "UPLOAD_TOO_LARGE");
      }

      const projectId = safePathPart(form.get("projectId"), "unassigned");
      const module = safePathPart(form.get("module"), "attachments");
      const filename = safePathPart(file.name, `image-${Date.now()}`);
      const pathname = `eztodo/${projectId}/${module}/${Date.now()}-${filename}`;
      const blob = await put(pathname, file, {
        access: "public",
        addRandomSuffix: true,
        contentType: file.type,
      });

      return json(
        {
          attachment: {
            name: file.name,
            size: file.size,
            type: file.type,
            url: blob.url,
            downloadUrl: blob.downloadUrl,
            pathname: blob.pathname,
            uploadedBy: user.id,
          },
        },
        201,
      );
    } catch (error) {
      return jsonError(error);
    }
  },
};
