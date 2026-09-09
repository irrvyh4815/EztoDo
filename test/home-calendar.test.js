import test from "node:test";
import assert from "node:assert/strict";
import { calendarDays, calendarEventsByDate, projectCalendarColor } from "../src/homeCalendar.js";

const projects = [{ id: "a", name: "甲工地" }, { id: "b", name: "乙工地", calendarColor: "#e11d48" }, { id: "blocked", name: "不可閱覽", canView: false }];

test("calendar spans year boundaries and leap days with fixed month/week sizes", () => {
  assert.equal(calendarDays("2026-12-31").length, 42);
  assert.equal(calendarDays("2026-12-31", "week")[6], "2027-01-02");
  assert.ok(calendarDays("2028-02-01").includes("2028-02-29"));
});

test("cross-project events preserve navigation identity, permissions, and filters", () => {
  const records = [
    { id: "same", projectId: "a", module: "todos", title: "待辦", date: "2026-09-09", time: "10:00" },
    { id: "same", projectId: "b", module: "memos", title: "Memo", date: "2026-09-09", time: "09:00" },
    { id: "3", projectId: "blocked", module: "todos", title: "禁止", date: "2026-09-09" },
    { id: "4", projectId: "unknown", module: "meetings", title: "無權限", date: "2026-09-09" },
    { id: "5", projectId: "a", module: "claims", title: "不屬於行事曆", date: "2026-09-09" },
  ];
  const days = calendarDays("2026-09-09", "week");
  const events = calendarEventsByDate(projects, [...records, records[0]], days).get("2026-09-09");
  assert.equal(events.length, 2);
  assert.deepEqual(events.map((e) => [e.project.id, e.module]), [["b", "memos"], ["a", "todos"]]);
  assert.equal(events[0].color, "#e11d48");
  assert.equal(calendarEventsByDate(projects, records, days, "a").get("2026-09-09").length, 1);
});

test("multi-day schedules are inclusive, bounded to visible dates, and tolerate reversed ranges", () => {
  const days = ["2026-08-31", "2026-09-01", "2026-09-02"];
  const records = [
    { id: "1", projectId: "a", module: "schedule", title: "跨月", startDate: "2026-09-01", endDate: "2026-08-31" },
    { id: "2", projectId: "a", module: "schedule", title: "長期", startDate: "2020-01-01", endDate: "2050-01-01" },
    { id: "3", projectId: "a", module: "todos", title: "無日期" },
    { id: "4", projectId: "a", module: "todos", title: "無效日期", date: "2026-02-30" },
  ];
  const result = calendarEventsByDate(projects, records, days);
  assert.deepEqual([...result.values()].map((events) => events.length), [2, 2, 1]);
  assert.equal(result.size, 3);
  assert.equal(projectCalendarColor(projects[0]), projectCalendarColor({ ...projects[0], name: "重新命名" }));
});
