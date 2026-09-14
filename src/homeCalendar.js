import { taskRange } from "../shared/taskTiming.js";
export const calendarModules = { todos: "待辦", memos: "Memo", schedule: "預定進度", meetings: "會議" };
export const calendarPalette = [
  ["#2563eb", "藍色"], ["#059669", "綠色"], ["#d97706", "橙色"], ["#9333ea", "紫色"],
  ["#e11d48", "玫紅"], ["#0891b2", "青色"], ["#4f46e5", "靛色"], ["#64748b", "灰色"],
];

export function projectCalendarColor(project) {
  if (/^#[0-9a-f]{6}$/i.test(project.calendarColor || "")) return project.calendarColor;
  let hash = 0;
  for (const char of String(project.id || project.name || "")) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return calendarPalette[hash % calendarPalette.length][0];
}

export function calendarDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function validDate(value) {
  const key = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return "";
  const date = new Date(`${key}T12:00:00`);
  return Number.isFinite(date.getTime()) && calendarDateKey(date) === key ? key : "";
}

export function shiftCalendarDate(key, days) {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() + days);
  return calendarDateKey(date);
}

export function calendarDays(anchor, mode = "month") {
  const first = mode === "month" ? `${anchor.slice(0, 7)}-01` : anchor;
  const start = shiftCalendarDate(first, -new Date(`${first}T12:00:00`).getDay());
  return Array.from({ length: mode === "month" ? 42 : 7 }, (_, index) => shiftCalendarDate(start, index));
}

export function calendarEventsByDate(projects, records, days, projectFilter = "") {
  const projectMap = new Map(projects.filter((p) => p.canView !== false).map((p) => [p.id, p]));
  const result = new Map(days.map((day) => [day, []]));
  const seen = new Set();
  for (const record of records) {
    const project = projectMap.get(record.projectId);
    if (!project || !calendarModules[record.module] || (projectFilter && project.id !== projectFilter)) continue;
    const key = `${project.id}:${record.module}:${record.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const range = taskRange(record, record.module);
    let start = validDate(range?.start);
    let end = validDate(range?.end);
    if (!start || !end) continue;
    if (start > end) [start, end] = [end, start];
    const event = { ...record, time: range.time, key, project, start, end, color: projectCalendarColor(project) };
    // Iterate only visible days, even when a construction schedule spans years.
    for (const day of days) {
      if (day >= start && day <= end) result.get(day).push(event);
    }
  }
  for (const events of result.values()) {
    events.sort((a, b) => String(a.time || "00:00").localeCompare(String(b.time || "00:00"))
      || a.project.name.localeCompare(b.project.name, "zh-Hant") || String(a.title || "").localeCompare(String(b.title || ""), "zh-Hant"));
  }
  return result;
}
