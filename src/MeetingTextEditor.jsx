import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { resizeMeetingTextarea } from "./meetingEditor.js";

export default function MeetingTextEditor({ label, value = "", onChange, placeholder, minHeight = 160, disabled = false, className = "" }) {
  const id = useId();
  const inline = useRef(null);
  const dialog = useRef(null);
  const expandedInput = useRef(null);
  const selection = useRef({ start: 0, end: 0 });
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => { resizeMeetingTextarea(inline.current); }, [value, minHeight]);
  useEffect(() => {
    const element = inline.current;
    let width = -1;
    const observer = new ResizeObserver(entries => {
      const next = entries[0].contentRect.width;
      if (next !== width) { width = next; resizeMeetingTextarea(element); }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const modal = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modal.showModal();
    expandedInput.current.focus({ preventScroll: true });
    expandedInput.current.setSelectionRange(selection.current.start, selection.current.end);
    return () => { modal.close(); document.body.style.overflow = previousOverflow; };
  }, [expanded]);

  function openEditor() {
    selection.current = { start: inline.current.selectionStart, end: inline.current.selectionEnd };
    setExpanded(true);
  }
  function closeEditor() {
    const input = expandedInput.current;
    const position = { start: input.selectionStart, end: input.selectionEnd };
    dialog.current.close();
    setExpanded(false);
    inline.current.focus({ preventScroll: true });
    inline.current.setSelectionRange(position.start, position.end);
  }

  const count = Array.from(value).length;
  return <div className={`min-w-0 ${className}`}>
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">{label}</label>
      <button type="button" disabled={disabled} onClick={openEditor} aria-label={`放大編輯${label}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50"><Maximize2 className="h-4 w-4" />放大編輯</button>
    </div>
    <textarea ref={inline} id={id} value={value} disabled={disabled} onChange={event => onChange(event.target.value)} placeholder={placeholder} style={{ minHeight }} className="block w-full resize-none overflow-hidden rounded-xl border border-slate-300 bg-white px-4 py-3 text-base leading-7 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
    <div className="mt-1 flex justify-between gap-2 text-xs leading-5 text-slate-500"><span>隨內容自動展開，支援換行與貼上長文</span><span className="shrink-0">{count.toLocaleString()} 字</span></div>
    <dialog ref={dialog} aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); closeEditor(); }} className="m-auto h-[94dvh] max-h-none w-[calc(100%-1rem)] max-w-5xl overflow-hidden rounded-2xl border bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50">
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-6">
          <div><h2 id={`${id}-title`} className="font-bold">{label} · 放大編輯</h2><p id={`${id}-help`} className="mt-1 text-xs leading-5 text-slate-500">文字同步回表單，返回後請記得儲存會議紀錄。</p></div>
          <button type="button" onClick={closeEditor} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-3 text-sm text-white"><Minimize2 className="h-4 w-4" />返回表單</button>
        </header>
        <textarea ref={expandedInput} aria-label={`${label}（放大編輯）`} aria-describedby={`${id}-help`} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="min-h-0 w-full flex-1 resize-none overflow-y-auto bg-white px-4 py-4 text-base leading-8 text-slate-900 outline-none focus:shadow-[inset_0_0_0_2px_#93c5fd] sm:px-6" />
        <footer className="shrink-0 border-t px-4 py-2 text-right text-xs text-slate-500">{count.toLocaleString()} 字 · 尚未儲存至工地</footer>
      </div>
    </dialog>
  </div>;
}
