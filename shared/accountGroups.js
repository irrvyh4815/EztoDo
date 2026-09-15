export const defaultGroupRoles = () => [
  { id: 'manager', name: '群組管理級', rank: 30, canView: true, canEdit: true, canManage: true },
  { id: 'editor', name: '編輯級', rank: 20, canView: true, canEdit: true, canManage: false },
  { id: 'viewer', name: '閱覽級', rank: 10, canView: true, canEdit: false, canManage: false },
];

export function normalizeGroup(input, previous) {
  const name = String(input.name || '').trim();
  if (!name || name.length > 80) throw new Error('群組名稱請填寫 1～80 字');
  if (!Array.isArray(input.roles) || !input.roles.length || input.roles.length > 20) throw new Error('每組需有 1～20 個權限階級');
  const ids = new Set(), names = new Set(), ranks = new Set();
  const roles = input.roles.map(role => {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(role.id || '') || ids.has(role.id)) throw new Error('階級編號無效或重複');
    const label = String(role.name || '').trim(), rank = Number(role.rank);
    if (!label || label.length > 40 || names.has(label)) throw new Error('階級名稱不可空白或重複，最多 40 字');
    if (!Number.isInteger(rank) || rank < 1 || rank > 999 || ranks.has(rank)) throw new Error('階級排序需為不重複的 1～999 整數');
    for (const key of ['canView', 'canEdit', 'canManage']) if (typeof role[key] !== 'boolean') throw new Error('權限格式無效');
    if ((role.canEdit && !role.canView) || (role.canManage && !role.canEdit)) throw new Error('管理需開啟編輯，編輯需開啟閱覽');
    ids.add(role.id); names.add(label); ranks.add(rank);
    return { id: role.id, name: label, rank, canView: role.canView, canEdit: role.canEdit, canManage: role.canManage };
  }).sort((a, b) => b.rank - a.rank);
  if (previous?.roles.some(role => !ids.has(role.id))) throw new Error('既有階級不可刪除，避免帳號失去歸屬；可關閉該階級權限');
  // Higher levels must include the permissions of lower levels.
  roles.forEach((role, i) => roles.slice(i + 1).forEach(lower => {
    if (['canView', 'canEdit', 'canManage'].some(key => lower[key] && !role[key])) throw new Error('高階級權限需包含低階級權限');
  }));
  return { name, roles };
}

export function applyGroupPermissions(user, group) {
  if (!user || !user.group_id) return user;
  const role = group?.roles?.find(role => role.id === user.group_role_id);
  const admin = user.role === 'admin';
  return { ...user, organization_name: group?.name || user.organization_name,
    group_role_name: role?.name || '階級不存在（已限制存取）',
    account_can_view: user.can_view, account_can_edit: user.can_edit,
    can_view: admin || Boolean(user.can_view && role?.canView),
    can_edit: admin || Boolean(user.can_view && user.can_edit && role?.canView && role?.canEdit),
    group_can_manage: admin || Boolean(role?.canView && role?.canEdit && role?.canManage),
  };
}
