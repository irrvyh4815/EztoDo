import test from "node:test";
import assert from "node:assert/strict";

import {
  canonicalCommonSettingName,
  normalizeCommonSettings,
  summarizeDailyReportResources,
} from "../src/commonSettings.js";

test("aliases resolve to one statistics category", () => {
  const settings = normalizeCommonSettings({
    crews: [
      {
        id: "crew-masonry",
        name: "泥作工班",
        statisticsCategory: "泥作工班",
        aliases: ["泥作", "泥作工", "泥作班"],
        isActive: true,
        sortOrder: 1,
      },
    ],
  });

  assert.equal(
    canonicalCommonSettingName(settings, "crews", { trade: "泥作班" }, "trade"),
    "泥作工班",
  );
  assert.equal(
    canonicalCommonSettingName(
      settings,
      "crews",
      { trade: "泥作班", statisticsCategory: "泥作班" },
      "trade",
    ),
    "泥作工班",
  );
});

test("daily summaries merge aliases and retain source report counts", () => {
  const settings = normalizeCommonSettings({
    equipment: [
      {
        id: "equipment-excavator",
        name: "挖土機",
        statisticsCategory: "挖土機",
        aliases: ["怪手", "120怪手"],
        unit: "台次",
        isActive: true,
        sortOrder: 1,
      },
    ],
  });
  const summary = summarizeDailyReportResources(
    [
      { id: "daily-1", equipment: [{ name: "怪手", quantity: 2 }] },
      { id: "daily-2", equipment: [{ name: "120怪手", quantity: 1 }] },
    ],
    settings,
  );

  assert.equal(summary.equipmentTotals[0].name, "挖土機");
  assert.equal(summary.equipmentTotals[0].quantity, 3);
  assert.equal(summary.equipmentTotals[0].sourceReports, 2);
});
