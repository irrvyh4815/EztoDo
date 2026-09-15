import test from "node:test";
import assert from "node:assert/strict";
import { contractBudget, normalizeVariations, normalizeClaim, lineAmount, lineTotal, claimBudgetUsage, legacyClaimRows, expenseTotals } from "../shared/claimAccounting.js";

const contract = { id: "c", vendor: "廠商", name: "工程", amount: 100000, variations: [{ id: "v", title: "追加", amount: 20000, status: "已核准" }, { id: "d", title: "減帳", amount: -5000, status: "已核准" }, { id: "p", title: "未核准", amount: 30000, status: "待核准" }] };
const row = { item: "點工", category: "daywork", budgetSource: "variation", variationId: "v", pricingMode: "quantity", quantity: 6, unit: "人日", unitPrice: 2500 };
const claim = { accountingVersion: 2, sourceType: "contract", contractId: "c", vendor: "廠商", month: "2026/09", details: [row], retentionAmount: 1500 };

test("contract variations count approved positive and negative changes once", () => {
  assert.deepEqual(contractBudget(contract), { original: 100000, approved: 15000, revised: 115000 });
  assert.equal(normalizeVariations(contract).length, 3);
  assert.throws(() => normalizeVariations({ ...contract, variations: [{ id: "n", title: "減帳", amount: -100001, status: "已核准" }] }), /小於零/);
  assert.throws(() => normalizeVariations({ ...contract, variations: [...contract.variations, contract.variations[0]] }), /重複/);
  assert.throws(() => normalizeVariations({ ...contract, variations: [{ id: "n", title: "追加", amount: "NaN", status: "已核准" }] }), /金額/);
});

test("quantity pricing ignores stale saved amount while direct pricing is explicit, including zero", () => {
  assert.equal(lineAmount({ ...row, amount: 8000 }), 15000);
  assert.equal(lineAmount({ ...row, quantity: 7, amount: 15000 }), 17500);
  assert.equal(lineAmount({ ...row, pricingMode: "fixed", amount: 0 }), 0);
  assert.equal(lineAmount({ ...row, pricingMode: "fixed", amount: 5000 }), 5000);
  assert.equal(lineTotal([{ pricingMode: "quantity", quantity: 3, unitPrice: .1 }, { pricingMode: "fixed", amount: .2 }]), .5);
});

test("claim totals include extra labor/materials but contract usage excludes them and the edited claim", () => {
  const extra = { ...row, item: "材料代墊", category: "material", budgetSource: "extra", quantity: 10, unit: "包", unitPrice: 100 };
  const saved = normalizeClaim({ ...claim, details: [row, extra] }, contract);
  assert.equal(saved.grossAmount, 16000); assert.equal(saved.netAmount, 14500);
  assert.equal(saved.details[0].variationTitle, "追加");
  assert.equal(saved.contractAmount, 115000);
  assert.deepEqual(expenseTotals(saved.details), { work: 0, daywork: 15000, material: 1000, equipment: 0, other: 0 });
  const history = [{ ...saved, id: "a" }, { ...saved, id: "editing" }, { ...saved, id: "foreign", contractId: "other" }];
  assert.deepEqual(claimBudgetUsage(history, contract, "editing"), { base: 0, variation: 15000, extra: 1000, byVariation: { v: 15000 } });
  assert.equal(contractBudget(contract).revised, 115000);
});

test("unapproved changes, missing contracts, bad units and excessive deductions are rejected", () => {
  assert.throws(() => normalizeClaim(claim, null), /合約/);
  assert.throws(() => normalizeClaim({ ...claim, details: [{ ...row, variationId: "p" }] }, contract), /已核准/);
  assert.throws(() => normalizeClaim({ ...claim, details: [{ ...row, unit: "" }] }, contract), /單位/);
  assert.throws(() => normalizeClaim({ ...claim, cleaningFee: 15001 }, contract), /扣款合計/);
  assert.throws(() => normalizeClaim({ ...claim, otherDeduction: -1 }, contract), /非負/);
  assert.throws(() => normalizeClaim({ ...claim, details: [{ ...row, quantity: 1e12, unitPrice: 1e12 }] }, contract), /合計/);
  assert.throws(() => normalizeClaim({ ...claim, month: "2026/13" }, contract), /月份/);
  assert.throws(() => normalizeClaim({ ...claim, sourceType: "temporary" }, null), /約外/);
});

test("legacy claims retain direct historical totals and upgrade without stale multiplication", () => {
  const rows = legacyClaimRows({ details: [{ item: "原請款", amount: 12000, quantity: 3, unitPrice: 4000 }, { item: "核定總價", amount: 9000, quantity: 3, unitPrice: 4000 }] });
  assert.equal(rows[0].pricingMode, "quantity"); assert.equal(rows[1].pricingMode, "fixed");
  assert.equal(lineTotal(rows), 21000);
  assert.equal(lineAmount({ ...rows[0], quantity: 4 }), 16000);
  assert.equal(lineTotal(legacyClaimRows({ amount: 12345 })), 12345);
  assert.equal(claimBudgetUsage([{ id: "old", vendor: "廠商", contract: "工程", amount: 1000 }], contract).base, 1000);
  assert.equal(claimBudgetUsage([{ id: "temp", sourceType: "temporary", vendor: "廠商", contract: "工程", amount: 1000 }], contract).base, 0);
});
