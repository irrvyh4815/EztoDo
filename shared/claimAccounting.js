export const expenseKinds = { work: "工程款", daywork: "點工費", material: "材料費", equipment: "機具費", other: "其他費用" };
export const budgetSources = { base: "原合約內", variation: "已核准追加", extra: "約外另計" };
export const money = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const numeric = (value, label, negative = false) => {
  if (!["number", "string"].includes(typeof value) || String(value).trim() === "" || !Number.isFinite(Number(value)) || Math.abs(Number(value)) > 1e12 || (!negative && Number(value) < 0)) throw new Error(`${label}請填寫有效${negative ? "" : "非負"}金額或數量`);
  return Number(value);
};
export function lineAmount(row = {}) {
  if (row.pricingMode === "quantity") return money(Number(row.quantity || 0) * Number(row.unitPrice || 0));
  if (row.pricingMode === "fixed") return money(row.amount);
  // Old records explicitly stored direct amounts; retain their historical value.
  return Number(row.amount) > 0 ? money(row.amount) : money(Number(row.quantity || 0) * Number(row.unitPrice || 0));
}
export const lineTotal = (rows = []) => money(rows.reduce((sum, row) => sum + lineAmount(row), 0));
export function contractBudget(contract = {}) {
  const original = money(contract.amount);
  const approved = money((contract.variations || []).filter(row => row.status === "已核准").reduce((sum, row) => sum + Number(row.amount || 0), 0));
  return { original, approved, revised: money(original + approved) };
}
export function normalizeVariations(contract = {}) {
  numeric(contract.amount, "原合約金額");
  const ids = new Set();
  const variations = (contract.variations || []).filter(row => [row.title, row.amount, row.reference, row.date, row.note].some(value => String(value ?? "").trim())).map(row => {
    if (!row.id || ids.has(String(row.id))) throw new Error("追加減編號重複或遺失");
    ids.add(String(row.id));
    if (!String(row.title || "").trim()) throw new Error("請填寫追加減項目名稱");
    if (!["待核准", "已核准", "不採用"].includes(row.status)) throw new Error("請選擇追加減狀態");
    return { ...row, title: row.title.trim(), amount: money(numeric(row.amount, "追加減金額", true)) };
  });
  if (contractBudget({ ...contract, variations }).revised < 0) throw new Error("追加減後的合約總額不可小於零");
  return variations;
}
export function normalizeClaim(input = {}, contract) {
  if (!["contract", "temporary"].includes(input.sourceType)) throw new Error("請選擇請款方式");
  if (input.sourceType === "temporary") numeric(input.contractAmount === "" || input.contractAmount == null ? 0 : input.contractAmount, "臨時發包預估額");
  if (!String(input.vendor || "").trim()) throw new Error("請填寫廠商名稱");
  if (!/^\d{4}[-/](0[1-9]|1[0-2])$/.test(input.month || "")) throw new Error("請選擇有效請款月份");
  if (input.sourceType === "contract" && (!contract || String(contract.id) !== String(input.contractId))) throw new Error("請選擇有效的工程合約");
  const details = (input.details || []).filter(row => [row.item, row.quantity, row.unitPrice, row.amount, row.reference, row.note].some(value => String(value ?? "").trim())).map((row, index) => {
    if (!String(row.item || "").trim()) throw new Error(`第 ${index + 1} 筆請填寫工項／品名`);
    if (!expenseKinds[row.category] || !budgetSources[row.budgetSource]) throw new Error(`第 ${index + 1} 筆請選擇費用類別與計價歸屬`);
    if (input.sourceType !== "contract" && row.budgetSource !== "extra") throw new Error("無合約請款的明細應選擇約外另計");
    const variation = contract?.variations?.find(item => String(item.id) === String(row.variationId) && item.status === "已核准" && Number(item.amount) > 0);
    if (row.budgetSource === "variation" && !variation) throw new Error(`第 ${index + 1} 筆請選擇已核准的追加項目`);
    if (row.pricingMode === "quantity") {
      numeric(row.quantity, "數量"); numeric(row.unitPrice, "單價");
      if (!String(row.unit || "").trim()) throw new Error(`第 ${index + 1} 筆請填寫計量單位`);
    } else if (row.pricingMode === "fixed") numeric(row.amount, "本列金額");
    else throw new Error("請選擇計價方式");
    const amount = lineAmount(row);
    numeric(amount, "本列合計");
    return { ...row, amount, variationId: row.budgetSource === "variation" ? variation.id : "", variationTitle: row.budgetSource === "variation" ? variation.title : "" };
  });
  if (!details.length) throw new Error("請至少新增一筆請款明細");
  const grossAmount = lineTotal(details);
  const deductions = Object.fromEntries(["retentionAmount", "cleaningFee", "insuranceFee", "otherDeduction"].map(key => [key, money(numeric(input[key] === "" || input[key] == null ? 0 : input[key], "扣款"))]));
  const deductionTotal = money(Object.values(deductions).reduce((sum, value) => sum + value, 0));
  if (deductionTotal > grossAmount) throw new Error("扣款合計大於本期請款，請確認金額（不會自動歸零）");
  return { ...input, accountingVersion: 2, ...deductions, details, month: input.month.replace("-", "/"), grossAmount, netAmount: money(grossAmount - deductionTotal), amount: money(grossAmount - deductionTotal),
    contractId: input.sourceType === "contract" ? contract.id : "", contractAmount: contract ? contractBudget(contract).revised : money(input.contractAmount),
    contractBudgetSnapshot: contract ? contractBudget(contract) : null,
  };
}
export function claimBudgetUsage(claims = [], contract, editingId = "") {
  const result = { base: 0, variation: 0, extra: 0, byVariation: {} };
  for (const claim of claims) {
    if (String(claim.id) === String(editingId) || claim.sourceType === "temporary" || !contract || !(String(claim.contractId || "") === String(contract.id) || (!claim.contractId && claim.vendor === contract.vendor && claim.contract === contract.name))) continue;
    if (claim.accountingVersion !== 2) { result.base += Number(claim.grossAmount ?? claim.claimAmount ?? claim.amount ?? lineTotal(claim.details)); continue; }
    for (const row of claim.details || []) {
      const source = row.budgetSource || "base", amount = lineAmount(row);
      result[source] = money((result[source] || 0) + amount);
      if (source === "variation") result.byVariation[row.variationId] = money((result.byVariation[row.variationId] || 0) + amount);
    }
  }
  return result;
}
export function expenseTotals(rows = []) {
  const totals = Object.fromEntries(Object.keys(expenseKinds).map(key => [key, 0]));
  rows.forEach(row => { const key = row.category || "work"; totals[key] = money((totals[key] || 0) + lineAmount(row)); });
  return totals;
}
export function legacyClaimRows(claim = {}) {
  const rows = claim.details?.length ? claim.details : [{ item: "原請款金額", amount: claim.grossAmount ?? claim.amount ?? "", pricingMode: "fixed" }];
  return rows.map((row, index) => ({ ...row, id: row.id || `legacy-${index}`, category: row.category || "work", budgetSource: row.budgetSource || (claim.sourceType === "temporary" ? "extra" : "base"),
    pricingMode: row.pricingMode || (Number(row.amount) > 0 && money(row.amount) !== money(Number(row.quantity || 0) * Number(row.unitPrice || 0)) ? "fixed" : "quantity"),
  }));
}
