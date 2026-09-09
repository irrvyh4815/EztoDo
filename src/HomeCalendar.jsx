import React, { useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import {
  calendarDateKey, calendarDays, calendarEventsByDate, calendarModules,
  calendarPalette, projectCalendarColor, shiftCalendarDate,
} from "./homeCalendar.js";

const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
const controlClass = "min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium hover:bg-slate-50 focus-visible:outline-blue-600";

export default function HomeCalendar({ projects, records, onNavigate, onColorChange, savingColor, canManagePreview = false }) {
  const [anchor, setAnchor] = useState(calendarDateKey);
  const [mode, setMode] = useState("month");
  const [selectedDate, setSelectedDate] = useState(calendarDateKey);
  const [filter, setFilter] = useState("");
  const [showColors, setShowColors] = useState(false);
  const agendaRef = useRef(null);
  const days = useMemo(() => calendarDays(anchor, mode), [anchor, mode]);
  const availableProjects = projects.filter((p) => p.canView !== false);
  const effectiveFilter = availableProjects.some((p) => p.id === filter) ? filter : "";
  const eventsByDate = useMemo(() => calendarEventsByDate(projects, records, days, effectiveFilter), [projects, records, days, effectiveFilter]);
  const today = calendarDateKey();
  const selectedEvents = eventsByDate.get(selectedDate) || [];
  const totalEvents = new Set([...eventsByDate.values()].flat().map((event) => event.key)).size;

  function showDay(day) {
    setSelectedDate(day);
    agendaRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function changePeriod(amount) {
    let next;
    if (mode === "month") {
      const date = new Date(`${anchor.slice(0, 7)}-01T12:00:00`);
      date.setMonth(date.getMonth() + amount);
      next = calendarDateKey(date);
    } else next = shiftCalendarDate(anchor, amount * 7);
    setAnchor(next);
    setSelectedDate(next);
  }

  function renderEvent(event, compact = false) {
    return (
      <button key={event.key} type="button"
        onClick={() => onNavigate(event.project, event.module)}
        title={`${event.project.name}｜${calendarModules[event.module]}｜${event.title}（點擊進入工地）`}
        className={`block w-full min-w-0 rounded-lg border-l-[3px] text-left transition hover:brightness-95 focus-visible:outline-blue-600 ${compact ? "px-1.5 py-1 text-[11px]" : "p-3 text-sm"}`}
        style={{ borderColor: event.color, backgroundColor: `${event.color}12`, color: "#1e293b" }}>
        <span className={`block font-semibold ${compact ? "truncate" : "break-words"}`}>{event.time ? `${event.time} ` : ""}{event.title || "未命名行程"}</span>
        <span className={`mt-0.5 block text-slate-600 ${compact ? "truncate text-[10px]" : "break-words text-xs"}`}>
          {event.project.name} · {calendarModules[event.module]}
        </span>
        {!compact && <span className="mt-1 block break-words text-xs text-slate-500">
          {event.module === "schedule" ? `${event.start} ～ ${event.end} · ` : ""}{event.status}{event.detail ? ` · ${event.detail}` : ""}
        </span>}
      </button>
    );
  }

  return (
    <section aria-label="所有工地行事曆" className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold"><CalendarDays className="h-5 w-5 text-blue-600" />我的工地行事曆</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">待辦、Memo、預定進度與會議 · 點擊行程進入對應工地</p>
          </div>
          <button type="button" className={`${controlClass} flex items-center gap-1.5`} aria-expanded={showColors} onClick={() => setShowColors(!showColors)}><Settings2 className="h-4 w-4" />工地顏色</button>
        </div>
        {showColors && <div className="rounded-2xl bg-slate-50 p-4">
          <p className="mb-3 text-xs text-slate-500">管理者可設定工地顏色，儲存後所有成員共用。工地名稱會同時顯示，方便辨識。</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {availableProjects.map((project) => <label key={project.id} className="flex min-w-0 items-center gap-2 text-sm">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: projectCalendarColor(project) }} />
              <span className="min-w-0 flex-1 break-words">{project.name}</span>
              <select aria-label={`${project.name}的行事曆顏色`} value={projectCalendarColor(project)}
                disabled={Boolean(savingColor) || !(project.canManage || canManagePreview)}
                onChange={(event) => onColorChange(project, event.target.value)}
                className="min-h-10 max-w-28 rounded-lg border bg-white px-2 disabled:opacity-60">
                {!calendarPalette.some(([color]) => color === projectCalendarColor(project)) && <option value={projectCalendarColor(project)}>自訂顏色</option>}
                {calendarPalette.map(([color, name]) => <option key={color} value={color}>{name}</option>)}
              </select>
            </label>)}
          </div>
          {savingColor && <p role="status" className="mt-2 text-xs text-slate-500">正在儲存顏色…</p>}
        </div>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button" className={controlClass} aria-label={mode === "month" ? "上一月" : "上一週"} onClick={() => changePeriod(-1)}><ChevronLeft className="h-4 w-4" /></button>
            <h3 className="text-base font-bold sm:text-lg">{mode === "month" ? `${anchor.slice(0, 4)} 年 ${Number(anchor.slice(5, 7))} 月` : `${days[0]} ～ ${days[6].slice(5)}`}</h3>
            <button type="button" className={controlClass} aria-label={mode === "month" ? "下一月" : "下一週"} onClick={() => changePeriod(1)}><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={controlClass} onClick={() => { setAnchor(today); setSelectedDate(today); }}>今天</button>
            <div className="flex rounded-xl bg-slate-100 p-1" aria-label="行事曆檢視">
              {[["month", "月"], ["week", "週"]].map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value}
                onClick={() => { setMode(value); setAnchor(selectedDate); }}
                className={`min-h-9 rounded-lg px-4 text-sm font-semibold ${mode === value ? "bg-slate-900 text-white shadow-sm" : "text-slate-600"}`}>{label}</button>)}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select aria-label="篩選行事曆工地" className={`${controlClass} max-w-full min-w-0`} value={effectiveFilter} onChange={(event) => setFilter(event.target.value)}>
            <option value="">所有工地（{availableProjects.length}）</option>
            {availableProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <span className="text-xs text-slate-500">本{mode === "month" ? "月檢視" : "週"} {totalEvents} 筆行程</span>
        </div>
        <div className="flex max-h-24 flex-wrap gap-x-3 gap-y-2 overflow-y-auto text-xs text-slate-600" aria-label="工地顏色圖例">
          {availableProjects.filter((p) => !effectiveFilter || p.id === effectiveFilter).map((project) => <span key={project.id} className="inline-flex min-w-0 items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: projectCalendarColor(project) }} /><span className="break-words">{project.name}</span></span>)}
        </div>
      </div>
      {mode === "month" ? <>
        <div className="grid grid-cols-7 border-y bg-slate-50 text-center text-xs font-semibold text-slate-500">{weekdays.map((day) => <div key={day} className="py-2">{day}</div>)}</div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const events = eventsByDate.get(day) || [];
            return <div key={day} className={`h-[100px] min-w-0 overflow-hidden border-b border-r p-1 sm:h-[158px] sm:p-2 ${day === selectedDate ? "bg-blue-50/70 ring-1 ring-inset ring-blue-400" : day.slice(0, 7) === anchor.slice(0, 7) ? "bg-white" : "bg-slate-50 text-slate-400"}`}>
              <button type="button" aria-label={`${day}，${events.length}筆行程`} aria-pressed={day === selectedDate} onClick={() => setSelectedDate(day)}
                className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${day === today ? "bg-blue-600 text-white" : "hover:bg-slate-200"}`}>{Number(day.slice(8))}</button>
              <div className="space-y-1">
                {events.slice(0, 2).map((event, index) => <div key={event.key} className={index === 1 ? "hidden sm:block" : ""}>{renderEvent(event, true)}</div>)}
                {events.length > 1 && <button type="button" onClick={() => showDay(day)} aria-label={`查看${day}全部${events.length}筆行程`} className="block w-full truncate text-left text-[10px] font-semibold text-blue-700 sm:text-xs">
                  <span className="sm:hidden">＋{events.length - 1} 筆</span><span className="hidden sm:inline">{events.length > 2 ? `＋${events.length - 2} 筆` : "查看全部"}</span>
                </button>}
              </div>
            </div>;
          })}
        </div>
        <div ref={agendaRef} className="p-4 sm:p-5" aria-live="polite">
          <h3 className="mb-3 font-bold">{selectedDate} · {selectedEvents.length} 筆行程</h3>
          {selectedEvents.length ? <div className="grid gap-2 sm:grid-cols-2">{selectedEvents.map((event) => renderEvent(event))}</div> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">這天沒有已排定的行程。可點選其他日期查看。</p>}
        </div>
      </> : <div className="grid gap-3 border-t bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {days.map((day) => <div key={day} className={`min-w-0 rounded-2xl border bg-white p-3 ${day === today ? "border-blue-400" : "border-slate-200"}`}>
          <h3 className={`mb-3 text-sm font-bold ${day === today ? "text-blue-600" : ""}`}>{day.slice(5)}（{weekdays[new Date(`${day}T12:00:00`).getDay()]}）{day === today ? " · 今天" : ""}</h3>
          <div className="space-y-2">{eventsByDate.get(day).length ? eventsByDate.get(day).map((event) => renderEvent(event)) : <p className="py-3 text-xs text-slate-400">尚無行程</p>}</div>
        </div>)}
      </div>}
    </section>
  );
}
