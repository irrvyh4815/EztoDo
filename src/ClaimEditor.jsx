import React, { useRef, useState } from "react";
import { budgetSources, claimBudgetUsage, contractBudget, expenseKinds, expenseTotals, lineAmount, lineTotal, normalizeVariations, money } from "../shared/claimAccounting.js";
import MeetingTextEditor from "./MeetingTextEditor.jsx";
import "./claimEditor.css";

const format = value => new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 2 }).format(value || 0);
export const newClaimLine = (category = "work", source = "base") => ({ id: crypto.randomUUID(), category, budgetSource: source, pricingMode: "quantity", item: "", quantity: "", unit: category === "daywork" ? "人日" : "", unitPrice: "", amount: "", reference: "", workDate: "", note: "" });
function Field({ label, children }) { return <label className="claim-field"><span>{label}</span>{children}</label>; }
function AmountBox({ label, value }) { return <div><p>{label}</p><strong>{format(value)}</strong></div>; }

export function VariationRows({ value = [], onChange }) {
  const update = (id, key, next) => onChange(value.map(row => row.id === id ? { ...row, [key]: next } : row));
  return <div className="claim-variations"><p className="claim-help">原合約金額不覆寫。追加填正數、減帳填負數，只有「已核准」列入合約總額；請依實際文件設定狀態。待核准項目不列入請款來源。</p>
    {value.map((row, index) => <div className="claim-line" key={row.id}><h4>追加減 {index + 1}</h4><div className="claim-grid">
      <Field label="追加減名稱"><input value={row.title || ""} onChange={e => update(row.id, "title", e.target.value)} placeholder="例如：追加二樓衛浴配管" /></Field>
      <Field label="追加減金額（減帳填負數）"><input type="number" step="0.01" value={row.amount ?? ""} onChange={e => update(row.id, "amount", e.target.value)} /></Field>
      <Field label="核准狀態"><select value={row.status} onChange={e => update(row.id, "status", e.target.value)}>{["待核准", "已核准", "不採用"].map(text => <option key={text}>{text}</option>)}</select></Field>
      <Field label="追加單號 / 核准依據"><input value={row.reference || ""} onChange={e => update(row.id, "reference", e.target.value)} placeholder="例如：追加單 A-01／會議日期" /></Field>
      <Field label="日期"><input type="date" value={row.date || ""} onChange={e => update(row.id, "date", e.target.value)} /></Field>
      <Field label="原因 / 備註"><input value={row.note || ""} onChange={e => update(row.id, "note", e.target.value)} /></Field>
    </div></div>)}
    <button type="button" className="claim-add" onClick={() => onChange([...value, { id: crypto.randomUUID(), title: "", amount: "", status: "待核准", reference: "", date: "", note: "" }])}>＋ 登錄追加減</button>
    <p className="claim-help">不需使用的紀錄請改為「不採用」，保留追加減歷程。調整已請款項目可能造成超額，請一併核對既有請款。</p>
  </div>;
}

function ContractVariationManager({ contract, onSave }) {
  const [rows, setRows] = useState(contract.variations || []);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  async function save() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage("");
    try { const next = { ...contract, variations: normalizeVariations({ ...contract, variations: rows }), variationVersion: 1 }; await onSave(next); setMessage("追加減已儲存，請款可選擇已核准項目。"); }
    catch (error) { setMessage(error.message || "追加減儲存失敗，內容已保留"); }
    finally { lock.current = false; setBusy(false); }
  }
  return <details className="claim-management"><summary>管理此合約追加減（獨立儲存）</summary><fieldset disabled={busy}><VariationRows value={rows} onChange={setRows} /><button type="button" className="claim-save" onClick={save}>{busy ? "儲存中…" : "儲存合約追加減"}</button></fieldset>{message && <p role="status" className="claim-help">{message}</p>}</details>;
}

export default function ClaimEditor({ draft, setDraft, contracts, claims, editingId, saving, error, onSave, onCancel, onUpdateContract, children }) {
  const contract = draft.sourceType === "contract" ? contracts.find(item => item.id === draft.contractId) : null;
  const budget = contractBudget(contract || {});
  const usage = claimBudgetUsage(claims, contract, editingId);
  const totals = expenseTotals(draft.details);
  const gross = lineTotal(draft.details);
  const deductions = money(["retentionAmount", "cleaningFee", "insuranceFee", "otherDeduction"].reduce((sum, key) => sum + Number(draft[key] || 0), 0));
  const included = lineTotal(draft.details.filter(row => row.budgetSource !== "extra"));
  const remaining = money(budget.revised - usage.base - usage.variation - included);
  const change = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const updateLine = (id, key, value) => setDraft(current => ({ ...current, details: current.details.map(row => row.id === id ? { ...row, [key]: value } : row) }));
  function selectContract(id) {
    const selected = contracts.find(item => item.id === id);
    setDraft(current => ({ ...current, sourceType: "contract", contractId: id, vendor: selected?.vendor || "", trade: selected?.trade || "", contract: selected?.name || "", contractAmount: contractBudget(selected).revised,
      details: current.details.map(row => ({ ...row, budgetSource: "base", variationId: "", variationTitle: "" })) }));
  }
  const input = (key, label, type = "text") => <Field label={label}><input type={type} step={type === "number" ? "0.01" : undefined} value={draft[key] ?? ""} onChange={e => change(key, e.target.value)} /></Field>;
  function add(category = "work", after) {
    setDraft(current => { const rows = [...current.details]; const index = after ? rows.findIndex(row => row.id === after) + 1 : rows.length; rows.splice(index, 0, newClaimLine(category, current.sourceType === "contract" ? "base" : "extra")); return { ...current, details: rows }; });
  }
  return <form className="claim-editor" onSubmit={e => { e.preventDefault(); onSave(); }}><fieldset disabled={saving}>
    <header><h2>{editingId ? "編輯廠商請款" : "新增廠商請款"}</h2><p>先確認合約，再列本期費用，最後核對扣款與應付金額。以下金額請使用一致的含稅／未稅口徑，系統不自動加稅。</p></header>
    <section className="claim-block claim-blue" aria-label="合約與期別"><h3>01　廠商、合約與期別</h3><div className="claim-grid">
      <Field label="請款方式"><select value={draft.sourceType} onChange={e => e.target.value === "contract" ? selectContract(contracts[0]?.id || "") : setDraft(current => ({ ...current, sourceType: "temporary", contractId: "", contract: "", contractAmount: "", details: current.details.map(row => ({ ...row, budgetSource: "extra", variationId: "", variationTitle: "" })) }))}><option value="contract" disabled={!contracts.length}>有合約請款</option><option value="temporary">無合約 / 臨時叫工</option></select></Field>
      {draft.sourceType === "contract" && <Field label="工程合約"><select value={draft.contractId} onChange={e => selectContract(e.target.value)}><option value="">請選擇合約</option>{contracts.map(item => <option key={item.id} value={item.id}>{item.vendor}｜{item.name}</option>)}</select></Field>}
      {input("vendor", "廠商名稱")}{input("trade", "工程類別")}
      {draft.sourceType === "temporary" && <>{input("contract", "臨時發包 / 工作名稱")}{input("contractAmount", "本次臨時發包預估總額", "number")}</>}
      {input("period", "期別 / 請款單號")}
      <Field label="請款月份"><input type="month" value={String(draft.month || "").replace("/", "-")} onChange={e => change("month", e.target.value.replace("-", "/"))} required /></Field>
    </div>
    {contract && <><div className="claim-budget"><AmountBox label="原合約" value={budget.original} /><AmountBox label="核准追加減" value={budget.approved} /><AmountBox label="調整後合約" value={budget.revised} /><AmountBox label="以前各期已請（含未付款）" value={usage.base + usage.variation} /></div><p className="claim-help">合約只加計一次核准追加減；本期請款不會再次增加合約額。舊版未分類請款暫視為原合約內，請於編輯時核對。</p>
      {onUpdateContract && <ContractVariationManager key={`${contract.id}-${JSON.stringify(contract.variations || [])}`} contract={contract} onSave={onUpdateContract} />}</>}
    </section>
    <section className="claim-block claim-green" aria-label="本期請款明細"><h3>02　本期請款明細</h3><p className="claim-help">只填本期新增請款，不填歷次累計。費用類別與合約歸屬分開：點工、材料也可能已含在原約內。</p>
      <div className="claim-quick-add">{Object.entries(expenseKinds).map(([key, label]) => <button type="button" key={key} onClick={() => add(key)}>＋ {label}</button>)}</div>
      {draft.details.map((row, index) => <article key={row.id} className="claim-line" data-category={row.category} aria-label={`請款明細 ${index + 1}`}>
        <div className="claim-line-heading"><h4>{String(index + 1).padStart(2, "0")}　{expenseKinds[row.category]}</h4><button type="button" disabled={draft.details.length === 1} onClick={() => change("details", draft.details.filter(item => item.id !== row.id))}>移除此列</button></div>
        <div className="claim-grid"><Field label="費用類別"><select value={row.category} onChange={e => updateLine(row.id, "category", e.target.value)}>{Object.entries(expenseKinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
          <Field label="計價歸屬"><select value={row.budgetSource} onChange={e => updateLine(row.id, "budgetSource", e.target.value)}>{Object.entries(budgetSources).filter(([key]) => draft.sourceType === "contract" || key === "extra").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
          {row.budgetSource === "variation" && <Field label="對應追加項目"><select value={row.variationId || ""} onChange={e => updateLine(row.id, "variationId", e.target.value)}><option value="">選擇已核准追加</option>{(contract?.variations || []).filter(item => item.status === "已核准" && Number(item.amount) > 0).map(item => <option key={item.id} value={item.id}>{item.title}｜核准 {format(item.amount)}｜前期已請 {format(usage.byVariation[item.id])}</option>)}</select></Field>}
          <Field label="工項 / 品名"><input value={row.item || ""} onChange={e => updateLine(row.id, "item", e.target.value)} placeholder={row.category === "daywork" ? "例如：清運點工 3 人 × 2 天" : row.category === "material" ? "例如：水泥 40kg" : "例如：二樓配管完成估驗"} /></Field>
          <Field label="施工 / 進貨日期"><input type="date" value={row.workDate || ""} onChange={e => updateLine(row.id, "workDate", e.target.value)} /></Field>
          <Field label="計價方式"><select value={row.pricingMode} onChange={e => updateLine(row.id, "pricingMode", e.target.value)}><option value="quantity">數量 × 單價（自動計算）</option><option value="fixed">直接填本列金額</option></select></Field>
          {row.pricingMode === "quantity" ? <><Field label={row.category === "daywork" ? "點工數量（人日 / 人時）" : "數量"}><input type="number" min="0" step="any" value={row.quantity ?? ""} onChange={e => updateLine(row.id, "quantity", e.target.value)} /></Field><Field label="單位"><input value={row.unit || ""} onChange={e => updateLine(row.id, "unit", e.target.value)} placeholder={row.category === "daywork" ? "人日、人時" : "包、公斤、式"} /></Field><Field label="單價"><input type="number" min="0" step="0.01" value={row.unitPrice ?? ""} onChange={e => updateLine(row.id, "unitPrice", e.target.value)} /></Field></> : <Field label="本列金額"><input type="number" min="0" step="0.01" value={row.amount ?? ""} onChange={e => updateLine(row.id, "amount", e.target.value)} /></Field>}
          <Field label="點工單 / 送貨單 / 發票編號"><input value={row.reference || ""} onChange={e => updateLine(row.id, "reference", e.target.value)} /></Field><Field label="本列備註"><input value={row.note || ""} onChange={e => updateLine(row.id, "note", e.target.value)} /></Field>
        </div>{row.category === "daywork" && <p className="claim-help">例如 3 人 × 2 天＝6 人日，數量填 6，單價填每人日費用。簽認點工單可附在下方照片。</p>}
        <div className="claim-line-footer"><strong>本列小計　{format(lineAmount(row))}</strong><button type="button" onClick={() => add(row.category, row.id)}>＋ 在下方新增一筆</button></div>
      </article>)}
      <div className="claim-budget">{Object.entries(expenseKinds).map(([key, label]) => <AmountBox key={key} label={label} value={totals[key]} />)}</div>
    </section>
    <section className="claim-block claim-amber" aria-label="扣款與付款核對"><h3>03　扣款與本期應付</h3><div className="claim-grid">{input("retentionAmount", "保留款", "number")}{input("cleaningFee", "清潔費扣款", "number")}{input("insuranceFee", "保險費扣款", "number")}{input("otherDeduction", "其他扣款 / 代墊扣回", "number")}
      <Field label="請款狀態"><select value={draft.status} onChange={e => change("status", e.target.value)}>{Array.from(new Set(["待送審", "審核中", "退回修正", "待付款", "已付款", "已結案", draft.status])).map(text => <option key={text}>{text}</option>)}</select></Field></div>
      <div className="claim-budget"><AmountBox label="本期請款" value={gross} /><AmountBox label="扣款合計" value={deductions} /><AmountBox label="本期應付" value={money(gross - deductions)} />{contract && <AmountBox label="本期後合約餘額" value={remaining} />}</div>
      {contract && remaining < 0 && <p className="claim-warning" role="alert">本期合約內請款超過調整後合約總額，請確認追加核准、約外費用歸屬或是否重複請款。</p>}
      {contract && usage.base + lineTotal(draft.details.filter(row => row.budgetSource === "base")) > budget.original && <p className="claim-warning" role="alert">原約內累計請款超過原合約金額，請確認是否應歸入已核准追加，不要混列原約工程款。</p>}
      {contract && (contract.variations || []).filter(v => v.status === "已核准" && Number(v.amount) > 0).map(v => { const total = (usage.byVariation[v.id] || 0) + lineTotal(draft.details.filter(row => row.budgetSource === "variation" && row.variationId === v.id)); return total > Number(v.amount) ? <p key={v.id} role="alert" className="claim-warning">追加「{v.title}」累計請款 {format(total)}，超過核准額 {format(v.amount)}，請核對。</p> : null; })}
      <p className="claim-help">約外另計費用計入本期應付，但不占用合約餘額。餘額以請款總額計算，保留款及扣款不會釋出合約額度。</p>
      <MeetingTextEditor label="估驗依據 / 扣款原因 / 請款備註" recordLabel="請款" value={draft.note || ""} onChange={value => change("note", value)} placeholder="記錄追加核准依據、點工簽認、材料代墊或扣款原因" />
    </section>
    <section className="claim-block" aria-label="請款附件"><h3>04　估驗單、點工單與送貨憑證</h3>{children}</section>
    {error && <p className="claim-warning" role="alert">{error}。輸入內容已保留。</p>}
    <footer className="claim-actions"><span>本期應付 <strong>{format(money(gross - deductions))}</strong></span><button type="button" onClick={onCancel}>取消</button><button type="submit" className="claim-save">{saving ? "儲存中…" : editingId ? "更新請款" : "儲存請款"}</button></footer>
  </fieldset></form>;
}
