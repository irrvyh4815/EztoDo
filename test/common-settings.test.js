import test from "node:test";
import assert from "node:assert/strict";

import {
  canonicalCommonSettingName,
  countCommonSettingUsage,
  normalizeCommonSettings,
  removeCommonSettingItem,
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

test("permanent deletion removes only the selected common setting and resequences order", () => {
  const settings = normalizeCommonSettings({
    crews: [
      { id: "crew-a", name: "甲工班", sortOrder: 3, isActive: true },
      { id: "crew-b", name: "乙工班", sortOrder: 8, isActive: true },
    ],
  });
  const next = removeCommonSettingItem(settings, "crews", "crew-a");

  assert.deepEqual(
    next.crews.map((item) => ({ id: item.id, sortOrder: item.sortOrder })),
    [{ id: "crew-b", sortOrder: 1 }],
  );
  assert.equal(next.materials.length, settings.materials.length);
});

test("common setting usage counts ids, names, and aliases", () => {
  const setting = {
    id: "crew-masonry",
    name: "泥作工班",
    statisticsCategory: "泥作工班",
    aliases: ["泥作班"],
  };
  const reports = [
    {
      work: [
        { commonSettingId: "crew-masonry", trade: "舊名稱" },
        { trade: "泥作班" },
      ],
    },
  ];

  assert.equal(countCommonSettingUsage(reports, "crews", setting), 2);
});
