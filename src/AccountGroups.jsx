import React, { useRef, useState } from 'react';
import { defaultGroupRoles, normalizeGroup } from '../shared/accountGroups.js';

const control = 'w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base';
const action = 'rounded-xl bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-50';

export function AccountGroupAssignment({ user, groups, onSave }) {
  const [groupId, setGroupId] = useState(user.groupId || '');
  const [roleId, setRoleId] = useState(user.groupRoleId || '');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  const group = groups.find(item => item.id === groupId);
  const changed = groupId !== (user.groupId || '') || roleId !== (user.groupRoleId || '');
  async function save() {
    if (lock.current) return;
    if (!window.confirm('確認調整此帳號的公司群組與階級？權限會於下一次操作生效。既有工地成員授權不會自動搬移或移除，跨公司調職請另行核對工地成員。')) return;
    lock.current = true; setBusy(true); setError('');
    try { await onSave(user, { action: 'assign-group', groupId, groupRoleId: roleId }); }
    catch (err) { setError(err.message); }
    finally { lock.current = false; setBusy(false); }
  }
  return <fieldset disabled={busy} className="mt-4 min-w-0 rounded-2xl border border-blue-200 bg-blue-50 p-4">
    <legend className="px-2 font-bold">公司分組與權限階級</legend>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">公司群組<select className={control} value={groupId} onChange={e => { setGroupId(e.target.value); const selected = groups.find(item => item.id === e.target.value); setRoleId(selected ? [...selected.roles].sort((a, b) => a.rank - b.rank)[0].id : ''); }}><option value="">未分組（沿用帳號權限）</option>{groups.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="grid gap-1 text-sm">群組內階級<select className={control} value={roleId} disabled={!groupId} onChange={e => setRoleId(e.target.value)}><option value="">請選擇階級</option>{group?.roles.map(role => <option key={role.id} value={role.id}>{role.name}（{role.rank} 級）</option>)}</select></label>
    </div>
    <p className="my-3 text-xs leading-relaxed text-slate-600">{user.role === 'admin' ? '此帳號為全系統最高權限；分組僅作歸屬管理，不限制其系統權限。' : '實際權限＝帳號開關、群組階級與工地授權的共同範圍；不會因加入公司群組而自動取得工地存取權。'}</p>
    <button type="button" className={action} disabled={!changed || (Boolean(groupId) && !roleId)} onClick={save}>{busy ? '儲存中…' : '儲存群組與階級'}</button>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}，選擇已保留。</p>}
  </fieldset>;
}

export default function AccountGroups({ groups, users, onSave }) {
  const [draft, setDraft] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  function edit(group) {
    if (draft && !window.confirm('放棄尚未儲存的群組設定？')) return;
    setDraft(group ? structuredClone(group) : { name: '', roles: defaultGroupRoles() }); setError('');
  }
  function updateRole(id, patch) { setDraft(current => ({ ...current, roles: current.roles.map(role => role.id === id ? { ...role, ...patch } : role) })); }
  async function save() {
    if (lock.current) return;
    setError('');
    try {
      const normalized = normalizeGroup(draft, groups.find(item => item.id === draft.id));
      if (draft.id && !window.confirm('儲存後，此群組所有成員將立即套用新的權限上限。確認儲存？')) return;
      lock.current = true; setBusy(true);
      await onSave({ ...draft, ...normalized }); setDraft(null);
    } catch (err) { setError(err.message); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section aria-label="公司群組管理" className="my-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">公司群組與權限階級</h3><button type="button" className={action} disabled={busy} onClick={() => edit(null)}>＋ 新增公司群組</button></div>
    <p className="my-3 text-sm leading-relaxed text-slate-600">最高權限管理員統一分派帳號。數字越大階級越高；管理級仍只能管理已獲授權的工地，不能管理全系統帳號。此功能不是公司工地自動共享或完整租戶隔離。</p>
    {!groups.length && <p className="text-sm text-slate-600">尚無公司群組。原有帳號維持既有權限，建立群組後可從下方帳號列表逐一分派。</p>}
    <div className="grid gap-2">{groups.map(group => <div key={group.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-3"><div className="min-w-0 break-words"><strong>{group.name}</strong><p className="text-xs text-slate-500">{users.filter(user => user.groupId === group.id).length} 人 · {group.roles.map(role => role.name).join('／')}</p></div><button type="button" className="rounded-lg border px-3 py-2 text-sm" disabled={busy} onClick={() => edit(group)}>編輯 {group.name}</button></div>)}</div>
    {draft && <fieldset disabled={busy} className="mt-4 min-w-0 rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <legend className="px-2 font-bold">{draft.id ? '編輯群組' : '新增群組'}</legend>
      <label className="grid gap-1 text-sm">公司／群組名稱<input maxLength={80} className={control} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="例如：宏達營造" /></label>
      {draft.roles.map(role => <div key={role.id} className="mt-3 rounded-xl border bg-white p-3"><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">階級名稱<input maxLength={40} className={control} value={role.name} onChange={e => updateRole(role.id, { name: e.target.value })} /></label><label className="grid gap-1 text-sm">階級排序（大者優先）<input type="number" min="1" max="999" className={control} value={role.rank} onChange={e => updateRole(role.id, { rank: e.target.value })} /></label></div><div className="mt-3 flex flex-wrap gap-4">{[['canView','閱覽'],['canEdit','編輯／建立工地'],['canManage','工地管理（含成員）']].map(([key, label]) => <label className="flex items-center gap-2 text-sm" key={key}><input type="checkbox" checked={role[key]} onChange={e => updateRole(role.id, { [key]: e.target.checked })} />{label}</label>)}</div></div>)}
      <p className="my-3 text-xs text-slate-600">高階級必須包含低階級權限。既有階級保留，不可刪除；要限制使用時可關閉權限。</p>
      <div className="flex flex-wrap gap-2"><button type="button" className="rounded-xl border bg-white px-3 py-2 text-sm" disabled={draft.roles.length >= 20} onClick={() => setDraft({ ...draft, roles: [...draft.roles, { id: crypto.randomUUID(), name: '', rank: '', canView: false, canEdit: false, canManage: false }] })}>＋ 新增階級</button><button type="button" className={action} onClick={save}>{busy ? '儲存中…' : '儲存群組設定'}</button><button type="button" className="rounded-xl border bg-white px-3 py-2 text-sm" onClick={() => { if (window.confirm('放棄尚未儲存的群組設定？')) setDraft(null); }}>取消</button></div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}，輸入內容已保留。</p>}
    </fieldset>}
  </section>;
}
