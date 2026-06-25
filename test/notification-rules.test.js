import test from "node:test";
import assert from "node:assert/strict";

import {
  isTimedNotificationPast,
  notificationDateTimeLabel,
  notificationScheduledAt,
  shouldShowTimedNotification,
} from "../src/notificationRules.js";

test("timed notification remains visible through the two-hour grace period", () => {
  const item = { date: "2026-06-25", time: "10:00" };

  assert.equal(
    shouldShowTimedNotification(item, new Date(2026, 5, 25, 11, 59)),
    true,
  );
  assert.equal(
    shouldShowTimedNotification(item, new Date(2026, 5, 25, 12, 0)),
    true,
  );
  assert.equal(
    shouldShowTimedNotification(item, new Date(2026, 5, 25, 12, 1)),
    false,
  );
});

test("future memo or todo appears only inside the upcoming notification range", () => {
  const now = new Date(2026, 5, 25, 9, 0);

  assert.equal(
    shouldShowTimedNotification({ date: "2026-07-02", time: "09:00" }, now, 7),
    true,
  );
  assert.equal(
    shouldShowTimedNotification({ date: "2026-07-02", time: "09:01" }, now, 7),
    false,
  );
});

test("legacy date-only records use the end of day as their reminder time", () => {
  const item = { date: "2026-06-25" };
  const scheduled = notificationScheduledAt(item);

  assert.equal(scheduled.getHours(), 23);
  assert.equal(scheduled.getMinutes(), 59);
  assert.equal(notificationDateTimeLabel(item), "2026-06-25");
  assert.equal(isTimedNotificationPast(item, new Date(2026, 5, 25, 23, 58)), false);
});
