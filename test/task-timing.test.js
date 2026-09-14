import test from "node:test";
import assert from "node:assert/strict";
import { createTimedTaskDraft, normalizeTimedTask, taskReminderAt, taskPeriodLabel, reminderLabel } from "../shared/taskTiming.js";
import { shouldShowTimedNotification } from "../src/notificationRules.js";
import { calendarEventsByDate } from "../src/homeCalendar.js";
import { renderCalendarFeed } from "../api/_lib/calendar-feed.js";

const memo = { timingVersion: 1, title: "防水進場", trade: "防水工班", startDate: "2026-09-30", startTime: "08:00", endDate: "2026-10-02", endTime: "17:00", reminderMinutes: 1440 };
const todo = { timingVersion: 1, title: "查核", date: "2026-10-02", time: "10:00", reminderMinutes: 60 };

test("timed task drafts preserve legacy fields, normalize dates and validate ranges", () => {
  const legacy = createTimedTaskDraft("memos", { id: "old", date: "2026-09-01", time: "08:30", title: "原本事項", trade: "泥作", note: "保留內容", attachments: [{ id: "photo" }] }, "2026-09-14");
  assert.equal(legacy.startDate, "2026-09-01");
  assert.equal(legacy.startTime, "08:30");
  assert.equal(legacy.reminderMinutes, 10080);
  assert.equal(legacy.attachments[0].id, "photo");
  const saved = normalizeTimedTask(memo, "memos");
  assert.equal(saved.date, memo.startDate);
  assert.equal(saved.time, memo.startTime);
  assert.match(taskPeriodLabel(saved, "memos"), /2026-09-30 08:00 ～ 2026-10-02 17:00/);
  for (const patch of [{ startDate: "2026-02-30" }, { endDate: "2026-09-29" }, { endDate: memo.startDate, endTime: memo.startTime }, { startTime: "25:00" }, { trade: " " }, { title: " " }]) assert.throws(() => normalizeTimedTask({ ...memo, ...patch }, "memos"));
  for (const reminderMinutes of [-1, 1.5, "", "bad", true, [], {}, 525601]) assert.throws(() => normalizeTimedTask({ ...todo, reminderMinutes }, "todos"), /提醒/);
  assert.equal(normalizeTimedTask({ ...todo, reminderMinutes: "30" }, "todos").reminderMinutes, 30);
});

test("new reminders start exactly at the chosen lead time, cross dates in Taiwan and expire after grace", () => {
  const record = normalizeTimedTask(memo, "memos");
  assert.equal(taskReminderAt(record).toISOString(), "2026-09-29T00:00:00.000Z");
  assert.equal(shouldShowTimedNotification(record, new Date("2026-09-28T23:59:59Z")), false);
  assert.equal(shouldShowTimedNotification(record, new Date("2026-09-29T00:00:00Z")), true);
  assert.equal(shouldShowTimedNotification(record, new Date("2026-09-30T02:00:00Z")), true);
  assert.equal(shouldShowTimedNotification(record, new Date("2026-09-30T02:00:01Z")), false);
  assert.equal(taskReminderAt({ ...todo, reminderMinutes: 0 }).toISOString(), "2026-10-02T02:00:00.000Z");
  assert.equal(shouldShowTimedNotification({ ...todo, reminderMinutes: null }, new Date("2026-10-02T02:00:00Z")), false);
});

test("unlimited todos clear deadline and reminders without losing content, and never enter calendars", () => {
  const saved = normalizeTimedTask({ ...todo, noDeadline: true, note: "長期追蹤" }, "todos");
  assert.equal(saved.date, ""); assert.equal(saved.time, ""); assert.equal(saved.reminderMinutes, null);
  assert.equal(saved.note, "長期追蹤");
  assert.equal(taskPeriodLabel(saved, "todos"), "無期限");
  assert.equal(reminderLabel(saved), "不提醒");
  const stale = { ...todo, noDeadline: true };
  assert.equal(taskReminderAt(stale), null);
  assert.equal(shouldShowTimedNotification(stale, new Date("2026-10-02T02:00:00Z")), false);
  assert.equal(calendarEventsByDate([{ id: "p" }], [{ ...stale, module: "todos", projectId: "p", id: "t" }], ["2026-10-02"]).get("2026-10-02").length, 0);
});

test("Memo calendar spans every visible day across months and keeps project navigation identity", () => {
  const days = ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03"];
  const map = calendarEventsByDate([{ id: "p", name: "工地" }], [{ ...memo, projectId: "p", module: "memos", id: "m" }], days);
  assert.deepEqual(days.map(day => map.get(day).length), [0, 1, 1, 1, 0]);
  assert.equal(map.get("2026-10-01")[0].project.id, "p");
  assert.equal(map.get("2026-10-01")[0].time, "08:00");
});

test("Apple subscription uses the full Memo range and identical lead time, with off/done/unlimited respected", () => {
  const rec = (id, module, payload) => ({ id, module, project_id: "p", payload });
  const ics = renderCalendarFeed({ project_id: "p", name: "工地" }, [rec("m", "memos", memo), rec("t", "todos", todo), rec("off", "todos", { ...todo, reminderMinutes: null }), rec("done", "memos", { ...memo, status: "已完成" }), rec("unlimited", "todos", { ...todo, noDeadline: true })], "https://example.test", new Date("2026-09-28T00:00:00Z"));
  assert.match(ics, /DTSTART:20260930T000000Z\r\nDTEND:20261002T090000Z/);
  assert.match(ics, /TRIGGER;VALUE=DATE-TIME:20260929T000000Z/);
  assert.match(ics, /TRIGGER;VALUE=DATE-TIME:20261002T010000Z/);
  assert.equal(ics.match(/BEGIN:VALARM/g).length, 2);
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 4);
  assert.doesNotMatch(ics, /UID:unlimited/);
});
