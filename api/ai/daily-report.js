import { ensureSchema } from "../_lib/db.js";
import { ApiError, json, methodNotAllowed, readJson } from "../_lib/http.js";
import { requirePermission } from "../_lib/permissions.js";

const dailyReportSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    date: {
      type: "string",
      description: "日報日期，請輸出 YYYY-MM-DD；無法判讀時輸出空字串。",
    },
    weather: {
      type: "string",
      description: "天氣，例如晴、陰、雨、雷雨、高溫；無法判讀時輸出空字串。",
    },
    weatherNote: {
      type: "string",
      description: "天氣備註或特殊天候說明；無法判讀時輸出空字串。",
    },
    work: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          trade: { type: "string" },
          workers: { type: "string" },
          description: { type: "string" },
          note: { type: "string" },
        },
        required: ["trade", "workers", "description", "note"],
      },
    },
    materials: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          spec: { type: "string" },
          quantity: { type: "string" },
          unit: { type: "string" },
          note: { type: "string" },
        },
        required: ["name", "spec", "quantity", "unit", "note"],
      },
    },
    equipment: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          quantity: { type: "string" },
          note: { type: "string" },
        },
        required: ["name", "quantity", "note"],
      },
    },
    notes: {
      type: "array",
      items: { type: "string" },
      description: "列出不確定、模糊或需要人工確認的判讀內容。",
    },
  },
  required: ["date", "weather", "weatherNote", "work", "materials", "equipment", "notes"],
};

function textValue(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cleanRows(rows, keys) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) =>
      keys.reduce((next, key) => {
        next[key] = textValue(row?.[key]);
        return next;
      }, {}),
    )
    .filter((row) => keys.some((key) => row[key]));
}

function normalizeReport(report = {}) {
  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(textValue(report.date)) ? textValue(report.date) : "",
    weather: textValue(report.weather),
    weatherNote: textValue(report.weatherNote),
    work: cleanRows(report.work, ["trade", "workers", "description", "note"]),
    materials: cleanRows(report.materials, ["name", "spec", "quantity", "unit", "note"]),
    equipment: cleanRows(report.equipment, ["name", "quantity", "note"]),
    notes: Array.isArray(report.notes) ? report.notes.map(textValue).filter(Boolean) : [],
  };
}

function outputText(response) {
  if (typeof response?.output_text === "string") return response.output_text;

  for (const item of response?.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return "";
}

function isImageDataUrl(dataUrl) {
  return /^data:image\/(png|jpe?g|webp);base64,/i.test(dataUrl || "");
}

export default {
  async fetch(request) {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);

    try {
      await ensureSchema();
      await requirePermission(request, "edit");

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new ApiError(
          400,
          "尚未設定 OPENAI_API_KEY，請先在 Vercel Environment Variables 新增後再使用 AI 判讀。",
          "OPENAI_API_KEY_MISSING",
        );
      }

      const body = await readJson(request);
      if (!isImageDataUrl(body?.image?.dataUrl)) {
        throw new ApiError(400, "請上傳 JPG、PNG 或 WebP 格式的紙本日報圖片。", "IMAGE_REQUIRED");
      }

      const model =
        process.env.OPENAI_DAILY_REPORT_MODEL ||
        process.env.OPENAI_MODEL ||
        "gpt-5.4-mini";

      const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: [
                    "你是台灣營造工程施工日報的資料整理助手。",
                    `工地名稱：${textValue(body.projectName) || "未提供"}`,
                    "請從圖片中的紙本日報擷取資料，輸出給施工日報表單使用。",
                    "不要自行補不存在的資料；看不清楚或不確定的欄位請留空，並把疑點放在 notes。",
                    "工班 work 請對應 trade、workers、description、note。",
                    "材料 materials 請對應 name、spec、quantity、unit、note。",
                    "機具 equipment 請對應 name、quantity、note。",
                  ].join("\n"),
                },
                {
                  type: "input_image",
                  image_url: body.image.dataUrl,
                  detail: "high",
                },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "daily_report_extraction",
              strict: true,
              schema: dailyReportSchema,
            },
          },
          max_output_tokens: 1800,
        }),
      });

      const result = await openaiResponse.json().catch(() => null);
      if (!openaiResponse.ok) {
        const message =
          result?.error?.message || "AI 判讀服務暫時無法回應，請稍後再試。";
        return json({ error: message, code: "OPENAI_REQUEST_FAILED" }, 502);
      }

      const text = outputText(result);
      if (!text) {
        return json(
          { error: "AI 沒有回傳可用的判讀結果，請換一張較清楚的圖片。", code: "AI_EMPTY_RESULT" },
          422,
        );
      }

      return json({ report: normalizeReport(JSON.parse(text)) });
    } catch (error) {
      if (error instanceof ApiError) {
        return json({ error: error.message, code: error.code }, error.status);
      }

      console.error(error);
      return json(
        { error: "AI 判讀失敗，請確認圖片清晰度後再試。", code: "AI_PARSE_FAILED" },
        500,
      );
    }
  },
};
