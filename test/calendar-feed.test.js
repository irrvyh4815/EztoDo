import test from "node:test";
import assert from "node:assert/strict";
import { calendarToken, validCalendarToken, renderCalendarFeed, foldCalendarLine } from "../api/_lib/calendar-feed.js";

test("calendar bearer tokens are scoped to user, project, nonce and secret", () => {
  const old = process.env.AUTH_SECRET;
  try {
    process.env.AUTH_SECRET = "synthetic-calendar-secret";
    const row = { id: "subscription", user_id: "one", project_id: "project", nonce: "nonce" };
    const token = calendarToken(row);
    assert.ok(validCalendarToken(token, row));
    assert.equal(validCalendarToken(token + "x", row), false);
    assert.equal(validCalendarToken(token, null), false);
    for (const key of Object.keys(row)) assert.equal(validCalendarToken(token, { ...row, [key]: "changed" }), false);
    process.env.AUTH_SECRET = "rotated-secret";
    assert.equal(validCalendarToken(token, row), false);
  } finally { if (old === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = old; }
});

const project = { project_id: "p", name: "甲工地", calendar_color: "#2563eb" };
const record = (id, module, payload, extra = {}) => ({ id, module, payload, project_id: "p", updated_at: "2026-09-10T00:00:00Z", ...extra });
const render = records => renderCalendarFeed(project, records, "https://app.example.test").replace(/\r\n /g, "");

test("ICS handles Taiwan time, exclusive all-day ends, leap days and reversed ranges", () => {
  const ics = render([
    record("timed", "todos", { date: "2026-09-10", time: "00:30" }),
    record("all-day", "memos", { date: "2028-02-29" }),
    record("range", "schedule", { startDate: "2026-10-02", endDate: "2026-09-30" }),
    record("meeting", "meetings", { date: "2026-09-10", reminderTime: "09:00" }),
  ]);
  assert.match(ics, /DTSTART:20260909T163000Z\r\nDTEND:20260909T173000Z/);
  assert.match(ics, /DTSTART;VALUE=DATE:20280229\r\nDTEND;VALUE=DATE:20280301/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260930\r\nDTEND;VALUE=DATE:20261003/);
  assert.match(ics, /DTSTART:20260910T010000Z/);
  assert.match(ics, /X-APPLE-CALENDAR-COLOR:#2563eb/);
  assert.match(ics, /URL:https:\/\/app.example.test\/#project=p&module=todos/);
});

test("ICS excludes other projects, non-calendar modules, invalid dates and private details", () => {
  const visible = record("good", "todos", { date: "2026-09-10", title: "可見", notes: "SECRET-NOTES", attachments: ["SECRET-URL"] });
  const ics = render([visible, visible,
    record("other", "todos", { date: "2026-09-10" }, { project_id: "other" }),
    record("claim", "claims", { date: "2026-09-10" }),
    record("invalid", "memos", { date: "2026-02-30" }),
    record("missing", "schedule", {}),
  ]);
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 1);
  assert.doesNotMatch(ics, /SECRET|other@|claim@|invalid@|missing@/);
  const changed = render([{ ...visible, payload: { ...visible.payload, title: "改名" }, updated_at: "2026-09-11T00:00:00Z" }]);
  assert.equal(ics.match(/UID:.+/)[0], changed.match(/UID:.+/)[0]);
  assert.match(changed, /LAST-MODIFIED:20260911T000000Z/);
});

test("ICS escapes injection and folds Unicode safely at 75 octets", () => {
  const title = "中文🙂".repeat(40) + ",;\\\r\nBEGIN:VEVENT";
  const raw = renderCalendarFeed(project, [record("safe", "todos", { date: "2026-09-10", title })], "https://app.example.test");
  for (const line of raw.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75);
  const unfolded = raw.replace(/\r\n /g, "");
  assert.equal(unfolded.match(/\r\nBEGIN:VEVENT\r\n/g).length, 1);
  assert.ok(unfolded.includes("\\,\\;\\\\\\nBEGIN:VEVENT"));
  assert.equal(foldCalendarLine("🙂".repeat(60)).replace(/\r\n /g, ""), "🙂".repeat(60));
  assert.ok(raw.endsWith("END:VCALENDAR\r\n"));
});
