import React, { useMemo, useRef, useState } from "react";
import { Award, Pencil, Plus, Save, Search, UsersRound } from "lucide-react";
import { normalizePersonnel, personnelStatuses } from "../shared/personnel.js";
import useDraftProtection from "./useDraftProtection.js";
import { draftKey, readBrowserDraft } from "./workspaceUX.js";

const fieldClass = "mt-1 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";
const emptyPerson = () => ({ name: "", jobTitle: "", organization: "", workSummary: "", experienceYears: "", expertise: "", certificates: [], phone: "", email: "", startDate: "", endDate: "", status: "在職", note: "" });

export default function Personnel({ project, userId, records, canEdit }) {
  const storageKey = draftKey(userId, project.id || project.name, "personnel");
  const [restored] = useState(() => readBrowserDraft(storageKey));
  const [draft, setDraft] = useState(restored?.draft || null);
  const [editingId, setEditingId] = useState(restored?.editingId || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("");
  const formRef = useRef(null);
  const busyRef = useRef(false);
  const draftData = useMemo(() => ({ draft, editingId }), [draft, editingId]);
  const draftError = useDraftProtection(storageKey, draftData, Boolean(draft), busy);
  const organizations = [...new Set(records.items.map((item) => item.organization).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  const visible = useMemo(() => records.items.filter((item) => {
    const haystack = [item.name, item.jobTitle, item.organization, item.workSummary, item.expertise, ...(item.certificates || []).map((cert) => `${cert.name} ${cert.issuer}`)].join(" ").toLowerCase();
    return (!statusFilter || item.status === statusFilter) && (!organizationFilter || item.organization === organizationFilter) && haystack.includes(query.trim().toLowerCase());
  }), [records.items, query, statusFilter, organizationFilter]);

  function edit(person) {
    if (busyRef.current || !canEdit) return;
    if (draft && !window.confirm("目前有尚未儲存的人員資料，確定放棄並開啟另一筆？")) return;
    setEditingId(person?.id || null);
    setDraft(person ? { ...emptyPerson(), ...person, certificates: (person.certificates || []).map((cert) => ({ ...cert })) } : emptyPerson());
    setError(""); setMessage("");
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }

  async function save(event) {
    event.preventDefault();
    if (busyRef.current || !canEdit) return;
    busyRef.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const person = normalizePersonnel(draft);
      const options = { title: person.name, status: person.status };
      if (editingId) await records.updateItem(editingId, person, options);
      else await records.saveItem(person, options);
      setDraft(null); setEditingId(null); setMessage("人員資料已儲存。");
    } catch (err) { setError(err.message || "儲存失敗，請稍後重試。"); }
    finally { busyRef.current = false; setBusy(false); }
  }

  function field(key, label, { type = "text", required = false, wide = false, multiline = false, placeholder = "" } = {}) {
    return <label className={`block min-w-0 text-sm font-medium ${wide ? "sm:col-span-2" : ""}`} key={key}>
      {label}{required && <span className="text-red-600"> *</span>}
      {multiline ? <textarea className={`${fieldClass} min-h-24`} value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} placeholder={placeholder} />
        : <input className={fieldClass} type={type} value={draft[key]} required={required} min={type === "number" ? 0 : undefined} max={type === "number" ? 100 : undefined} step={type === "number" ? "any" : undefined} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} placeholder={placeholder} />}
    </label>;
  }

  return <div className="space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-white p-5">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold"><UsersRound className="h-6 w-6" />人員配置</h1><p className="mt-1 break-words text-sm text-slate-500">{project.name} · 管理職位、單位與人員經歷</p></div>
      {canEdit && <button className={`${buttonClass} border-slate-900 bg-slate-900 text-white`} disabled={busy || records.loading} onClick={() => edit(null)}><Plus className="h-4 w-4" />新增人員</button>}
      <p className="w-full text-xs text-slate-500">此處為工地人員名冊，登錄人員不會建立登入帳號或授予工地權限。離場人員可保留紀錄。</p>
    </header>
    {(error || records.error || draftError) && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error || records.error || draftError}</p>}
    {draft && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{restored ? "已還原未儲存的人員草稿。" : "草稿暫存於此瀏覽器，不會自動送出。"} 共用電腦使用完畢請儲存或取消草稿。</p>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {!canEdit && <p className="text-sm text-slate-500">你目前只有閱覽權限。</p>}
    {draft && canEdit && <form ref={formRef} onSubmit={save} className="scroll-mt-4 rounded-2xl border bg-white p-4 sm:p-5">
      <h2 className="mb-4 text-lg font-bold">{editingId ? "編輯人員" : "登錄人員"}</h2>
      <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
        {field("name", "姓名", { required: true })}
        {field("jobTitle", "管理職位", { required: true, placeholder: "例如：工地主任、現場工程師、職安人員" })}
        {field("organization", "所屬單位", { required: true, placeholder: "公司、部門或協力廠商" })}
        {field("experienceYears", "相關工作年資（年）", { type: "number", placeholder: "例如：5.5" })}
        {field("phone", "聯絡電話", { type: "tel" })}
        {field("email", "電子郵件", { type: "email" })}
        {field("startDate", "到任日期", { type: "date" })}
        {field("endDate", "離場日期", { type: "date" })}
        <label className="text-sm font-medium">狀態<select className={fieldClass} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>{personnelStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
        {field("workSummary", "工作概要", { wide: true, multiline: true, placeholder: "負責工項、管理範圍與日常工作" })}
        {field("expertise", "專長", { wide: true, multiline: true, placeholder: "例如：施工協調、品質查驗、職業安全衛生" })}
        <div className="min-w-0 space-y-3 sm:col-span-2">
          <h3 className="flex items-center gap-2 font-bold"><Award className="h-4 w-4" />專業證照</h3>
          {draft.certificates.map((certificate, index) => <div key={index} className="grid min-w-0 gap-3 rounded-xl border bg-slate-50 p-3 sm:grid-cols-2">
            {[["name", "證照名稱", "text"], ["issuer", "發證單位", "text"], ["number", "證照字號", "text"], ["expiresAt", "到期日", "date"]].map(([key, label, type]) => <label key={key} className="min-w-0 text-sm">{label}{key === "name" ? " *" : ""}<input aria-label={`第${index + 1}張證照${label}`} type={type} required={key === "name"} className={fieldClass} value={certificate[key]} onChange={(e) => setDraft({ ...draft, certificates: draft.certificates.map((cert, i) => i === index ? { ...cert, [key]: e.target.value } : cert) })} /></label>)}
            <button type="button" className={`${buttonClass} justify-self-start border-red-200 text-red-700`} onClick={() => setDraft({ ...draft, certificates: draft.certificates.filter((_, i) => i !== index) })}>移除此證照</button>
          </div>)}
          <button type="button" className={`${buttonClass} border-slate-200`} disabled={draft.certificates.length >= 50} onClick={() => setDraft({ ...draft, certificates: [...draft.certificates, { name: "", issuer: "", number: "", expiresAt: "" }] })}><Plus className="h-4 w-4" />新增證照</button>
          <p className="text-xs text-slate-500">無到期日的證照可留白。</p>
        </div>
        {field("note", "備註", { wide: true, multiline: true })}
        <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
          <button type="button" className={`${buttonClass} border-slate-200`} onClick={() => { if (window.confirm("確定取消？尚未儲存的修改將不會保留。")) { setDraft(null); setError(""); } }}>取消</button>
          <button type="submit" className={`${buttonClass} border-slate-900 bg-slate-900 text-white`}><Save className="h-4 w-4" />{busy ? "儲存中…" : "儲存人員"}</button>
        </div>
      </fieldset>
    </form>}
    <div className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-3">
      <label className="min-w-0 text-sm"><span className="flex items-center gap-1"><Search className="h-4 w-4" />搜尋人員</span><input className={fieldClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="姓名、職位、單位、專長或證照" /></label>
      <label className="min-w-0 text-sm">所屬單位篩選<select className={fieldClass} value={organizationFilter} onChange={(e) => setOrganizationFilter(e.target.value)}><option value="">所有單位</option>{organizations.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
      <label className="min-w-0 text-sm">人員狀態篩選<select className={fieldClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">所有狀態</option>{personnelStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
    </div>
    <p className="text-sm text-slate-500">共 {records.items.length} 位 · 符合條件 {visible.length} 位</p>
    {records.loading ? <p role="status" className="p-5 text-center text-slate-500">讀取人員配置中…</p> : !visible.length ? <p className="rounded-2xl border border-dashed bg-white p-6 text-center text-slate-500">{records.items.length ? "沒有符合條件的人員。" : "尚未登錄人員。"}</p> : <div className="grid gap-4 xl:grid-cols-2">
      {visible.map((person) => <article key={person.id} className="min-w-0 space-y-3 rounded-2xl border bg-white p-5">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 className="break-words text-lg font-bold">{person.name}</h2><p className="break-words text-sm text-slate-600">{person.jobTitle} · {person.organization}</p></div><span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs">{person.status}</span></div>
        <p className="text-sm text-slate-600">相關工作年資：{person.experienceYears === "" || person.experienceYears == null ? "未填寫" : `${person.experienceYears} 年`}</p>
        {(person.phone || person.email) && <p className="break-words text-sm text-slate-600">{[person.phone, person.email].filter(Boolean).join(" · ")}</p>}
        {(person.startDate || person.endDate) && <p className="text-xs text-slate-500">到任：{person.startDate || "未填寫"} · 離場：{person.endDate || "未填寫"}</p>}
        {[["workSummary", "工作概要"], ["expertise", "專長"], ["note", "備註"]].map(([key, label]) => person[key] && <div key={key}><h3 className="text-xs font-semibold text-slate-500">{label}</h3><p className="mt-1 whitespace-pre-wrap break-words text-sm">{person[key]}</p></div>)}
        {(person.certificates || []).length > 0 && <div className="space-y-2"><h3 className="text-xs font-semibold text-slate-500">專業證照</h3>{person.certificates.map((cert, index) => <div key={index} className="break-words rounded-xl bg-blue-50 p-3 text-sm"><p className="font-semibold">{cert.name}</p><p className="mt-1 text-xs text-slate-600">{[cert.issuer, cert.number, cert.expiresAt ? `到期：${cert.expiresAt}` : "未設定到期日"].filter(Boolean).join(" · ")}</p></div>)}</div>}
        {canEdit && <button className={`${buttonClass} border-slate-200`} disabled={busy} onClick={() => edit(person)} aria-label={`編輯人員 ${person.name}`}><Pencil className="h-4 w-4" />編輯人員</button>}
      </article>)}
    </div>}
  </div>;
}
