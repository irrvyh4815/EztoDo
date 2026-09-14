import React, { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Search, X } from "lucide-react";
import { countCommonSettingUsage, normalizeCommonSettingItem, removeCommonSettingItem, filterCommonSettingItems, moveCommonSettingItem } from "./commonSettings.js";

const sections = [
  { type: "crews", label: "工班", example: "泥作工班" },
  { type: "materials", label: "材料", example: "水泥" },
  { type: "equipment", label: "機具設備", example: "挖土機" },
];
const button = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40";
const field = "mt-2 block min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const makeDraft = (item = {}) => ({ name: item.name || "", unit: item.unit || "", specification: item.specification || "", statisticsCategory: item.statisticsCategory || "", aliases: (item.aliases || []).join("、"), isActive: item.isActive ?? true });

export default function CommonSettings({ p, settings, onSave, dailyReports = [], loading, error }) {
  const [type, setType] = useState("crews");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("active");
  const [editor, setEditor] = useState(null);
  const [draft, setDraft] = useState(makeDraft);
  const [initial, setInitial] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [externalError, setExternalError] = useState(error);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState("");
  const dialog = useRef(null);
  const nameInput = useRef(null);
  const confirmation = useRef(null);
  const lock = useRef(false);
  const titleId = useId();
  const section = sections.find(s => s.type === type);
  const canEdit = p.canEdit !== false;
  const items = [...(settings[type] || [])].sort((a,b) => a.sortOrder-b.sortOrder || a.name.localeCompare(b.name,"zh-Hant"));
  const visible = filterCommonSettingItems(items, query, filter);
  const activeCount = items.filter(item => item.isActive).length;
  const editing = editor?.id;
  const dirty = JSON.stringify(draft) !== initial;
  const canSort = !query.trim() && filter === "all";
  useEffect(() => { setExternalError(error); }, [error]);

  useEffect(() => {
    if (editor) { dialog.current.showModal(); nameInput.current?.focus(); }
    else dialog.current.close();
  }, [editor]);
  useEffect(() => { if (confirm) confirmation.current?.focus(); }, [confirm]);
  useEffect(() => {
    if (!editor || !dirty) return;
    const handler = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [editor, dirty]);

  function open(item = {}) {
    const next = makeDraft(item);
    setDraft(next); setInitial(JSON.stringify(next)); setEditor(item);
    setConfirm(""); setFormError(""); setMessage("");
  }
  function close() {
    if (lock.current) return;
    if (dirty) setConfirm("discard"); else { setEditor(null); setConfirm(""); }
  }
  async function persist(next, success) {
    if (lock.current || loading || !canEdit) return false;
    lock.current = true; setBusy(true); setFormError(""); setMessage("");
    try { await onSave(next); setExternalError(""); setMessage(success); return true; }
    catch (err) { setFormError(err.message || "儲存失敗，內容已保留，請重試。"); return false; }
    finally { lock.current = false; setBusy(false); }
  }
  const collection = next => ({ ...settings, [type]: next.map((item,index) => ({ ...item, sortOrder: index+1 })) });
  async function save(another = false) {
    if (lock.current) return;
    const name = draft.name.trim();
    if (!name) { setFormError(`請輸入${section.label}名稱`); nameInput.current.focus(); return; }
    const duplicate = items.find(item => item.id !== editing && item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase());
    if (duplicate) { setFormError(`「${duplicate.name}」已存在${duplicate.isActive ? "" : "（已停用，可在清單篩選已停用後重新啟用）"}，請勿重複新增。`); return; }
    const nextItem = normalizeCommonSettingItem({ ...editor, ...draft, id: editing || crypto.randomUUID(), name, statisticsCategory: draft.statisticsCategory.trim() || name }, items.length, type);
    const next = editing ? items.map(item => item.id === editing ? nextItem : item) : [...items, nextItem];
    if (await persist(collection(next), `已${editing ? "更新" : "新增"}「${name}」`)) {
      if (another) { const empty = makeDraft(); setEditor({}); setDraft(empty); setInitial(JSON.stringify(empty)); setConfirm(""); }
      else setEditor(null);
    }
  }
  async function toggle(item) {
    await persist(collection(items.map(row => row.id === item.id ? { ...row, isActive: !row.isActive } : row)), `已${item.isActive ? "停用" : "重新啟用"}「${item.name}」`);
  }
  async function move(item, direction) {
    if (!canSort) return;
    await persist(collection(moveCommonSettingItem(items,item.id,direction)), `已調整「${item.name}」順序`);
  }
  async function remove() {
    if (await persist(removeCommonSettingItem(settings,type,editing), `已永久刪除「${editor.name}」`)) { setEditor(null); setConfirm(""); }
  }

  return <section>
    <h1 className="text-2xl font-bold">常用設定</h1>
    <p className="mb-5 mt-1 text-sm text-slate-500">{p.name}｜先建立常用名稱，填寫施工日報時直接選用。</p>
    <div className="mb-4 grid grid-cols-3 gap-2" aria-label="常用設定分類">{sections.map(s => <button key={s.type} type="button" disabled={busy || loading} aria-pressed={type===s.type} onClick={() => { setType(s.type); setQuery(""); setFilter("active"); setFormError(""); setMessage(""); }} className={`${button} ${type===s.type ? "border-slate-900 bg-slate-900 text-white" : "bg-white"}`}>{s.label}<span className="text-xs opacity-70">{settings[s.type]?.length || 0}</span></button>)}</div>
    <div className="mb-4 rounded-2xl border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">常用{section.label}</h2><p className="mt-1 text-xs text-slate-500">啟用 {activeCount} 項 · 停用 {items.length-activeCount} 項。施工日報只列出啟用項目。</p></div>{canEdit && <button type="button" disabled={busy || loading} onClick={() => open()} className={`${button} border-slate-900 bg-slate-900 text-white`}><Plus className="h-4 w-4" />新增{section.label}</button>}</div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input aria-label={`搜尋${section.label}`} value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋名稱、別名、單位或統計分類" className={`${field} !mt-0 !pl-9`} /></label><select aria-label="篩選啟用狀態" value={filter} onChange={e=>setFilter(e.target.value)} className={`${field} !mt-0 sm:!w-40`}><option value="active">啟用中</option><option value="all">全部（可排序）</option><option value="inactive">已停用</option></select></div>
      <p className="mt-3 text-xs text-slate-500">顯示 {visible.length} / {items.length} 項。{canSort ? "使用上下箭頭調整日報選單順序。" : "需要排序時，切換「全部」並清空搜尋。"}</p>
      {query && <button type="button" onClick={()=>setQuery("")} className={`${button} mt-2 bg-white`}>清除搜尋</button>}
    </div>
    {loading && <p role="status" className="p-4">讀取常用設定中…</p>}
    {!editor && (externalError || formError) && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError || externalError}</p>}
    {!editor && message && <p role="status" className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {!loading && <div className="grid gap-3">{visible.map(item => <article key={item.id} className="min-w-0 rounded-2xl border bg-white p-4"><div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-bold">{item.name}</h3><span className={`rounded-full px-2 py-1 text-xs ${item.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{item.isActive ? "啟用中" : "已停用"}</span>{item.unit && <span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-800">{item.unit}</span>}</div><p className="mt-2 break-words text-sm text-slate-500">統計名稱：{item.statisticsCategory || item.name}{item.specification ? ` · 規格：${item.specification}` : ""}</p>{item.aliases?.length > 0 && <p className="mt-1 break-words text-xs text-slate-500">其他叫法：{item.aliases.join("、")}</p>}</div>{canEdit && <div className="flex shrink-0 flex-wrap gap-2">{canSort && <><button type="button" disabled={busy || items[0]?.id===item.id} aria-label={`上移 ${item.name}`} onClick={()=>move(item,-1)} className={`${button} bg-white`}><ArrowUp className="h-4 w-4" /></button><button type="button" disabled={busy || items.at(-1)?.id===item.id} aria-label={`下移 ${item.name}`} onClick={()=>move(item,1)} className={`${button} bg-white`}><ArrowDown className="h-4 w-4" /></button></>}<button type="button" disabled={busy} aria-label={`編輯 ${item.name}`} onClick={()=>open(item)} className={`${button} bg-white`}><Pencil className="h-4 w-4" />編輯</button><button type="button" disabled={busy} onClick={()=>toggle(item)} aria-label={`${item.isActive ? "停用" : "重新啟用"} ${item.name}`} className={`${button} bg-slate-50 text-slate-700`}>{item.isActive ? "停用" : "重新啟用"}</button></div>}</div></article>)}</div>}
    {!loading && !visible.length && <div className="rounded-2xl border border-dashed p-6 text-center"><p className="font-semibold">{query ? "沒有符合的項目" : `目前沒有${filter === "inactive" ? "停用的" : ""}${section.label}`}</p><p className="mt-2 text-sm text-slate-500">可調整搜尋與篩選，或新增常用項目。</p>{(query || filter!=="all") && <button className={`${button} mt-3 bg-white`} onClick={()=>{setQuery("");setFilter("all");}}>清除篩選</button>}</div>}
    <dialog ref={dialog} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();close();}} className="m-auto max-h-[90dvh] w-[calc(100%-1rem)] max-w-xl overflow-y-auto rounded-2xl border bg-white p-4 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3"><h2 id={titleId} className="text-xl font-bold">{editing ? "編輯" : "新增"}{section.label}</h2><button type="button" disabled={busy} aria-label="關閉常用設定編輯" onClick={close} className={`${button} bg-white`}><X className="h-4 w-4" /></button></div>
      <p className="mb-4 text-sm text-slate-500">名稱為必填；其他資料可稍後補齊。儲存後即可在施工日報選用。</p>
      {formError && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
      {message && <p role="status" className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <form onKeyDown={e=>{if(e.key==="Enter" && (e.nativeEvent.isComposing || e.keyCode===229)) e.preventDefault();}} onSubmit={e=>{e.preventDefault();save();}}><fieldset disabled={busy || !!confirm} className="min-w-0 space-y-4">
        <label className="block text-sm font-semibold">{section.label}名稱 *<input ref={nameInput} required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value,statisticsCategory:draft.statisticsCategory===draft.name ? e.target.value : draft.statisticsCategory})} placeholder={`例如：${section.example}`} className={field} /></label>
        {type!=="crews" && <div><label className="block text-sm font-semibold">預設單位<input value={draft.unit} onChange={e=>setDraft({...draft,unit:e.target.value})} placeholder="點選常用單位，也可自行輸入" className={field} /></label><div className="mt-2 flex flex-wrap gap-2">{(type==="materials" ? ["包","公斤","噸","立方米","支","片","組"] : ["台班","台次","小時","天"]).map(unit=><button key={unit} type="button" aria-pressed={draft.unit===unit} onClick={()=>setDraft({...draft,unit})} className={`${button} ${draft.unit===unit ? "border-blue-500 bg-blue-50 text-blue-800" : "bg-white"}`}>{unit}</button>)}</div></div>}
        {type==="equipment" && <label className="block text-sm font-semibold">規格<input value={draft.specification} onChange={e=>setDraft({...draft,specification:e.target.value})} placeholder="例如：120 型" className={field} /></label>}
        <details key={`${type}-${editing || "new"}`} className="rounded-xl border p-3"><summary className="cursor-pointer py-1 text-sm font-semibold">統計名稱與其他叫法（選填）</summary><p className="my-3 text-xs leading-5 text-slate-500">統計名稱留空時使用本項目名稱。「其他叫法」可將泥作、泥作班等名稱對應到同一項目。</p><label className="block text-sm">統計顯示名稱<input value={draft.statisticsCategory} onChange={e=>setDraft({...draft,statisticsCategory:e.target.value})} placeholder={draft.name || "預設與名稱相同"} className={field} /></label><label className="mt-3 block text-sm">其他叫法<textarea rows={3} value={draft.aliases} onChange={e=>setDraft({...draft,aliases:e.target.value})} placeholder="用逗號、頓號或換行分隔，例如：泥作、泥作工、泥作班" className={field} /></label></details>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={draft.isActive} onChange={e=>setDraft({...draft,isActive:e.target.checked})} />啟用於施工日報選單</label>
        <div className="flex flex-wrap gap-2 border-t pt-4"><button type="submit" className={`${button} border-slate-900 bg-slate-900 text-white`}>{busy ? "儲存中…" : "儲存"}</button>{!editing && <button type="button" onClick={()=>save(true)} className={`${button} bg-white`}>儲存並繼續新增</button>}<button type="button" onClick={close} className={`${button} bg-white`}>取消</button></div>
        {editing && <div className="border-t pt-3"><p className="mb-2 text-xs leading-5 text-slate-500">不再使用時建議停用，既有紀錄仍可追溯。</p><button type="button" onClick={()=>setConfirm("delete")} className={`${button} border-red-200 text-red-700`}>永久刪除</button></div>}
      </fieldset></form>
      {confirm && <div ref={confirmation} tabIndex={-1} role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6"><p>{confirm==="delete" ? `確定永久刪除「${editor.name}」？目前偵測到 ${countCommonSettingUsage(dailyReports,type,editor)} 筆施工日報紀錄使用此選項。永久刪除無法復原，可能導致已使用此選項的表單部分數據遺失或無法正確統計，建議優先停用。` : "尚有未儲存的修改，確定放棄並關閉？"}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={()=>confirm==="delete" ? remove() : (setEditor(null),setConfirm(""))} className={`${button} border-red-700 bg-red-700 text-white`}>{confirm==="delete" ? "確認永久刪除" : "放棄修改"}</button><button type="button" disabled={busy} onClick={()=>setConfirm("")} className={`${button} bg-white`}>返回編輯</button></div></div>}
    </dialog>
  </section>;
}
