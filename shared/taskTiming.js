export const reminderChoices = [[0, "準時提醒"], [15, "提前 15 分鐘"], [30, "提前 30 分鐘"], [60, "提前 1 小時"], [120, "提前 2 小時"], [1440, "提前 1 天"], [2880, "提前 2 天"], [10080, "提前 1 週"]];

export function createTimedTaskDraft(module, item = {}, today) {
  const memo = module === "memos";
  const date = item.startDate || item.date || today;
  const time = item.startTime || item.time || (memo ? "09:00" : "17:00");
  return { title: "", trade: "", owner: "", note: "", status: memo ? "待處理" : "一般", attachments: [],
    ...item, noDeadline: item.noDeadline === true, date, time,
    ...(memo ? { startDate: date, startTime: time, endDate: item.endDate || date, endTime: item.endTime || (time < "17:00" ? "17:00" : "23:59") } : {}),
    reminderMinutes: item.timingVersion === 1 ? item.reminderMinutes : item.id ? 10080 : 60,
    timingVersion: 1,
  };
}

export function validTaskDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export const validTaskTime = value => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export const taiwanMoment = (date, time) => validTaskDate(date) && validTaskTime(time) ? new Date(`${date}T${time}:00+08:00`) : null;

export function taskRange(item = {}, module) {
  if (module === "todos" && item.noDeadline === true) return null;
  const ranged = module === "memos" || module === "schedule";
  const start = ranged ? item.startDate || item.date || item.endDate : item.date;
  const end = ranged ? item.endDate || start : start;
  if (!validTaskDate(start) || !validTaskDate(end)) return null;
  return { start, end, time: module === "memos" ? item.startTime || item.time || "" : item.time || "", endTime: item.endTime || "" };
}

export function taskBaseAt(item = {}) {
  if (item.noDeadline === true) return null;
  return taiwanMoment(item.startDate || item.date, item.startTime || item.time || "23:59");
}
export function taskReminderAt(item = {}) {
  const base = taskBaseAt(item);
  if (!base || item.reminderMinutes === null) return null;
  const lead = Number(item.reminderMinutes ?? 0);
  return Number.isInteger(lead) && lead >= 0 && lead <= 525600 ? new Date(base.getTime() - lead * 60000) : null;
}
export function reminderLabel(item = {}) {
  if (item.noDeadline || item.reminderMinutes === null) return "不提醒";
  if (item.timingVersion !== 1) return "沿用原提醒設定";
  return reminderChoices.find(([value]) => value === Number(item.reminderMinutes))?.[1] || `提前 ${item.reminderMinutes} 分鐘`;
}
export function taskPeriodLabel(item = {}, module) {
  if (module === "todos" && item.noDeadline) return "無期限";
  const range = taskRange(item, module);
  if (!range) return "未設定日期";
  const start = `${range.start}${range.time ? ` ${range.time}` : ""}`;
  return module === "memos" && (item.endDate || item.endTime) ? `${start} ～ ${range.end}${range.endTime ? ` ${range.endTime}` : ""}` : start;
}
export function reminderPreview(item = {}) {
  const at = taskReminderAt(item);
  return at ? new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at) : "不提醒";
}

// Shared by the editor and API. Legacy records remain readable without migration.
export function normalizeTimedTask(input = {}, module) {
  const next = { ...input, title: String(input.title || "").trim(), timingVersion: 1 };
  if (!next.title) throw new Error(module === "memos" ? "請輸入 Memo 標題" : "請輸入待辦事項");
  next.noDeadline = module === "todos" && input.noDeadline === true;
  if (next.noDeadline) {
    next.date = ""; next.time = ""; next.reminderMinutes = null;
    delete next.startDate; delete next.startTime; delete next.endDate; delete next.endTime;
    return next;
  }
  const range = taskRange(next, module);
  if (!range) throw new Error(module === "memos" ? "請設定有效的進場起訖日期" : "請設定有效的完成期限");
  if (!validTaskTime(range.time)) throw new Error("請設定有效的時間");
  if (module === "memos") {
    if (!String(next.trade || "").trim()) throw new Error("請輸入工班或工種名稱");
    if (!validTaskTime(range.endTime)) throw new Error("請設定預計結束時間");
    if (`${range.end}T${range.endTime}` <= `${range.start}T${range.time}`) throw new Error("結束時間必須晚於進場時間");
    next.startDate = range.start; next.startTime = range.time;
    next.endDate = range.end; next.endTime = range.endTime;
  }
  next.date = range.start; next.time = range.time;
  if (module === "todos") {
    delete next.startDate; delete next.startTime; delete next.endDate; delete next.endTime;
  }
  if (next.reminderMinutes !== null) {
    if (next.reminderMinutes === "" || !["number", "string"].includes(typeof next.reminderMinutes)) throw new Error("請設定提前提醒時間");
    const minutes = Number(next.reminderMinutes);
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 525600) throw new Error("提前提醒請輸入 0～525600 分鐘的整數");
    next.reminderMinutes = minutes;
  }
  return next;
}
