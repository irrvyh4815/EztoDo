export const NOTIFICATION_GRACE_HOURS = 2;

function localDateTime(dateValue, timeValue = "23:59") {
  const match = String(dateValue || "")
    .trim()
    .replace(/\//g, "-")
    .match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;

  const timeMatch = String(timeValue || "23:59")
    .trim()
    .match(/^(\d{1,2}):(\d{2})/);
  const hours = Math.min(23, Math.max(0, Number(timeMatch?.[1] ?? 23)));
  const minutes = Math.min(59, Math.max(0, Number(timeMatch?.[2] ?? 59)));
  const value = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    hours,
    minutes,
    0,
    0,
  );
  return Number.isNaN(value.getTime()) ? null : value;
}

export function notificationScheduledAt(item = {}) {
  return localDateTime(
    item.date,
    item.time || item.reminderTime || item.dueTime || "23:59",
  );
}

export function isTimedNotificationPast(item = {}, now = new Date()) {
  const scheduledAt = notificationScheduledAt(item);
  return Boolean(scheduledAt && new Date(now).getTime() > scheduledAt.getTime());
}

export function shouldShowTimedNotification(
  item = {},
  now = new Date(),
  upcomingDays = 7,
) {
  const scheduledAt = notificationScheduledAt(item);
  const current = new Date(now);
  if (!scheduledAt || Number.isNaN(current.getTime())) return false;

  const expiresAt =
    scheduledAt.getTime() + NOTIFICATION_GRACE_HOURS * 60 * 60 * 1000;
  if (current.getTime() > expiresAt) return false;

  const upcomingLimit = new Date(current);
  upcomingLimit.setDate(upcomingLimit.getDate() + upcomingDays);
  return scheduledAt.getTime() <= upcomingLimit.getTime();
}

export function notificationDateTimeLabel(item = {}) {
  const date = String(item.date || "").trim() || "未設定日期";
  const time = String(item.time || item.reminderTime || item.dueTime || "").trim();
  return time ? `${date} ${time}` : date;
}
