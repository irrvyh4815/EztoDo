import React, { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, Copy, RefreshCw, X } from "lucide-react";

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";
async function subscriptionRequest(projectId, action) {
  const response = await fetch(action ? "/api/calendar/subscriptions" : `/api/calendar/subscriptions?projectId=${encodeURIComponent(projectId)}`, {
    credentials: "include", cache: "no-store",
    ...(action ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, action, consent: true }) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "無法更新行事曆訂閱");
  return result;
}

export default function CalendarSubscriptionSettings({ projects, preview = false }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [pendingAction, setPendingAction] = useState("");
  const dialog = useRef(null);
  const busyRef = useRef(false);
  const titleId = useId();
  const project = projects.find(item => item.id === selected);
  const projectExists = Boolean(project);

  useEffect(() => {
    if (open && !projectExists) setSelected(projects[0]?.id || "");
  }, [open, projectExists, projects]);

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  useEffect(() => {
    if (!open || !selected || !projectExists) return;
    let current = true;
    setStatus(null); setError(""); setMessage(""); setConsent(false); setPendingAction("");
    if (preview) { setLoading(false); setError("本機預覽不產生對外訂閱，請在正式網站啟用。"); return; }
    setLoading(true);
    subscriptionRequest(selected).then(result => { if (current) setStatus(result); })
      .catch(err => { if (current) setError(err.message); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [open, selected, preview, projectExists]);

  async function change(action) {
    if (busyRef.current || !project) return;
    busyRef.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const result = await subscriptionRequest(project.id, action);
      setStatus(result); setPendingAction(""); setConsent(false);
      setMessage(action === "disable" ? "已停用，此工地舊連結不再提供資料。請在 Apple 行事曆取消訂閱以移除既有內容。" : action === "rotate" ? "已換發連結，舊連結失效。請用新連結重新訂閱。" : "已建立私密訂閱連結，請再按「加入 Apple 行事曆」完成訂閱。");
    } catch (err) { setError(err.message); }
    finally { busyRef.current = false; setBusy(false); }
  }

  const url = projectExists && status?.token ? `${window.location.origin}/api/calendar/feed?token=${encodeURIComponent(status.token)}` : "";
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage("已複製私密網址，請勿轉傳。"); }
    catch { setError("無法自動複製，請選取下方網址手動複製。"); }
  }

  return <>
    <button type="button" className={`${button} border-slate-200 bg-white text-slate-900`} disabled={!projects.length} onClick={() => { setStatus(null); setSelected(projects[0]?.id || ""); setOpen(true); }}><CalendarDays className="h-4 w-4" />Apple 行事曆</button>
    <dialog ref={dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busyRef.current) setOpen(false); }} className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-slate-950/40">
      <div className="mb-4 flex items-start justify-between gap-3"><h2 id={titleId} className="text-xl font-bold">Apple 行事曆訂閱</h2><button type="button" aria-label="關閉行事曆訂閱設定" disabled={busy} onClick={() => setOpen(false)} className={`${button} border-slate-200`}><X className="h-4 w-4" /></button></div>
      <p className="mb-4 text-sm leading-6 text-slate-600">單向同步：Ez2Do → Apple。每個工地分開設定，只影響你的訂閱，不影響其他成員。Apple 端無法編輯或回寫資料。</p>
      <label className="block text-sm font-semibold">選擇工地<select aria-label="選擇要訂閱的工地" value={selected} disabled={busy} onChange={event => { setStatus(null); setSelected(event.target.value); }} className="mt-2 min-h-11 w-full min-w-0 rounded-xl border bg-white px-3">{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {loading && <p role="status" className="my-4 text-sm">讀取訂閱設定中…</p>}
      {error && <p role="alert" className="my-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="my-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
      {projectExists && status && !loading && <div className="mt-4 space-y-4">
        <p className="font-semibold">{status.enabled ? "已啟用私密訂閱連結" : "尚未啟用"}</p>
        <div className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">持有連結的人無須登入即可讀取此工地的行程標題、日期與狀態，請勿公開或轉傳。只提供待辦、Memo、預定進度與會議，不包含附件、請款或人員名冊。啟用後，由你選擇是否將網址交給 Apple 訂閱。</div>
        {!status.enabled ? <>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={busy} className="mt-1" />我了解私密網址可存取行程，並同意建立此工地的訂閱連結。</label>
          <button type="button" disabled={!consent || busy} onClick={() => change("enable")} className={`${button} border-slate-900 bg-slate-900 text-white`}>{busy ? "處理中…" : "啟用此工地訂閱"}</button>
        </> : <>
          <div className="flex flex-wrap gap-2"><a href={busy ? undefined : url.replace(/^https?:/, "webcal:")} aria-disabled={busy} rel="noreferrer" className={`${button} border-slate-900 bg-slate-900 text-white`}>加入 Apple 行事曆</a><button type="button" disabled={busy} onClick={copy} className={`${button} border-slate-200`}><Copy className="h-4 w-4" />複製訂閱網址</button></div>
          <label className="block text-xs text-slate-500">私密訂閱網址<input aria-label="私密訂閱網址" type="text" readOnly value={url} onFocus={event => event.target.select()} className="mt-1 min-h-11 w-full min-w-0 rounded-lg border bg-slate-50 px-2 text-xs text-slate-900" /></label>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => setPendingAction("rotate")} className={`${button} border-slate-200`}><RefreshCw className="h-4 w-4" />換發私密連結</button><button type="button" disabled={busy} onClick={() => setPendingAction("disable")} className={`${button} border-red-200 text-red-700`}>停用此工地訂閱</button></div>
          {pendingAction && <div role="alert" className="rounded-xl border border-amber-300 p-3 text-sm"><p>{pendingAction === "disable" ? "確定停用？舊連結會立即失效，但 Apple 已下載的內容仍可能保留，請另外取消訂閱。" : "確定換發？舊連結會立即失效，你的 Apple 裝置需使用新網址重新訂閱。"}</p><div className="mt-3 flex gap-2"><button type="button" disabled={busy} onClick={() => change(pendingAction)} className={`${button} border-slate-900 bg-slate-900 text-white`}>確認{pendingAction === "disable" ? "停用" : "換發"}</button><button type="button" disabled={busy} onClick={() => setPendingAction("")} className={`${button} border-slate-200`}>取消</button></div></div>}
        </>}
      </div>}
      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-900"><p className="font-semibold">訂閱已包含行程提醒</p><p>有指定時間：當下提醒；全天或跨日行程：開始日台灣時間上午 9 點。已完成、已取消與過去的項目不新增提醒。</p><p>請允許裝置的「行事曆」通知，並關閉訂閱設定中的「移除提示／移除提醒」。Mac 可在行事曆資訊內調整；iPhone 請檢查此訂閱的提醒設定。網站無法代替你開啟 Apple 的通知權限。</p><p>既有訂閱不必重建，等待 Apple 重新整理即可取得提醒；臨時新增的行程可能因抓取延遲錯過提醒。</p></div>
      <div className="mt-5 border-t pt-4 text-xs leading-6 text-slate-500"><p>Apple 會依裝置的重新整理頻率抓取更新，不保證即時同步。停用或失去工地閱覽權限後，連結停止提供資料；已下載內容須在 Apple 端移除。</p><p>有指定時間的項目以台灣時間顯示，未填結束時間暫以 1 小時呈現；未填時間與跨日預定進度顯示為全天行程。顏色可在 Apple 個別調整。</p><p>Mac：行事曆 → 檔案 → 新增行事曆訂閱，貼上網址；選擇 iCloud 可在同帳號裝置間使用。</p><p>iPhone：可點「加入 Apple 行事曆」；若未開啟，請在行事曆的新增訂閱功能貼上網址。</p></div>
    </dialog>
  </>;
}
