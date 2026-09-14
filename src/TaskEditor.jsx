import React, { useId, useState } from "react";
import MeetingTextEditor from "./MeetingTextEditor.jsx";
import { reminderChoices, reminderPreview, taskReminderAt } from "../shared/taskTiming.js";
import "./taskEditor.css";

export default function TaskEditor({ module, draft, setDraft, editing, saving, error, onSubmit, onCancel, children, crews = [] }) {
  const memo = module === "memos";
  const id = useId();
  const [custom, setCustom] = useState(!reminderChoices.some(([n]) => n === draft.reminderMinutes) && draft.reminderMinutes !== null);
  const change = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const hasDate = memo || !draft.noDeadline;
  const reminder = hasDate ? taskReminderAt(draft) : null;
  const field = (key, label, type = "text", placeholder = "") => <label className="task-field"><span>{label}</span><input type={type} value={draft[key] || ""} onChange={e => change(key, e.target.value)} placeholder={placeholder} required={type === "date" || type === "time"} /></label>;
  return <form className={`task-editor ${memo ? "task-memo" : "task-todo"}`} onSubmit={e => { e.preventDefault(); onSubmit(); }}>
    <fieldset disabled={saving}>
      <header className="task-editor-heading"><h2>{editing ? "編輯" : "新增"}{memo ? "工項 Memo" : "待辦事項"}</h2><p>{memo ? "記下哪個工班要進場、施工多久，以及需要提前交代的事。" : "先寫清楚要做什麼，再指定負責人、期限與提醒。"}</p></header>
      <section className="task-block" aria-label="工作內容"><h3>01　{memo ? "工班與工作內容" : "待辦內容與負責人"}</h3>
        <div className="task-grid">
          {field("title", memo ? "Memo 標題" : "待辦事項", "text", memo ? "例如：防水工班進場施作" : "例如：確認浴室門檻收邊")}
          {memo ? <label className="task-field"><span>工班 / 工種</span><input list={`${id}-crews`} value={draft.trade} onChange={e => change("trade", e.target.value)} placeholder="選擇常用工班或自行輸入" /><datalist id={`${id}-crews`}>{crews.map(name => <option key={name} value={name} />)}</datalist></label> : field("owner", "負責人", "text", "例如：李工務")}
          <label className="task-field"><span>{memo ? "處理狀態" : "優先度 / 狀態"}</span><select value={draft.status} onChange={e => change("status", e.target.value)}>{Array.from(new Set([...(memo ? ["待確認", "待處理", "追蹤中", "已完成"] : ["一般", "重要", "緊急", "已完成"]), draft.status])).map(status => <option key={status}>{status}</option>)}</select></label>
        </div>
        <MeetingTextEditor label={memo ? "施工內容 / 注意事項" : "補充說明"} value={draft.note} onChange={value => change("note", value)} placeholder="可分行記錄工作內容、聯絡資訊及交接事項" recordLabel={memo ? "Memo" : "待辦事項"} />
      </section>
      <section className="task-block task-timing" aria-label={memo ? "進場時間區間" : "完成期限"}><h3>02　{memo ? "工班進場時間區間" : "完成期限"}</h3>
        {!memo && <div className="task-deadline-options"><label><input type="radio" name={`${id}-deadline`} checked={!draft.noDeadline} onChange={() => change("noDeadline", false)} />設定完成期限</label><label><input type="radio" name={`${id}-deadline`} checked={draft.noDeadline} onChange={() => change("noDeadline", true)} />無期限</label></div>}
        {hasDate ? <><div className="task-grid">
          {field(memo ? "startDate" : "date", memo ? "進場日期" : "截止日期", "date")}
          {field(memo ? "startTime" : "time", memo ? "進場時間" : "截止時間", "time")}
          {memo && field("endDate", "預計結束日期", "date")}{memo && field("endTime", "預計結束時間", "time")}
        </div><p className="task-help">{memo ? "起訖期間的每一天都會顯示在首頁與工地行事曆；Apple 訂閱也會更新。" : "行事曆會顯示截止日期；時間一律以台灣時間計算。"}</p></> : <p className="task-help">無期限待辦會保留在清單，不加入行事曆，也不發出到期提醒。日後可再設定期限。</p>}
      </section>
      <section className="task-block task-reminder" aria-label="提醒設定"><h3>03　提前提醒</h3>
        {hasDate ? <><label className="task-field"><span>{memo ? "進場前多久提醒？" : "截止前多久提醒？"}</span><select value={draft.reminderMinutes === null ? "off" : custom ? "custom" : String(draft.reminderMinutes)} onChange={e => { const v = e.target.value; setCustom(v === "custom"); change("reminderMinutes", v === "off" ? null : v === "custom" ? 60 : Number(v)); }}><option value="off">不提醒</option>{reminderChoices.map(([n, text]) => <option key={n} value={n}>{text}</option>)}<option value="custom">自訂提前時間</option></select></label>
          {custom && draft.reminderMinutes !== null && <label className="task-field"><span>提前幾分鐘（1 天＝1440 分鐘）</span><input type="number" min="0" max="525600" step="1" required value={draft.reminderMinutes} onChange={e => change("reminderMinutes", e.target.value)} /></label>}
          <p className="task-reminder-preview" role="status">{draft.reminderMinutes === null ? "此筆不發出提醒" : `預計提醒：${reminderPreview(draft)}（台灣時間）`}</p>
          {reminder && reminder.getTime() < Date.now() && draft.status !== "已完成" && <p className="task-help">提醒時間已過；儲存後若仍在有效期間，會立即顯示站內通知。</p>}
        </> : <p className="task-help">設定完成期限後，即可開啟提前提醒。</p>}
        <p className="task-help">到達提醒時間後顯示於站內通知，原定時間超過 2 小時後移出通知欄。已完成項目不提醒。Apple 訂閱會帶入提醒時間，仍需允許裝置通知；不另寄郵件或簡訊。</p>
      </section>
      <section className="task-block" aria-label="附件照片"><h3>04　附件照片（選填）</h3>{children}</section>
      {error && <p className="task-error" role="alert">{error}，內容已保留，請調整後重試。</p>}
      <footer className="task-actions"><button type="button" onClick={onCancel}>取消</button><button type="submit" className="task-primary">{saving ? "儲存中…" : `${editing ? "更新" : "儲存"}${memo ? " Memo" : "待辦"}`}</button></footer>
    </fieldset>
  </form>;
}
