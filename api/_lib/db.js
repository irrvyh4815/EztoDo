import pg from "pg";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "./auth.js";
import { ApiError } from "./http.js";

const { Pool } = pg;

const sampleProjects = [
  {
    name: "範例工地：東區住宅新建工程",
    owner: "範例業主",
    status: "進行中",
    address: "台中市東區",
    defects: 8,
    dailyPhotos: 32,
    nextClaim: "2026/05",
    startDate: "2026-02-16",
    endDate: "2026-11-30",
    manager: "範例工地主任",
    note: "此工地為系統展示用範例，可用來熟悉總覽、請款、Memo、日報與缺失流程。",
  },
];

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL;
}

function isProductionLike() {
  return Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");
}

function getPool() {
  const connectionString = databaseUrl();

  if (!connectionString) {
    throw new ApiError(
      500,
      "尚未設定 DATABASE_URL 或 POSTGRES_URL",
      "DATABASE_URL_MISSING",
    );
  }

  if (!globalThis.__eztodoPool) {
    const usesLocalDb = /localhost|127\.0\.0\.1/i.test(connectionString);
    globalThis.__eztodoPool = new Pool({
      connectionString,
      max: 5,
      ssl: usesLocalDb ? false : { rejectUnauthorized: false },
    });
  }

  return globalThis.__eztodoPool;
}

export async function query(text, params = []) {
  return getPool().query(text, params);
}

export function mapProject(row) {
  const memberRole = row.member_role || (row.user_role === "admin" ? "admin" : "");
  return {
    id: row.id,
    name: row.name,
    owner: row.owner,
    status: row.status,
    address: row.address,
    defects: row.defects,
    dailyPhotos: row.daily_photos,
    nextClaim: row.next_claim,
    startDate: row.start_date,
    endDate: row.end_date,
    manager: row.manager,
    note: row.note,
    attachments: row.attachments || [],
    ownerId: row.owner_id,
    createdBy: row.created_by,
    createdByName: row.created_by_name || "",
    createdByEmail: row.created_by_email || "",
    memberRole,
    canView: row.user_role === "admin" ? true : Boolean(row.member_can_view),
    canEdit: row.user_role === "admin" ? true : Boolean(row.member_can_edit),
    canViewClaims: row.user_role === "admin" ? true : row.member_can_view_claims !== false,
    canViewContracts: row.user_role === "admin" ? true : row.member_can_view_contracts !== false,
    canManage: row.user_role === "admin" || ["owner", "manager"].includes(memberRole),
    memberCount: Number(row.member_count || 0),
    createdAt: row.created_at,
  };
}

export function mapProjectMember(row) {
  const role = row.member_role || row.role || "viewer";
  return {
    userId: row.user_id,
    name: row.name,
    email: row.email,
    jobTitle: row.job_title || "",
    role,
    canView: role === "owner" ? true : Boolean(row.can_view),
    canEdit: ["owner", "manager", "editor"].includes(role)
      ? true
      : Boolean(row.can_edit),
    canViewClaims: role === "owner" ? true : row.can_view_claims !== false,
    canViewContracts: role === "owner" ? true : row.can_view_contracts !== false,
    createdAt: row.created_at,
  };
}

export function mapRecord(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    module: row.module,
    title: row.title,
    status: row.status,
    payload: row.payload || {},
    attachments: row.attachments || [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapUser(row) {
  const isAdmin = row.role === "admin";
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    memberNumber: row.member_no || "",
    organizationName: row.organization_name || "",
    role: row.role,
    canView: isAdmin ? true : row.can_view,
    canEdit: isAdmin ? true : row.can_edit,
    emailVerified: isAdmin ? true : Boolean(row.email_verified),
    emailVerifiedAt: row.email_verified_at,
    createdProjectCount: Number(row.created_project_count || 0),
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

function hashVerificationToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function emailVerificationDays() {
  return Math.max(Number(process.env.EMAIL_VERIFICATION_DAYS || 2), 1);
}

function memberNumberPrefix(date = new Date()) {
  return String(date.getFullYear()).slice(-2);
}

function formatMemberNumber(sequence, prefix = memberNumberPrefix()) {
  return `${prefix}${String(sequence).padStart(5, "0")}`;
}

async function nextMemberNumber(executor) {
  const prefix = memberNumberPrefix();
  await executor.query("select pg_advisory_xact_lock(hashtext($1))", [
    `eztodo-member-number-${prefix}`,
  ]);
  const result = await executor.query(
    `select coalesce(max(substring(member_no from 3)::int), 0) as max_sequence
     from users
     where member_no ~ $1`,
    [`^${prefix}[0-9]{5}$`],
  );
  return formatMemberNumber(Number(result.rows[0]?.max_sequence || 0) + 1, prefix);
}

async function backfillUserMemberNumbers() {
  const prefix = memberNumberPrefix();
  await query(
    `with base as (
       select coalesce(max(substring(member_no from 3)::int), 0) as offset
       from users
       where member_no ~ $2
     ),
     ranked as (
       select id,
              row_number() over (
                order by case when role = 'admin' then 0 else 1 end, created_at asc, id asc
              ) as sequence
       from users
       where member_no is null or member_no = ''
     )
     update users u
     set member_no = $1 || lpad((base.offset + ranked.sequence)::text, 5, '0')
     from ranked, base
     where u.id = ranked.id`,
    [prefix, `^${prefix}[0-9]{5}$`],
  );
}

async function seedAdmin() {
  const email =
    process.env.ADMIN_EMAIL || (!isProductionLike() ? "admin@eztodo.local" : "");
  const password =
    process.env.ADMIN_PASSWORD || (!isProductionLike() ? "Admin@123456" : "");
  const name = process.env.ADMIN_NAME || "系統管理員";

  if (!email || !password) {
    throw new ApiError(
      500,
      "尚未設定預設管理員帳密，請設定 ADMIN_EMAIL 與 ADMIN_PASSWORD",
      "ADMIN_SEED_MISSING",
    );
  }

  const existing = await query("select id from users where lower(email) = lower($1)", [
    email,
  ]);
  if (existing.rowCount > 0) return;

  const passwordHash = await hashPassword(password);
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const memberNumber = await nextMemberNumber(client);
    await client.query(
      `insert into users (
         id, email, name, member_no, organization_name, password_hash, role, can_view, can_edit,
         email_verified, email_verified_at
       )
       values ($1, lower($2), $3, $4, $5, $6, 'admin', true, true, true, now())
       on conflict (email) do nothing`,
      [randomUUID(), email, name, memberNumber, "測試分組1", passwordHash],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function seedProjects() {
  const existing = await query("select count(*)::int as count from projects");
  if (existing.rows[0].count > 0) return;

  for (const project of sampleProjects) {
    await insertProject(project);
  }
}

async function syncSampleProjects() {
  const sample = sampleProjects[0];

  await query("delete from projects where name = $1", ["北屯店面裝修工程"]);
  await query(
    `update projects
     set name = $2,
         owner = $3,
         status = $4,
         address = $5,
         defects = $6,
         daily_photos = $7,
         next_claim = $8,
         start_date = $9,
         end_date = $10,
         manager = $11,
         note = $12
     where name = $1`,
    [
      "東區住宅新建工程",
      sample.name,
      sample.owner,
      sample.status,
      sample.address,
      sample.defects,
      sample.dailyPhotos,
      sample.nextClaim,
      sample.startDate,
      sample.endDate,
      sample.manager,
      sample.note,
    ],
  );
}

async function firstAdminId() {
  const result = await query(
    "select id from users where role = 'admin' order by created_at asc limit 1",
  );
  return result.rows[0]?.id || null;
}

function normalizeProjectMemberRole(role = "viewer") {
  return ["owner", "manager", "editor", "viewer"].includes(role) ? role : "viewer";
}

function projectMemberPermissions(role, canView = true, canEdit = false) {
  const normalizedRole = normalizeProjectMemberRole(role);
  if (normalizedRole === "owner" || normalizedRole === "manager") {
    return { role: normalizedRole, canView: true, canEdit: true };
  }
  if (normalizedRole === "editor") {
    return { role: normalizedRole, canView: true, canEdit: true };
  }
  return {
    role: "viewer",
    canView: Boolean(canView),
    canEdit: Boolean(canView) && Boolean(canEdit),
  };
}

async function backfillProjectOwnership() {
  const adminId = await firstAdminId();
  if (!adminId) return;

  await query(
    `update projects
     set owner_id = coalesce(owner_id, $1),
         created_by = coalesce(created_by, $1)
     where owner_id is null or created_by is null`,
    [adminId],
  );

  await query(
    `insert into project_members (
       project_id, user_id, member_role, can_view, can_edit, can_view_claims, can_view_contracts, job_title, created_by
     )
     select id, owner_id, 'owner', true, true, true, true, '工地建立者', owner_id
     from projects
     where owner_id is not null
     on conflict (project_id, user_id) do nothing`,
  );
}

async function initializeSchema() {
  await query(`
    create table if not exists users (
      id text primary key,
      email text unique not null,
      name text not null,
      member_no text unique,
      organization_name text not null default '',
      password_hash text not null,
      role text not null default 'member',
      can_view boolean not null default true,
      can_edit boolean not null default false,
      email_verified boolean not null default false,
      email_verified_at timestamptz,
      email_verification_token_hash text,
      email_verification_expires_at timestamptz,
      email_verification_sent_at timestamptz,
      last_login_at timestamptz,
      created_at timestamptz not null default now()
    )
  `);

  await query("alter table users add column if not exists can_view boolean not null default true");
  await query("alter table users add column if not exists can_edit boolean not null default false");
  await query("alter table users add column if not exists member_no text");
  await query("alter table users add column if not exists organization_name text not null default ''");
  await query("update users set organization_name = '測試分組1' where organization_name is null or organization_name = ''");
  await query("alter table users add column if not exists email_verified boolean");
  await query("alter table users add column if not exists email_verified_at timestamptz");
  await query("alter table users add column if not exists email_verification_token_hash text");
  await query("alter table users add column if not exists email_verification_expires_at timestamptz");
  await query("alter table users add column if not exists email_verification_sent_at timestamptz");
  await query("alter table users add column if not exists last_login_at timestamptz");
  await query("update users set email_verified = true where email_verified is null");
  await query(
    "update users set email_verified_at = created_at where email_verified = true and email_verified_at is null",
  );
  await query("alter table users alter column email_verified set default false");
  await query("alter table users alter column email_verified set not null");
  await seedAdmin();
  await backfillUserMemberNumbers();
  await query("create unique index if not exists users_member_no_idx on users (member_no) where member_no is not null");

  await query(`
    create table if not exists projects (
      id text primary key,
      name text not null,
      owner text not null default '',
      status text not null default '進行中',
      address text not null default '',
      defects integer not null default 0,
      daily_photos integer not null default 0,
      next_claim text not null default '',
      start_date text not null default '',
      end_date text not null default '',
      manager text not null default '',
      note text not null default '',
      attachments jsonb not null default '[]'::jsonb,
      owner_id text references users(id) on delete set null,
      created_by text references users(id) on delete set null,
      created_at timestamptz not null default now()
    )
  `);

  await query("alter table projects add column if not exists owner_id text references users(id) on delete set null");
  await query("alter table projects add column if not exists created_by text references users(id) on delete set null");
  await query("alter table projects add column if not exists attachments jsonb not null default '[]'::jsonb");

  await query(`
    create table if not exists project_members (
      project_id text not null references projects(id) on delete cascade,
      user_id text not null references users(id) on delete cascade,
      member_role text not null default 'viewer',
      can_view boolean not null default true,
      can_edit boolean not null default false,
      can_view_claims boolean not null default true,
      can_view_contracts boolean not null default true,
      job_title text not null default '',
      created_by text references users(id) on delete set null,
      created_at timestamptz not null default now(),
      primary key (project_id, user_id)
    )
  `);

  await query(`
    create index if not exists project_members_user_idx
    on project_members (user_id, project_id)
  `);
  await query("alter table project_members add column if not exists job_title text not null default ''");
  await query("alter table project_members add column if not exists can_view_claims boolean not null default true");
  await query("alter table project_members add column if not exists can_view_contracts boolean not null default true");
  await query(
    `update project_members
     set job_title = case
       when member_role = 'owner' then '工地建立者'
       when job_title = '' then '現場工程師'
       else job_title
     end
     where job_title is null or job_title = ''`,
  );

  await query(`
    create table if not exists project_records (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      module text not null,
      title text not null,
      status text not null default '',
      payload jsonb not null default '{}'::jsonb,
      attachments jsonb not null default '[]'::jsonb,
      created_by text references users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query(`
    create index if not exists project_records_project_module_idx
    on project_records (project_id, module, created_at desc)
  `);

  await syncSampleProjects();
  await seedProjects();
  await backfillProjectOwnership();
}

export async function ensureSchema() {
  if (!globalThis.__eztodoSchemaPromise) {
    globalThis.__eztodoSchemaPromise = initializeSchema();
  }

  try {
    await globalThis.__eztodoSchemaPromise;
  } catch (error) {
    globalThis.__eztodoSchemaPromise = null;
    throw error;
  }
}

export async function findUserByEmail(email) {
  const result = await query("select * from users where lower(email) = lower($1)", [
    email,
  ]);
  return result.rows[0] || null;
}

export async function findUserById(id) {
  const result = await query("select * from users where id = $1", [id]);
  return result.rows[0] || null;
}

export async function insertUser({
  email,
  name,
  organizationName = "",
  passwordHash,
  role = "member",
  canView = true,
  canEdit = false,
  emailVerified = false,
}) {
  const normalizedRole = role === "admin" ? "admin" : "member";
  const normalizedCanView = normalizedRole === "admin" ? true : Boolean(canView);
  const normalizedCanEdit =
    normalizedRole === "admin" ? true : normalizedCanView && Boolean(canEdit);
  const normalizedEmailVerified = normalizedRole === "admin" ? true : Boolean(emailVerified);
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const memberNumber = await nextMemberNumber(client);
    const result = await client.query(
      `insert into users (
         id, email, name, member_no, organization_name, password_hash, role, can_view, can_edit,
         email_verified, email_verified_at
       )
       values ($1, lower($2), $3, $4, $5, $6, $7, $8, $9, $10, case when $10 then now() else null end)
       returning *`,
      [
        randomUUID(),
        email,
        name,
        memberNumber,
        organizationName,
        passwordHash,
        normalizedRole,
        normalizedCanView,
        normalizedCanEdit,
        normalizedEmailVerified,
      ],
    );
    await client.query("commit");
    return result.rows[0];
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function createEmailVerificationToken(userId) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + emailVerificationDays() * 24 * 60 * 60 * 1000);
  const result = await query(
    `update users
     set email_verification_token_hash = $2,
         email_verification_expires_at = $3,
         email_verification_sent_at = now()
     where id = $1
     returning *`,
    [userId, hashVerificationToken(token), expiresAt],
  );

  if (!result.rows[0]) {
    throw new ApiError(404, "找不到帳號", "USER_NOT_FOUND");
  }

  return { token, user: result.rows[0] };
}

export async function verifyEmailToken(token) {
  if (!token) return null;

  const result = await query(
    `update users
     set email_verified = true,
         email_verified_at = now(),
         email_verification_token_hash = null,
         email_verification_expires_at = null
     where email_verification_token_hash = $1
       and email_verification_expires_at > now()
     returning *`,
    [hashVerificationToken(token)],
  );

  return result.rows[0] || null;
}

export async function listUsers() {
  const result = await query(
    `select u.*,
            count(p.id)::int as created_project_count
     from users u
     left join projects p on p.created_by = u.id
     group by u.id
     order by u.organization_name asc, u.member_no asc nulls last, u.created_at asc`,
  );
  return result.rows.map(mapUser);
}

export async function markUserLogin(id) {
  const result = await query(
    `update users
     set last_login_at = now()
     where id = $1
     returning *`,
    [id],
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function updateUserPermissions(id, { role, canView, canEdit }) {
  const current = await findUserById(id);
  if (!current) return null;

  const nextRole =
    current.role === "admin" ? "admin" : role === "admin" ? "admin" : role || current.role;
  const requestedCanView = canView ?? current.can_view;
  const requestedCanEdit = canEdit ?? current.can_edit;
  const nextCanView = nextRole === "admin" ? true : Boolean(requestedCanView);
  const nextCanEdit =
    nextRole === "admin" ? true : nextCanView && Boolean(requestedCanEdit);

  const result = await query(
    `update users
     set role = $2,
         can_view = $3,
         can_edit = $4
     where id = $1
     returning *`,
    [id, nextRole, nextCanView, nextCanEdit],
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function updateUserProfile(id, { name }) {
  const result = await query(
    `update users
     set name = $2
     where id = $1
     returning *`,
    [id, name],
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function updateUserPassword(id, passwordHash) {
  const result = await query(
    `update users
     set password_hash = $2
     where id = $1
     returning *`,
    [id, passwordHash],
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function deleteUser(id) {
  const result = await query("delete from users where id = $1 and role <> 'admin'", [id]);
  return result.rowCount > 0;
}

export async function listProjects(user) {
  const isAdmin = user?.role === "admin";
  const result = await query(
    `select p.*,
            owner_user.name as created_by_name,
            owner_user.email as created_by_email,
            pm.member_role,
            pm.can_view as member_can_view,
            pm.can_edit as member_can_edit,
            pm.can_view_claims as member_can_view_claims,
            pm.can_view_contracts as member_can_view_contracts,
            $2::text as user_role,
            count(all_members.user_id)::int as member_count
     from projects p
     left join users owner_user on owner_user.id = p.created_by
     left join project_members pm on pm.project_id = p.id and pm.user_id = $1
     left join project_members all_members on all_members.project_id = p.id
     where $2 = 'admin' or pm.user_id is not null
     group by p.id, owner_user.name, owner_user.email, pm.member_role, pm.can_view, pm.can_edit, pm.can_view_claims, pm.can_view_contracts
     order by p.created_at asc`,
    [user?.id || "", isAdmin ? "admin" : "member"],
  );
  return result.rows.map(mapProject);
}

export async function insertProject(project, userId) {
  const projectId = randomUUID();
  const result = await query(
    `insert into projects (
      id, name, owner, status, address, defects, daily_photos, next_claim,
      start_date, end_date, manager, note, attachments, owner_id, created_by
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $14)
    returning *`,
    [
      projectId,
      project.name || "未命名工地",
      project.owner || "未填寫",
      project.status || "進行中",
      project.address || "未填寫地址",
      Number(project.defects || 0),
      Number(project.dailyPhotos || 0),
      project.nextClaim || "2026/05",
      project.startDate || "",
      project.endDate || "",
      project.manager || "",
      project.note || "",
      JSON.stringify(project.attachments || []),
      userId || null,
    ],
  );

  if (userId) {
    await query(
      `insert into project_members (
         project_id, user_id, member_role, can_view, can_edit, can_view_claims, can_view_contracts, job_title, created_by
       )
       values ($1, $2, 'owner', true, true, true, true, '工地建立者', $2)
       on conflict (project_id, user_id) do update
       set member_role = 'owner',
           can_view = true,
           can_edit = true,
           can_view_claims = true,
           can_view_contracts = true,
           job_title = '工地建立者'`,
      [projectId, userId],
    );
  }

  return {
    ...mapProject(result.rows[0]),
    memberRole: userId ? "owner" : "",
    canView: Boolean(userId),
    canEdit: Boolean(userId),
    canManage: Boolean(userId),
    memberCount: userId ? 1 : 0,
  };
}

export async function deleteProject(id) {
  const result = await query("delete from projects where id = $1", [id]);
  return result.rowCount > 0;
}

export async function listProjectRecords(projectId, module) {
  const params = [projectId];
  let where = "where project_id = $1";

  if (module) {
    params.push(module);
    where += " and module = $2";
  }

  const result = await query(
    `select * from project_records ${where} order by created_at desc`,
    params,
  );

  return result.rows.map(mapRecord);
}

export async function insertProjectRecord(projectId, record, userId) {
  const payload = record.payload || {};
  const attachments = record.attachments || [];
  const result = await query(
    `insert into project_records (
      id, project_id, module, title, status, payload, attachments, created_by
    )
    values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
    returning *`,
    [
      randomUUID(),
      projectId,
      record.module,
      record.title,
      record.status || "",
      JSON.stringify(payload),
      JSON.stringify(attachments),
      userId,
    ],
  );

  return mapRecord(result.rows[0]);
}

export async function getProjectRecord(projectId, recordId) {
  const result = await query(
    "select * from project_records where project_id = $1 and id = $2",
    [projectId, recordId],
  );

  return result.rows[0] ? mapRecord(result.rows[0]) : null;
}

export async function updateProjectRecord(projectId, recordId, record) {
  const payload = record.payload || {};
  const attachments = record.attachments || [];
  const result = await query(
    `update project_records
     set title = $3,
         status = $4,
         payload = $5::jsonb,
         attachments = $6::jsonb,
         updated_at = now()
     where project_id = $1 and id = $2
     returning *`,
    [
      projectId,
      recordId,
      record.title,
      record.status || "",
      JSON.stringify(payload),
      JSON.stringify(attachments),
    ],
  );

  return result.rows[0] ? mapRecord(result.rows[0]) : null;
}

export async function deleteProjectRecord(projectId, recordId) {
  const result = await query(
    "delete from project_records where project_id = $1 and id = $2",
    [projectId, recordId],
  );
  return result.rowCount > 0;
}

export async function getProjectAccess(projectId, userId) {
  const result = await query(
    `select p.id as project_id,
            p.owner_id,
            pm.member_role,
            pm.can_view,
            pm.can_edit,
            pm.can_view_claims,
            pm.can_view_contracts
     from projects p
     left join project_members pm on pm.project_id = p.id and pm.user_id = $2
     where p.id = $1`,
    [projectId, userId],
  );

  return result.rows[0] || null;
}

export async function listProjectMembers(projectId) {
  const result = await query(
    `select pm.user_id,
            pm.member_role,
            pm.can_view,
            pm.can_edit,
            pm.can_view_claims,
            pm.can_view_contracts,
            pm.job_title,
            pm.created_at,
            u.name,
            u.email
     from project_members pm
     join users u on u.id = pm.user_id
     where pm.project_id = $1
     order by case pm.member_role
       when 'owner' then 1
       when 'manager' then 2
       when 'editor' then 3
       else 4
     end, pm.created_at asc`,
    [projectId],
  );

  return result.rows.map(mapProjectMember);
}

export async function upsertProjectMember(projectId, userId, options = {}) {
  const permissions = projectMemberPermissions(
    options.role || options.memberRole,
    options.canView,
    options.canEdit,
  );

  const result = await query(
    `insert into project_members (
       project_id, user_id, member_role, can_view, can_edit, can_view_claims, can_view_contracts, job_title, created_by
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     on conflict (project_id, user_id) do update
     set member_role = case
           when project_members.member_role = 'owner' then 'owner'
           else excluded.member_role
         end,
         can_view = case
           when project_members.member_role = 'owner' then true
           else excluded.can_view
         end,
         can_edit = case
           when project_members.member_role = 'owner' then true
           else excluded.can_edit
         end,
         can_view_claims = case
           when project_members.member_role = 'owner' then true
           else excluded.can_view_claims
         end,
         can_view_contracts = case
           when project_members.member_role = 'owner' then true
           else excluded.can_view_contracts
         end,
         job_title = case
           when project_members.member_role = 'owner' then project_members.job_title
           else excluded.job_title
         end
     returning *`,
    [
      projectId,
      userId,
      permissions.role,
      permissions.canView,
      permissions.canEdit,
      options.canViewClaims !== false,
      options.canViewContracts !== false,
      options.jobTitle || options.job_title || "現場工程師",
      options.createdBy || null,
    ],
  );

  return result.rows[0];
}

export async function removeProjectMember(projectId, userId) {
  const result = await query(
    "delete from project_members where project_id = $1 and user_id = $2 and member_role <> 'owner'",
    [projectId, userId],
  );
  return result.rowCount > 0;
}
