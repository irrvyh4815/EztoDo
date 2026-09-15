import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateLegacyGroups } from '../api/_lib/legacy-groups.js';
import { defaultGroupRoles, applyGroupPermissions } from '../shared/accountGroups.js';
import { insertUser } from '../api/_lib/db.js';
import authApi from '../api/auth/[action].js';

function migrationFixture(fail = false) {
  let state = { groups: [{ id:'existing',name:'測試分組2',roles:defaultGroupRoles().map(role=>({...role,canEdit:false,canManage:false})),version:1 }],
    users: [
      {id:'admin',role:'admin',organization_name:'測試分組1',can_view:true,can_edit:true},
      {id:'editor',role:'member',organization_name:'測試分組1',can_view:true,can_edit:true},
      {id:'viewer',role:'member',organization_name:'測試分組1',can_view:true,can_edit:false},
      {id:'disabled',role:'member',organization_name:'測試分組3',can_view:false,can_edit:false},
      {id:'reuse',role:'member',organization_name:'測試分組2',can_view:true,can_edit:true},
      {id:'assigned',role:'member',organization_name:'舊名稱',group_id:'existing',group_role_id:'viewer',can_view:true,can_edit:true},
    ], done:false };
  let before; const calls=[];
  const client={async query(sql,args=[]) {
    calls.push(sql);
    if(sql==='begin'){before=structuredClone(state);return {rows:[]};}
    if(sql==='commit')return {rows:[]};
    if(sql==='rollback'){state=before;return {rows:[]};}
    if(sql.includes('pg_advisory')||sql.startsWith('create table'))return {rows:[]};
    if(sql.startsWith('select id from app_migrations'))return {rows:state.done?[{id:args[0]}]:[]};
    if(sql.startsWith('select id, organization_name'))return {rows:structuredClone(state.users.filter(user=>!user.group_id))};
    if(sql.startsWith('insert into account_groups')){if(!state.groups.some(group=>group.name.toLowerCase()===args[1].toLowerCase()))state.groups.push({id:args[0],name:args[1],roles:JSON.parse(args[2]),version:1});return {rows:[]};}
    if(sql.startsWith('select * from account_groups'))return {rows:state.groups.filter(group=>group.name.toLowerCase()===args[0].toLowerCase())};
    if(sql.startsWith('update account_groups')){const group=state.groups.find(group=>group.id===args[0]);group.roles=JSON.parse(args[1]);group.version++;return {rows:[]};}
    if(sql.startsWith('update users set group_id')){if(fail)throw new Error('synthetic failure'); const user=state.users.find(user=>user.id===args[0]);if(!user.group_id)Object.assign(user,{group_id:args[1],group_role_id:args[2],organization_name:args[3]});return {rows:[]};}
    if(sql.startsWith('update users u')){state.users.forEach(user=>{const group=state.groups.find(group=>group.id===user.group_id);if(group)user.organization_name=group.name;});return {rows:[]};}
    if(sql.startsWith('insert into app_migrations')){state.done=true;return {rows:[]};}
    throw new Error(sql);
  }};
  return {client,calls,state:()=>state};
}

test('legacy company labels adopt existing groups, preserve account permissions and run only once',async()=>{
  const f=migrationFixture(); const previous=structuredClone(f.state());
  await migrateLegacyGroups(f.client);
  const s=f.state();assert.equal(s.groups.length,3);assert.ok(s.done);
  for(const original of previous.users){
    const user=s.users.find(user=>user.id===original.id),group=s.groups.find(group=>group.id===user.group_id);
    assert.ok(group);assert.equal(user.can_view,original.can_view);assert.equal(user.can_edit,original.can_edit);
    const effective=applyGroupPermissions(user,group);
    if(original.id!=='assigned')assert.equal(effective.can_edit,original.role==='admin'||(original.can_view&&original.can_edit));
  }
  assert.equal(s.users.find(user=>user.id==='reuse').group_id,'existing');
  assert.equal(s.users.find(user=>user.id==='assigned').group_role_id,'viewer');
  assert.equal(applyGroupPermissions(s.users.find(user=>user.id==='assigned'),s.groups.find(group=>group.id==='existing')).can_edit,false);
  s.groups.find(group=>group.name==='測試分組1').name='新公司名稱';
  Object.assign(s.users[1],{group_id:null,group_role_id:null,organization_name:''});
  await migrateLegacyGroups(f.client);
  assert.equal(s.groups.length,3);assert.ok(!s.groups.some(group=>group.name==='測試分組1'));assert.equal(s.users[1].group_id,null);
  assert.ok(f.calls.some(sql=>sql.includes('pg_advisory_xact_lock')));
});

test('failed legacy migration rolls back assignments and marker',async()=>{
  const f=migrationFixture(true),before=structuredClone(f.state());
  await assert.rejects(migrateLegacyGroups(f.client),/synthetic failure/);
  assert.deepEqual(f.state(),before);assert.equal(f.calls.at(-1),'rollback');
});

test('registration and admin creation persist the same company IDs; public options contain no account or tier data',async()=>{
  const old={pool:globalThis.__eztodoPool,schema:globalThis.__eztodoSchemaPromise,db:process.env.DATABASE_URL,verify:process.env.EMAIL_VERIFICATION_REQUIRED};
  const group={id:'company',name:'已改名公司',roles:defaultGroupRoles()};let inserted=[];let released=0;
  const client={async query(sql,args=[]){
    if(['begin','commit','rollback'].includes(sql)||sql.includes('pg_advisory'))return {rows:[]};
    if(sql.includes('max_sequence'))return {rows:[{max_sequence:inserted.length}]};
    if(sql.startsWith('select * from account_groups where id'))return {rows:args[0]===group.id?[group]:[]};
    if(sql.startsWith('select * from account_groups where lower'))return {rows:args[0]===group.name?[group]:[]};
    if(sql.includes('insert into users')){const user={id:args[0],organization_name:args[4],role:args[6],can_view:args[7],can_edit:args[8],group_id:args[10],group_role_id:args[11]};inserted.push(user);return {rows:[user]};}
    throw new Error(sql);
  },release(){released++;}};
  try{
    process.env.DATABASE_URL='postgres://localhost/test';globalThis.__eztodoSchemaPromise=Promise.resolve();
    process.env.EMAIL_VERIFICATION_REQUIRED='false';
    globalThis.__eztodoPool={connect:async()=>client,async query(sql){if(sql==='select id, name from account_groups order by name, id')return {rows:[{id:group.id,name:group.name}]};if(sql==='select * from users where lower(email) = lower($1)')return {rows:[]};throw new Error(sql);}};
    const options=await authApi.fetch(new Request('http://local.test/api/auth/groups'));
    assert.deepEqual(await options.json(),{groups:[{id:group.id,name:group.name}]});
    assert.equal((await authApi.fetch(new Request('http://local.test/api/auth/groups',{method:'POST'}))).status,405);
    const base={email:'qa@example.test',name:'QA',passwordHash:'synthetic',canView:true,canEdit:true};
    const registered=await insertUser({...base,groupId:group.id});
    assert.equal(registered.group_id,group.id);assert.equal(registered.group_role_id,'viewer');assert.equal(registered.can_edit,false);
    const managed=await insertUser({...base,groupId:group.id,groupRoleId:'editor'});
    assert.equal(managed.organization_name,group.name);assert.equal(managed.can_edit,true);
    const legacy=await insertUser({...base,organizationName:group.name});assert.equal(legacy.group_id,group.id);
    await assert.rejects(insertUser({...base,groupId:'missing'}),error=>error.status===400);
    await assert.rejects(insertUser({...base,groupId:group.id,groupRoleId:'not-in-group'}),error=>error.status===400);
    assert.equal(inserted.length,3);assert.equal(released,5);
    const response=await authApi.fetch(new Request('http://local.test/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'register@example.test',name:'註冊合成測試',password:'synthetic-password-only',groupId:group.id,groupRoleId:'manager',role:'admin'})}));
    assert.equal(response.status,201);assert.equal(inserted.at(-1).role,'member');assert.equal(inserted.at(-1).group_role_id,'viewer');
  }finally{globalThis.__eztodoPool=old.pool;globalThis.__eztodoSchemaPromise=old.schema;if(old.db===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=old.db;if(old.verify===undefined)delete process.env.EMAIL_VERIFICATION_REQUIRED;else process.env.EMAIL_VERIFICATION_REQUIRED=old.verify;}
});
