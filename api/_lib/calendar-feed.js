import { createHmac, timingSafeEqual } from "node:crypto";

export function calendarToken(row) {
  if (!process.env.AUTH_SECRET) throw new Error("Calendar subscriptions require AUTH_SECRET");
  const signature = createHmac("sha256", process.env.AUTH_SECRET)
    .update(JSON.stringify(["eztodo-calendar-v1", row.id, row.user_id, row.project_id, row.nonce])).digest("base64url");
  return `${row.id}.${signature}`;
}

export function validCalendarToken(token, row) {
  if (!row || typeof token !== "string") return false;
  const expected = Buffer.from(calendarToken(row));
  const actual = Buffer.from(token);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const modules = { todos: "待辦", memos: "Memo", schedule: "預定進度", meetings: "會議" };
const feedRevision = new Date("2026-09-14T00:00:00Z");
const escapeText = value => String(value || "").replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
export function foldCalendarLine(line) {
  const lines = []; let current = "", bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char, "utf8");
    if (bytes + size > 75) { lines.push(current); current = " "; bytes = 1; }
    current += char; bytes += size;
  }
  lines.push(current);
  return lines.join("\r\n");
}

function dateKey(value) {
  const key = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return "";
  const date = new Date(`${key}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key ? key : "";
}
const stamp = value => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
function nextDay(key) { const date = new Date(`${key}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10).replace(/-/g, ""); }

export function renderCalendarFeed(project, records, origin, now = new Date()) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EZtoDO//Project Calendar//ZH-TW", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(`EZtoDO｜${project.name}`)}`, "X-WR-TIMEZONE:Asia/Taipei", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H"];
  if (/^#[0-9a-f]{6}$/i.test(project.calendar_color || "")) lines.push(`X-APPLE-CALENDAR-COLOR:${project.calendar_color}`);
  const seen = new Set();
  for (const record of records) {
    if (!modules[record.module] || record.project_id !== project.project_id) continue;
    const item = record.payload || {};
    let start = dateKey(record.module === "schedule" ? item.startDate || item.endDate : item.date);
    let end = record.module === "schedule" ? dateKey(item.endDate || item.startDate) : start;
    if (!start || !end) continue;
    if (start > end) [start, end] = [end, start];
    const uid = `${record.id}@eztodo-project-calendar`;
    if (seen.has(uid)) continue;
    seen.add(uid);
    const updated = record.updated_at || record.created_at;
    const modified = stamp(Math.max(feedRevision.getTime(), updated && Number.isFinite(new Date(updated).getTime()) ? new Date(updated).getTime() : now.getTime()));
    lines.push("BEGIN:VEVENT", `UID:${escapeText(uid)}`, `DTSTAMP:${modified}`, `LAST-MODIFIED:${modified}`);
    const time = String(item.time || item.reminderTime || item.dueTime || "");
    let alarmAt = new Date(`${start}T09:00:00+08:00`);
    if (record.module !== "schedule" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      // Project times are Taiwan wall-clock times, represented as UTC for every Apple device.
      const begin = new Date(`${start}T${time}:00+08:00`);
      alarmAt = begin;
      lines.push(`DTSTART:${stamp(begin)}`, `DTEND:${stamp(new Date(begin.getTime() + 60 * 60 * 1000))}`);
    } else lines.push(`DTSTART;VALUE=DATE:${start.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${nextDay(end)}`);
    const status = item.status || record.status || "";
    lines.push(`SUMMARY:${escapeText(`[${project.name}] ${item.title || item.name || record.title || "未命名行程"}`)}`,
      `DESCRIPTION:${escapeText(`${modules[record.module]}${status ? `｜${status}` : ""}\n請在 EZtoDO 查看及編輯完整資料。`)}`,
      `CATEGORIES:${escapeText(modules[record.module])}`,
      `URL:${origin}/#project=${encodeURIComponent(project.project_id)}&module=${encodeURIComponent(record.module)}`,
      "TRANSP:TRANSPARENT", "CLASS:PRIVATE");
    const finished = ["已完成", "完成", "已取消", "取消", "completed", "done", "cancelled", "canceled"].includes(String(status).trim().toLowerCase());
    if (!finished && alarmAt.getTime() >= now.getTime()) {
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `TRIGGER;VALUE=DATE-TIME:${stamp(alarmAt)}`,
        `DESCRIPTION:${escapeText(`[${project.name}] ${item.title || item.name || record.title || "行程提醒"}`)}`, "END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldCalendarLine).join("\r\n") + "\r\n";
}
