import { randomUUID } from 'node:crypto';
import { defaultGroupRoles } from '../../shared/accountGroups.js';

// Once-only, transactional adoption of the original company labels. Re-running
// startup must never recreate renamed groups or reassign intentionally ungrouped users.
export async function migrateLegacyGroups(client) {
  await client.query('begin');
  try {
    await client.query("select pg_advisory_xact_lock(hashtext('eztodo-legacy-company-groups-v1'))");
    await client.query('create table if not exists app_migrations (id text primary key, applied_at timestamptz not null default now())');
    if ((await client.query('select id from app_migrations where id = $1', ['legacy-company-groups-v1'])).rows.length) {
      await client.query('commit'); return;
    }
    const users = (await client.query('select id, organization_name, role, can_view, can_edit from users where group_id is null')).rows;
    const names = new Set(['測試分組1', '測試分組2', '測試分組3', ...users.map(user => String(user.organization_name || '').trim()).filter(Boolean)]);
    for (const name of names) {
      await client.query('insert into account_groups (id, name, roles) values ($1, $2, $3::jsonb) on conflict do nothing', [randomUUID(), name, JSON.stringify(defaultGroupRoles())]);
      const group = (await client.query('select * from account_groups where lower(name) = lower($1) for update', [name])).rows[0];
      const members = users.filter(user => String(user.organization_name || '').trim().toLowerCase() === name.toLowerCase());
      // Reuse a compatible tier; never widen permissions of existing tiers/members.
      const needsFull = members.some(user => user.role === 'admin' || (user.can_view && user.can_edit));
      let full = group.roles.find(role => role.canView && role.canEdit && role.canManage);
      if ((needsFull && !full) || (members.some(user=>user.can_view) && !group.roles.some(role=>role.canView))) {
        const ordered = [...group.roles].sort((a,b) => b.rank-a.rank).map((role,i,rows) => ({...role, rank:(rows.length-i)*10}));
        full = {id:randomUUID(),name:`原有權限保留 ${group.roles.length+1}`,rank:(ordered.length+1)*10,canView:true,canEdit:true,canManage:true};
        group.roles = [full,...ordered];
        await client.query('update account_groups set roles = $2::jsonb, version = version + 1 where id = $1', [group.id,JSON.stringify(group.roles)]);
      }
      const view = [...group.roles].sort((a,b)=>a.rank-b.rank).find(role=>role.canView);
      for (const user of members) {
        const role = user.role === 'admin' || (user.can_view && user.can_edit) ? full : view || group.roles[0];
        await client.query('update users set group_id = $2, group_role_id = $3, organization_name = $4 where id = $1 and group_id is null', [user.id,group.id,role.id,group.name]);
      }
    }
    await client.query('update users u set organization_name = g.name from account_groups g where u.group_id = g.id');
    await client.query('insert into app_migrations (id) values ($1)', ['legacy-company-groups-v1']);
    await client.query('commit');
  } catch (error) { await client.query('rollback'); throw error; }
}
