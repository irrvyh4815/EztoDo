import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultGroupRoles, normalizeGroup, applyGroupPermissions } from '../shared/accountGroups.js';
import usersApi from '../api/users/index.js';
import userApi from '../api/users/[id].js';
import { createSessionToken, publicUser } from '../api/_lib/auth.js';
import { requireProjectAccess } from '../api/_lib/permissions.js';

test('company groups validate independent hierarchy, names and immutable role identities', () => {
  const group = normalizeGroup({ name: ' 公司 A ', roles: defaultGroupRoles() });
  assert.equal(group.name, '公司 A'); assert.equal(group.roles[0].rank, 30);
  const invalid = roles => assert.throws(() => normalizeGroup({ name: 'A', roles }));
  invalid([]); invalid([...group.roles, group.roles[0]]);
  invalid(group.roles.map(role => ({ ...role, rank: 1 })));
  invalid(group.roles.map(role => role.id === 'manager' ? { ...role, canView: false } : role));
  invalid(group.roles.map(role => role.id === 'manager' ? { ...role, canEdit: false, canManage: false } : role));
  assert.throws(() => normalizeGroup({ ...group, roles: group.roles.slice(1) }, group));
  assert.throws(() => normalizeGroup({ name: ' ', roles: group.roles }));
  const groupB = normalizeGroup({ name: 'B', roles: defaultGroupRoles().map(role => ({ ...role, canManage: false })) });
  assert.equal(groupB.roles[0].canManage, false); assert.equal(group.roles[0].canManage, true);
});

test('group permissions cap account rights, fail closed and never grant global admin', () => {
  const group = { name: 'A', roles: defaultGroupRoles() };
  const account = { role: 'member', group_id: 'a', group_role_id: 'viewer', can_view: true, can_edit: true };
  const viewer = applyGroupPermissions(account, group);
  assert.equal(viewer.can_edit, false); assert.equal(viewer.account_can_edit, true); assert.equal(viewer.role, 'member');
  assert.equal(publicUser(viewer).groupRoleName, '閱覽級');
  assert.equal(applyGroupPermissions(account, null).can_view, false);
  assert.equal(applyGroupPermissions({ ...account, can_view: false, group_role_id: 'manager' }, group).can_edit, false);
  assert.equal(applyGroupPermissions({ ...account, can_edit: false, group_role_id: 'manager' }, group).can_edit, false);
  assert.equal(applyGroupPermissions({ ...account, role: 'admin' }, null).can_edit, true);
  const legacy = { role: 'member', can_view: true, can_edit: true };
  assert.deepEqual(applyGroupPermissions(legacy, null), legacy);
});

test('group APIs require current system admin; assignment, hierarchy changes and project restrictions apply immediately', async () => {
  const old = { pool: globalThis.__eztodoPool, schema: globalThis.__eztodoSchemaPromise, db: process.env.DATABASE_URL, secret: process.env.AUTH_SECRET };
  const accounts = [
    { id: 'admin', role: 'admin', can_view: true, can_edit: true },
    { id: 'employee', role: 'member', can_view: true, can_edit: true },
  ];
  const groups = [{ id: 'a', name: 'A', roles: defaultGroupRoles(), version: 1 }, { id: 'b', name: 'B', roles: [{ id: 'b-only', name: 'B 階級', rank: 1, canView: true, canEdit: false, canManage: false }], version: 1 }];
  let memberRole = 'owner', sqlWrites = 0;
  try {
    process.env.DATABASE_URL = 'postgres://localhost/test'; process.env.AUTH_SECRET = 'synthetic-group-secret';
    globalThis.__eztodoSchemaPromise = Promise.resolve();
    globalThis.__eztodoPool = { async query(sql, args = []) {
      if (sql === 'select * from users where id = $1') return { rows: accounts.filter(user => user.id === args[0]).map(user => ({ ...user })) };
      if (sql === 'select * from account_groups where id = $1') return { rows: groups.filter(group => group.id === args[0]) };
      if (sql === 'select * from account_groups order by name, id') return { rows: groups };
      if (sql.startsWith('insert into account_groups')) {
        if (groups.some(group => group.name.toLowerCase() === args[1].toLowerCase())) throw Object.assign(new Error('duplicate'), { code: '23505' });
        const group = { id: args[0], name: args[1], roles: JSON.parse(args[2]), version: 1 }; groups.push(group); return { rows: [group] };
      }
      if (sql.includes('count(p.id)::int as created_project_count')) return { rows: accounts.map(user => ({ ...user })) };
      if (sql.startsWith('update users set group_id')) {
        const user = accounts.find(user => user.id === args[0]);
        if (!user || (args[1] && !groups.find(group => group.id === args[1])?.roles.some(role => role.id === args[2]))) return { rows: [] };
        sqlWrites++; user.group_id = args[1] || null; user.group_role_id = args[2] || null; return { rows: [{ ...user }] };
      }
      if (sql.startsWith('update account_groups')) {
        const group = groups.find(group => group.id === args[0] && group.version === args[3]);
        if (!group) return { rows: [] };
        sqlWrites++; Object.assign(group, { name: args[1], roles: JSON.parse(args[2]), version: group.version + 1 }); return { rows: [group] };
      }
      if (sql.includes('select p.id as project_id')) return { rows: [{ project_id: args[0], member_role: memberRole, can_view: true, can_edit: true }] };
      throw new Error(`Unexpected query: ${sql}`);
    } };
    const token = user => createSessionToken(user);
    const adminToken = token(accounts[0]), memberToken = token(accounts[1]);
    const req = (cookie, body, id = '') => new Request(`http://local.test/api/users${id ? '/' + id : ''}`, { method: body ? (id ? 'PATCH' : 'POST') : 'GET', headers: { cookie: `eztodo_session=${cookie}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    assert.equal((await usersApi.fetch(req(memberToken))).status, 403);
    assert.equal((await usersApi.fetch(new Request('http://local.test/api/users'))).status, 401);
    assert.equal((await usersApi.fetch(req(adminToken))).status, 200);
    const newGroup = { action: 'save-group', group: { name: '公司 C', roles: defaultGroupRoles() } };
    assert.equal((await usersApi.fetch(req(adminToken, newGroup))).status, 200);
    assert.equal((await usersApi.fetch(req(adminToken, newGroup))).status, 409);
    assert.equal((await usersApi.fetch(req(memberToken, newGroup))).status, 403);
    assert.equal((await usersApi.fetch(req(adminToken, { action: 'save-group', group: { name: '', roles: [] } }))).status, 400);
    const assign = (groupId, groupRoleId, cookie = adminToken) => userApi.fetch(req(cookie, { action: 'assign-group', groupId, groupRoleId }, 'employee'));
    assert.equal((await assign('a', 'b-only')).status, 400); assert.equal(sqlWrites, 0);
    assert.equal((await assign('missing', 'viewer')).status, 400);
    assert.equal((await assign('a', 'viewer')).status, 200);
    const projectRequest = req(memberToken);
    await requireProjectAccess(projectRequest, 'p', 'view');
    await assert.rejects(requireProjectAccess(projectRequest, 'p', 'edit'), error => error.status === 403);
    await assign('a', 'editor');
    await requireProjectAccess(projectRequest, 'p', 'edit');
    await assert.rejects(requireProjectAccess(projectRequest, 'p', 'manage'), error => error.status === 403);
    await assign('a', 'manager');
    await requireProjectAccess(projectRequest, 'p', 'manage');
    assert.equal((await assign('b', 'b-only', memberToken)).status, 403);
    memberRole = null; await assert.rejects(requireProjectAccess(projectRequest, 'other-company', 'view'), error => error.status === 403); memberRole = 'owner';
    const edit = { action: 'save-group', group: { ...groups[0], roles: defaultGroupRoles().map(role => ({ ...role, canEdit: false, canManage: false })) } };
    assert.equal((await usersApi.fetch(req(adminToken, edit))).status, 200);
    await assert.rejects(requireProjectAccess(projectRequest, 'p', 'edit'), error => error.status === 403);
    assert.equal((await usersApi.fetch(req(adminToken, edit))).status, 409);
    assert.equal(groups[1].roles[0].id, 'b-only');
    await assign('', ''); await requireProjectAccess(projectRequest, 'p', 'edit');
    accounts[0].role = 'member';
    assert.equal((await usersApi.fetch(req(adminToken))).status, 403); // stale admin session is not authority
    accounts.splice(0, 1);
    assert.equal((await usersApi.fetch(req(adminToken))).status, 401);
  } finally {
    globalThis.__eztodoPool = old.pool; globalThis.__eztodoSchemaPromise = old.schema;
    if (old.db === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = old.db;
    if (old.secret === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = old.secret;
  }
});
