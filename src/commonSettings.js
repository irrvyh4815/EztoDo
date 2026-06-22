function settingId(prefix, name) {
  return `${prefix}-${name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")}`;
}

function buildItems(prefix, names, extra = {}) {
  return names.map((name, index) => ({
    id: settingId(prefix, name),
    name,
    sortOrder: index + 1,
    isActive: true,
    statisticsCategory: name,
    aliases: [],
    ...extra,
  }));
}

export const defaultCommonSettings = {
  id: "common-settings-default",
  name: "常用設定",
  crews: buildItems("crew", [
    "放樣工班",
    "土方開挖工班",
    "鋼筋工班",
    "模板工班",
    "混凝土澆置工班",
    "水電工班",
    "消防工班",
    "防水工班",
    "泥作工班",
    "磁磚工班",
    "油漆工班",
    "木作工班",
    "鷹架工班",
    "吊掛工班",
    "清潔工班",
    "點工",
    "雜工",
  ]).map((item) =>
    item.name === "泥作工班"
      ? { ...item, aliases: ["泥作", "泥作工", "泥作班"] }
      : item,
  ),
  materials: buildItems(
    "material",
    [
      "水泥",
      "砂",
      "碎石",
      "混凝土",
      "鋼筋",
      "模板",
      "磁磚",
      "填縫劑",
      "油漆",
      "矽利康",
      "PVC 管",
      "電線",
      "防水材",
      "彈性水泥",
    ],
    { unit: "" },
  ).map((item) =>
    item.name === "水泥" ? { ...item, aliases: ["卜特蘭水泥"] } : item,
  ),
  equipment: buildItems(
    "equipment",
    [
      "吊車",
      "堆高機",
      "挖土機",
      "切割機",
      "電鑽",
      "攪拌機",
      "震動機",
      "雷射水平儀",
      "發電機",
      "抽水機",
    ],
    { unit: "台次", specification: "" },
  ).map((item) =>
    item.name === "挖土機"
      ? { ...item, aliases: ["怪手", "120怪手"] }
      : item,
  ),
};

function normalizeAliases(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value || "")
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeCommonSettingItem(item, index, type) {
  const name = String(item?.name || "").trim();
  return {
    ...item,
    id: item?.id || settingId(type, name || `${Date.now()}-${index}`),
    name,
    sortOrder: Number(item?.sortOrder ?? item?.sort_order ?? index + 1),
    isActive: Boolean(item?.isActive ?? item?.is_active ?? true),
    statisticsCategory: String(
      item?.statisticsCategory ?? item?.statistics_category ?? name,
    ).trim(),
    aliases: normalizeAliases(item?.aliases),
    ...(type === "materials" ? { unit: String(item?.unit || "").trim() } : {}),
    ...(type === "equipment"
      ? {
          unit: String(item?.unit || "台次").trim(),
          specification: String(item?.specification || "").trim(),
        }
      : {}),
  };
}

export function normalizeCommonSettings(value = {}) {
  return {
    ...defaultCommonSettings,
    ...value,
    crews: (value.crews || defaultCommonSettings.crews).map((item, index) =>
      normalizeCommonSettingItem(item, index, "crews"),
    ),
    materials: (value.materials || defaultCommonSettings.materials).map((item, index) =>
      normalizeCommonSettingItem(item, index, "materials"),
    ),
    equipment: (value.equipment || defaultCommonSettings.equipment).map((item, index) =>
      normalizeCommonSettingItem(item, index, "equipment"),
    ),
  };
}

export function activeCommonSettingItems(settings, type) {
  return normalizeCommonSettings(settings)[type]
    .filter((item) => item.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "zh-Hant"));
}

function compactName(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("zh-Hant")
    .replace(/[\s\-_/()（）]+/g, "");
}

export function resolveCommonSetting(settings, type, rawName, settingIdValue = "") {
  const items = normalizeCommonSettings(settings)[type] || [];
  const byId = settingIdValue
    ? items.find((item) => item.id === settingIdValue)
    : null;
  if (byId) return byId;

  const target = compactName(rawName);
  if (!target) return null;
  return (
    items.find((item) =>
      [item.name, item.statisticsCategory, ...item.aliases].some(
        (candidate) => compactName(candidate) === target,
      ),
    ) || null
  );
}

export function canonicalCommonSettingName(settings, type, row = {}, field = "name") {
  const rawName = String(row[field] || "").trim();
  const setting = resolveCommonSetting(settings, type, rawName, row.commonSettingId);
  return (
    String(setting?.statisticsCategory || setting?.name || row.statisticsCategory || rawName).trim() ||
    "未分類"
  );
}

export function summarizeDailyReportResources(reports = [], settings = {}) {
  const tradeMap = {};
  const materialMap = {};
  const equipmentMap = {};
  let totalWorkers = 0;

  function addQuantity(map, key, quantity, unit, reportId) {
    const name = String(key || "").trim() || "未分類";
    const amount = Number(quantity || 0);
    if (!map[name]) {
      map[name] = {
        name,
        quantity: 0,
        entries: 0,
        unit: unit || "",
        reportIds: new Set(),
      };
    }
    map[name].quantity += Number.isFinite(amount) ? amount : 0;
    map[name].entries += 1;
    if (reportId) map[name].reportIds.add(reportId);
    if (!map[name].unit && unit) map[name].unit = unit;
  }

  reports.forEach((report, reportIndex) => {
    const reportId = report.id || report.recordId || `${report.date || "report"}-${reportIndex}`;
    (report.work || []).forEach((row) => {
      const name = canonicalCommonSettingName(settings, "crews", row, "trade");
      const workers = Number(row.workers || 0);
      if (!tradeMap[name]) {
        tradeMap[name] = { name, workers: 0, entries: 0, reportIds: new Set() };
      }
      tradeMap[name].workers += Number.isFinite(workers) ? workers : 0;
      tradeMap[name].entries += 1;
      tradeMap[name].reportIds.add(reportId);
      totalWorkers += Number.isFinite(workers) ? workers : 0;
    });

    (report.materials || []).forEach((row) => {
      const setting = resolveCommonSetting(settings, "materials", row.name, row.commonSettingId);
      addQuantity(
        materialMap,
        canonicalCommonSettingName(settings, "materials", row),
        row.quantity,
        row.unit || setting?.unit,
        reportId,
      );
    });

    (report.equipment || []).forEach((row) => {
      const setting = resolveCommonSetting(settings, "equipment", row.name, row.commonSettingId);
      addQuantity(
        equipmentMap,
        canonicalCommonSettingName(settings, "equipment", row),
        row.quantity,
        row.unit || setting?.unit || "台次",
        reportId,
      );
    });
  });

  const sorted = (map, key) =>
    Object.values(map)
      .map((item) => ({ ...item, sourceReports: item.reportIds.size, reportIds: [...item.reportIds] }))
      .sort((a, b) => (Number(b[key]) || 0) - (Number(a[key]) || 0));

  return {
    reportCount: reports.length,
    totalWorkers,
    tradeTotals: sorted(tradeMap, "workers"),
    materialTotals: sorted(materialMap, "quantity"),
    equipmentTotals: sorted(equipmentMap, "quantity"),
  };
}
