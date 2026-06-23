import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  activeCommonSettingItems,
  countCommonSettingUsage,
  defaultCommonSettings,
  normalizeCommonSettingItem,
  normalizeCommonSettings,
  removeCommonSettingItem,
  summarizeDailyReportResources,
} from "./commonSettings.js";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bell,
  Building2,
  CalendarDays,
  Camera,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  FileDown,
  FileText,
  History,
  ListChecks,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Megaphone,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  StickyNote,
  Trash2,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

function Button({ children, className = "", variant = "primary", size = "md", ...props }) {
  const base =
    "inline-flex max-w-full items-center justify-center gap-1 whitespace-nowrap border font-medium transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300";
  const styles = {
    primary: "border-slate-900 bg-slate-900 text-white hover:bg-slate-800",
    outline: "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
    subtle: "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
    danger: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-200",
    dangerGhost: "border-transparent bg-transparent text-red-600 hover:bg-red-50 focus-visible:ring-red-200",
  };
  const sizes = {
    sm: "min-h-9 rounded-lg px-2.5 py-1.5 text-xs",
    md: "min-h-11 rounded-xl px-3.5 py-2.5 text-sm",
    icon: "h-10 w-10 rounded-lg p-0",
  };
  const style = styles[variant] || styles.primary;
  const sizeClass = sizes[size] || sizes.md;

  return (
    <button className={`${base} ${sizeClass} ${style} ${className}`} {...props}>
      {children}
    </button>
  );
}

function ActionBar({ children, className = "" }) {
  return (
    <div
      className={`flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3 [&>button]:w-full sm:[&>button]:w-auto ${className}`}
    >
      {children}
    </div>
  );
}

const I = {
  dashboard: Building2,
  manual: FileText,
  notifications: Bell,
  operationLogs: History,
  projects: Megaphone,
  contracts: FileText,
  claims: WalletCards,
  memos: StickyNote,
  checklists: ListChecks,
  schedule: CalendarDays,
  meetings: UsersRound,
  daily: ClipboardList,
  defects: AlertTriangle,
  materials: Package,
  todos: CheckSquare,
  photos: Camera,
  commonSettings: Settings2,
};

const mods = [
  ["dashboard", "總覽"],
  ["manual", "操作手冊"],
  ["operationLogs", "操作紀錄"],
  ["projects", "重要公告"],
  ["contracts", "工程合約"],
  ["claims", "廠商請款"],
  ["memos", "工項 Memo"],
  ["checklists", "階段檢核表"],
  ["schedule", "預定進度"],
  ["meetings", "會議紀錄"],
  ["daily", "施工日報"],
  ["commonSettings", "常用設定"],
  ["defects", "缺失改善"],
  ["materials", "材料庫存"],
  ["todos", "待辦事項"],
  ["photos", "照片中心"],
].map(([id, label]) => ({ id, label, icon: I[id] }));

const APP_VERSION = "eztodo_26062301";
const SAMPLE_PROJECT_NAME = "範例工地：東區住宅新建工程";
const DAILY_AI_SOURCE_MAX_BYTES = 3 * 1024 * 1024;

const projectStatusOptions = ["籌備中", "進行中", "收尾中", "暫停", "結案"];
const organizationOptions = ["測試分組1", "測試分組2", "測試分組3"];
const meetingTypeOptions = ["工具箱會議", "承攬商會議", "工務會議", "協議組織會議"];
const memberNumberPrefix = "26";
const projectJobTitleOptions = [
  "工地主任",
  "現場工程師",
  "職安工程師",
  "品管工程師",
  "所長",
  "副所長",
  "組長",
  "副組長",
  "工務",
  "監工",
  "財務",
  "會計",
  "行政",
  "採購",
  "估算",
  "內業工程師",
  "業主代表",
  "協力廠商窗口",
];

const projects = [
  {
    name: SAMPLE_PROJECT_NAME,
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

const useLocalPreview =
  import.meta.env.DEV && String(import.meta.env.VITE_USE_API || "").toLowerCase() !== "true";
const previewUser = {
  id: "local-preview",
  email: "preview@local",
  name: "本機預覽",
  memberNumber: "2600001",
  organizationName: "測試分組1",
  role: "preview",
};
const previewProjects = projects.map((project, index) => ({
  id: `preview-${index + 1}`,
  ...project,
}));

const adminSeedUsers = [
  {
    id: "admin",
    name: "Renault",
    email: "irrvyh4815@gmail.com",
    memberNumber: "2600001",
    organizationName: "測試分組1",
    role: "admin",
    canView: true,
    canEdit: true,
    emailVerified: true,
  },
  {
    id: "viewer",
    name: "現場閱覽",
    email: "viewer@example.com",
    memberNumber: "2600002",
    organizationName: "測試分組2",
    role: "member",
    canView: true,
    canEdit: false,
    emailVerified: true,
  },
];

function normalizeAccountPermissions(user) {
  const isAdmin = user.role === "admin";
  const canView = Boolean(user.canView ?? true);
  return {
    ...user,
    memberNumber: user.memberNumber || user.member_no || "",
    organizationName: user.organizationName || user.organization_name || "",
    role: isAdmin ? "admin" : user.role || "member",
    canView: isAdmin ? true : canView,
    canEdit: isAdmin ? true : canView && Boolean(user.canEdit ?? false),
    emailVerified: isAdmin ? true : Boolean(user.emailVerified ?? true),
  };
}

function memberNumberSequence(value) {
  const match = String(value || "").match(/^\d{2}(\d{5})$/);
  return match ? Number(match[1]) : 0;
}

function nextPreviewMemberNumber(users = []) {
  const maxSequence = users.reduce(
    (max, user) => Math.max(max, memberNumberSequence(user.memberNumber)),
    0,
  );
  return `${memberNumberPrefix}${String(maxSequence + 1).padStart(5, "0")}`;
}

function defaultAccountDraft() {
  return {
    name: "",
    email: "",
    organizationName: organizationOptions[0],
    password: "",
    role: "member",
    canView: true,
    canEdit: false,
  };
}

const projectMemberRoleOptions = [
  { value: "manager", label: "共同管理者" },
  { value: "editor", label: "可編輯" },
  { value: "viewer", label: "僅閱覽" },
];

function projectMemberRoleLabel(role) {
  return {
    admin: "系統管理員",
    owner: "工地建立者",
    manager: "共同管理者",
    editor: "可編輯",
    viewer: "僅閱覽",
  }[role] || "成員";
}

const claimSeed = [
  {
    period: "第 1 期",
    month: "2026/05",
    trade: "水電工程",
    vendor: "宏鑫水電",
    contract: "水電配管工程",
    contractId: "contract-1",
    sourceType: "contract",
    contractAmount: 1200000,
    grossAmount: 200000,
    retentionAmount: 10000,
    cleaningFee: 3000,
    insuranceFee: 2000,
    otherDeduction: 0,
    amount: 185000,
    netAmount: 185000,
    status: "待付款",
    details: [
      { item: "2F 水電配管", quantity: 1, unit: "式", unitPrice: 120000, amount: 120000, note: "" },
      { item: "弱電箱與管線調整", quantity: 1, unit: "式", unitPrice: 80000, amount: 80000, note: "" },
    ],
    projectName: SAMPLE_PROJECT_NAME,
  },
  {
    period: "第 2 期",
    month: "2026/05",
    trade: "泥作工程",
    vendor: "順發泥作",
    contract: "浴室泥作工程",
    sourceType: "temporary",
    contractAmount: 180000,
    grossAmount: 132000,
    retentionAmount: 6000,
    cleaningFee: 0,
    insuranceFee: 0,
    otherDeduction: 0,
    amount: 126000,
    netAmount: 126000,
    status: "審核中",
    details: [
      { item: "浴室泥作修補", quantity: 1, unit: "式", unitPrice: 132000, amount: 132000, note: "臨時追加" },
    ],
    projectName: SAMPLE_PROJECT_NAME,
  },
  {
    period: "第 1 期",
    month: "2026/06",
    trade: "防水工程",
    vendor: "永信防水",
    contract: "防水工程",
    contractId: "contract-2",
    sourceType: "contract",
    contractAmount: 360000,
    grossAmount: 105000,
    retentionAmount: 5000,
    cleaningFee: 1000,
    insuranceFee: 1000,
    otherDeduction: 0,
    amount: 98000,
    netAmount: 98000,
    status: "待送審",
    details: [
      { item: "3F 浴室防水", quantity: 1, unit: "式", unitPrice: 105000, amount: 105000, note: "" },
    ],
    projectName: SAMPLE_PROJECT_NAME,
  },
];

const contractSeed = [
  {
    id: "contract-1",
    projectName: SAMPLE_PROJECT_NAME,
    name: "水電配管工程",
    vendor: "宏鑫水電",
    trade: "水電工程",
    amount: 1200000,
    status: "執行中",
    contact: "張先生",
    phone: "04-2222-1688",
    email: "service@hongxin.example",
    address: "台中市東區進德路 88 號",
    note: "現場窗口負責配管與弱電協調。",
    attachments: [],
  },
  {
    id: "contract-2",
    projectName: SAMPLE_PROJECT_NAME,
    name: "防水工程",
    vendor: "永信防水",
    trade: "防水工程",
    amount: 360000,
    status: "執行中",
    contact: "黃小姐",
    phone: "04-2233-9777",
    email: "contact@yongxin.example",
    address: "台中市南區忠明南路 120 號",
    note: "浴室與陽台防水保固五年。",
    attachments: [],
  },
];

const memos = [
  [
    "memo-1",
    SAMPLE_PROJECT_NAME,
    "水電工程",
    "2F 管線路徑待確認",
    "2026-05-26",
    "廚房排水與弱電箱位置需與業主確認後再封板。",
    "待確認",
  ],
  [
    "memo-2",
    SAMPLE_PROJECT_NAME,
    "防水工程",
    "浴室門檻加強",
    "2026-05-28",
    "3F 主臥浴室門檻需補強收邊，避免後續滲水爭議。",
    "追蹤中",
  ],
  [
    "memo-3",
    SAMPLE_PROJECT_NAME,
    "磁磚工程",
    "磁磚到料批號",
    "2026-05-29",
    "客浴牆磚需確認是否同批號，避免色差。",
    "待處理",
  ],
].map(([id, projectName, trade, title, date, note, status]) => ({
  id,
  projectName,
  trade,
  title,
  date,
  note,
  status,
  attachments: [],
}));

const checks = [];

const defectSeed = [
  ["3F 主臥浴室", "防水", "永信防水", "2026/05/25", "待改善", "重大"],
  ["2F 樓梯間", "油漆", "佳美油漆", "2026/05/27", "待複驗", "一般"],
  ["1F 客廳", "磁磚", "順發泥作", "2026/05/30", "改善中", "重要"],
].map(([location, type, vendor, due, status, level]) => ({
  location,
  type,
  vendor,
  due,
  status,
  level,
}));

const scheduleSeed = [
  {
    id: "schedule-1",
    projectName: SAMPLE_PROJECT_NAME,
    trade: "防水工班",
    name: "3F 防水試水",
    startDate: "2026-05-25",
    endDate: "2026-05-30",
    percent: 65,
    status: "進行中",
    note: "完成後安排複驗",
    attachments: [],
  },
  {
    id: "schedule-2",
    projectName: SAMPLE_PROJECT_NAME,
    trade: "水電工班",
    name: "2F 弱電箱定位",
    startDate: "2026-05-26",
    endDate: "2026-05-27",
    percent: 40,
    status: "進行中",
    note: "需與業主確認位置",
    attachments: [],
  },
];

const todoSeed = [
  {
    id: "todo-1",
    projectName: SAMPLE_PROJECT_NAME,
    title: "確認浴室門檻收邊",
    owner: "李工務",
    date: "2026-05-25",
    status: "重要",
    note: "與防水複驗一起確認",
    attachments: [],
  },
  {
    id: "todo-2",
    projectName: SAMPLE_PROJECT_NAME,
    title: "回覆業主弱電箱位置",
    owner: "王主任",
    date: "2026-05-27",
    status: "緊急",
    note: "確認後通知水電工班",
    attachments: [],
  },
];

const groups = {
  trade: [
    [
      "基礎工程",
      ["放樣工班", "土方開挖工班", "基礎鋼筋工班", "基礎模板工班", "基礎混凝土工班"],
    ],
    ["結構工程", ["鋼筋工班", "模板工班", "混凝土澆置工班", "鋼構工班"]],
    ["裝修工程", ["水電工班", "消防工班", "防水工班", "磁磚工班", "油漆工班", "木作工班", "清潔工班"]],
    ["假設與臨時工程", ["鷹架工班", "安全圍籬工班", "臨時水電工班", "吊掛工班"]],
    ["其他", ["點工", "雜工", "監工", "其他工班"]],
  ],
  material: [
    ["土建材料", ["水泥", "砂", "碎石", "混凝土", "鋼筋", "模板"]],
    ["裝修材料", ["磁磚", "填縫劑", "油漆", "矽利康", "木作板材"]],
    ["水電消防材料", ["PVC 管", "電線", "線槽", "開關插座", "消防管件"]],
    ["防水材料", ["防水材", "彈性水泥", "PU 防水", "止水條"]],
    ["其他", ["清潔用品", "耗材", "其他材料"]],
  ],
  equipment: [
    ["重型機具", ["吊車", "怪手", "堆高機", "挖土機"]],
    ["施工機具", ["切割機", "電鑽", "攪拌機", "震動機", "雷射水平儀"]],
    ["臨時設備", ["發電機", "抽水機", "照明設備", "臨時配電箱"]],
    ["安全設備", ["安全護欄", "安全網", "施工圍籬", "交通錐"]],
    ["其他", ["其他機具"]],
  ],
};

const weather = ["晴", "陰", "雨", "雷雨", "颱風", "高溫", "寒流"];

const twd = (n) =>
  new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(n || 0);

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  return value || "未設定";
}

function formatDateTime(value) {
  if (!value) return "尚未登入";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function countWorkDays(startDate, endDate = new Date()) {
  const start = parseDate(startDate);
  if (!start) return 0;

  const cursor = new Date(start);
  const end = new Date(endDate);
  cursor.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (cursor > end) return 0;

  let days = 0;
  while (cursor <= end) {
    days += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayKey() {
  return toDateKey(new Date());
}

function compareDateKey(value, fallback = "") {
  return String(value || fallback || "").slice(0, 10);
}

function isDateInRange(value, from, to) {
  const key = compareDateKey(value);
  if (!key || key === "未填日期") return false;
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function monthKeyFromDate(date) {
  return toDateKey(date).slice(0, 7);
}

function monthTitle(monthKey) {
  const date = parseDate(`${monthKey}-01`);
  if (!date) return monthKey;
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
  }).format(date);
}

function monthCalendarDays(monthKey) {
  const firstDay = parseDate(`${monthKey}-01`) || new Date();
  const gridStart = addDays(firstDay, -firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    const key = toDateKey(date);
    return {
      date: key,
      day: date.getDate(),
      currentMonth: monthKeyFromDate(date) === monthKey,
      isToday: key === todayKey(),
    };
  });
}

function moveMonth(monthKey, amount) {
  const date = parseDate(`${monthKey}-01`) || new Date();
  date.setMonth(date.getMonth() + amount);
  return monthKeyFromDate(date);
}

function matchesProject(item, project) {
  if (!item || !project) return false;
  if (item.projectId) return item.projectId === project.id;
  if (item.projectName) return item.projectName === project.name;
  return true;
}

function shortDateLabel(value) {
  const date = parseDate(value);
  if (!date) return value || "-";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function workDateRows(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end || start > end) return [];

  const rows = [];
  const cursor = new Date(start);
  let workDay = 0;

  while (cursor <= end) {
    workDay += 1;
    const date = toDateKey(cursor);
    rows.push({
      date,
      workDay,
      label: shortDateLabel(date),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return rows;
}

function normalizeDateRange(startDate, endDate) {
  const start = startDate || endDate || todayKey();
  const end = endDate || start;
  return start <= end ? { start, end } : { start: end, end: start };
}

function clampPercent(value) {
  const percent = Number(value);
  if (Number.isNaN(percent)) return 0;
  return Math.min(100, Math.max(0, percent));
}

const scheduleStatusOptions = ["未開始", "進行中", "延遲", "已完成"];
const scheduleStatusClass = {
  未開始: "border-slate-200 bg-slate-100 text-slate-700",
  進行中: "border-blue-200 bg-blue-50 text-blue-700",
  延遲: "border-red-200 bg-red-50 text-red-700",
  已完成: "border-emerald-200 bg-emerald-50 text-emerald-700",
};
const claimStatusOptions = ["待送審", "審核中", "退回修正", "待付款", "已付款", "已結案"];
const paidClaimStatuses = new Set(["已付款", "已結案"]);
const approvedClaimStatuses = new Set(["待付款", "已付款", "已結案"]);

const sum = (arr, m) =>
  arr.filter((x) => x.month === m).reduce((a, b) => a + claimGrossAmount(b), 0);

const byTrade = (arr, m) =>
  arr
    .filter((x) => x.month === m)
    .reduce((o, x) => {
      o[x.trade] = (o[x.trade] || 0) + claimGrossAmount(x);
      return o;
    }, {});

const del = (label, fn) =>
  window.confirm(`確定刪除「${label}」？`) &&
  window.confirm(`再次確認刪除「${label}」？`) &&
  fn();

async function apiFetch(path, options = {}) {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(path, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data =
    response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error || "伺服器連線失敗");
    error.code = data?.code || "API_ERROR";
    error.status = response.status;
    throw error;
  }

  return data;
}

function stripAttachmentFile(attachment = {}) {
  const { file, ...rest } = attachment;
  return rest;
}

function serializeAttachments(attachments = []) {
  return (attachments || []).map(stripAttachmentFile);
}

async function uploadAttachment(attachment, project, module) {
  if (!attachment?.file || useLocalPreview) return stripAttachmentFile(attachment);

  const form = new FormData();
  form.append("file", attachment.file, attachment.name || attachment.file.name);
  form.append("projectId", project?.id || "new-project");
  form.append("module", module || "attachments");
  const data = await apiFetch("/api/uploads", { method: "POST", body: form });

  if (attachment.url?.startsWith("blob:")) URL.revokeObjectURL(attachment.url);
  return {
    ...stripAttachmentFile(attachment),
    ...data.attachment,
  };
}

async function uploadAttachments(attachments, project, module) {
  return Promise.all(
    (attachments || []).map((attachment) =>
      uploadAttachment(attachment, project, module),
    ),
  );
}

function serializeRecordPayload(item = {}) {
  const { id, recordId, attachments = [], sourceAttachment, ...payload } = item;
  return {
    ...payload,
    attachments: serializeAttachments(attachments),
    ...(sourceAttachment ? { sourceAttachment: stripAttachmentFile(sourceAttachment) } : {}),
  };
}

function itemFromRecord(record) {
  const payload = record.payload || {};
  return {
    ...payload,
    id: record.id,
    recordId: record.id,
    status: payload.status ?? record.status,
    attachments: record.attachments || payload.attachments || [],
    createdAt: record.createdAt,
  };
}

function localRecordsKey(project, module) {
  return `eztodo-local-records:${project?.id || project?.name || "project"}:${module}`;
}

function seedItemsForProject(seedItems = [], project) {
  if (!project) return [];
  return seedItems
    .filter((item) => matchesProject(item, project))
    .map((item, index) => ({
      id: item.id || `${project.id || project.name}-${index}-${Date.now()}`,
      ...item,
    }));
}

const operationLogModule = "operationLogs";

function projectStorageKey(project) {
  return project?.id || project?.name || "project";
}

function moduleLabel(moduleId) {
  return mods.find((item) => item.id === moduleId)?.label || moduleId || "資料";
}

function recordDisplayTitle(item = {}, options = {}) {
  return (
    options.title ||
    item.title ||
    item.name ||
    item.stage ||
    item.location ||
    (item.vendor && item.period ? `${item.vendor} ${item.period}` : "") ||
    item.date ||
    "未命名資料"
  );
}

function operationActionLabel(action) {
  return {
    create: "新增",
    update: "編輯",
    delete: "刪除",
  }[action] || action;
}

function dispatchRecordCreated(project, module, record) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("eztodo:record-created", {
      detail: {
        projectKey: projectStorageKey(project),
        module,
        record,
      },
    }),
  );
}

async function appendOperationLog(project, entry) {
  if (!project?.id && !project?.name) return null;
  const log = {
    id: `operation-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date: todayKey(),
    createdAt: new Date().toISOString(),
    projectId: project?.id,
    projectName: project?.name,
    status: entry.action || "operation",
    ...entry,
  };

  if (useLocalPreview) {
    const key = localRecordsKey(project, operationLogModule);
    let current = [];
    try {
      current = JSON.parse(window.localStorage.getItem(key) || "[]");
    } catch {
      current = [];
    }
    const next = [log, ...current].slice(0, 300);
    window.localStorage.setItem(key, JSON.stringify(next));
    dispatchRecordCreated(project, operationLogModule, log);
    return log;
  }

  const data = await apiFetch(`/api/projects/${encodeURIComponent(project.id)}/records`, {
    method: "POST",
    body: JSON.stringify({
      module: operationLogModule,
      title: log.message || `${operationActionLabel(log.action)} ${log.targetTitle || ""}`.trim(),
      status: log.action || "operation",
      payload: serializeRecordPayload(log),
      attachments: [],
    }),
  });
  const saved = itemFromRecord(data.record);
  dispatchRecordCreated(project, operationLogModule, saved);
  return saved;
}

function isClosedStatus(status = "") {
  return ["已完成", "已結案", "結案", "完成"].includes(status);
}

function dateWithinDays(value, days = 7) {
  const date = parseDate(compareDateKey(value));
  if (!date) return false;
  const today = parseDate(todayKey());
  const end = addDays(today, days);
  return date >= today && date <= end;
}

function isOverdue(value) {
  const date = parseDate(compareDateKey(value));
  const today = parseDate(todayKey());
  return Boolean(date && today && date < today);
}

function buildProjectNotifications({ announcements = [], defects = [], meetings = [], todos = [], memos = [] }) {
  const notices = [];

  announcements
    .filter((item) => ["重要", "緊急"].includes(item.status) || item.status === "公告")
    .slice(0, 5)
    .forEach((item) => {
      notices.push({
        id: `announcement-${item.id}`,
        type: "公告",
        tone: item.status === "緊急" ? "danger" : "warning",
        title: item.name || item.title || "重要公告",
        desc: item.note || "請查看公告內容。",
        date: item.createdAt || item.date || "",
        module: "projects",
      });
    });

  defects
    .filter((item) => !isClosedStatus(item.status) && (isOverdue(item.due) || dateWithinDays(item.due, 7)))
    .forEach((item) => {
      notices.push({
        id: `defect-${item.id}`,
        type: "缺失",
        tone: isOverdue(item.due) ? "danger" : "warning",
        title: `${item.location || "未填位置"} ${isOverdue(item.due) ? "已逾期" : "即將到期"}`,
        desc: `${item.type || "缺失"}｜負責：${item.vendor || "未指定"}｜期限：${item.due || "未設定"}`,
        date: item.due,
        module: "defects",
      });
    });

  meetings
    .filter((item) => dateWithinDays(item.date, 7))
    .forEach((item) => {
      notices.push({
        id: `meeting-${item.id}`,
        type: "會議",
        tone: "info",
        title: item.title || item.meetingType || "近期會議",
        desc: `${item.date || "未設定日期"}｜${item.location || "未填地點"}｜記錄：${item.recorder || "未填寫"}`,
        date: item.date,
        module: "meetings",
      });
    });

  todos
    .filter((item) => !isClosedStatus(item.status) && (isOverdue(item.date) || dateWithinDays(item.date, 7)))
    .forEach((item) => {
      notices.push({
        id: `todo-${item.id}`,
        type: "待辦",
        tone: isOverdue(item.date) ? "danger" : "info",
        title: item.title || item.name || "近期待辦事項",
        desc: `${item.owner || "未指定"}｜${item.date || "未設定日期"}｜${item.note || "無備註"}`,
        date: item.date,
        module: "todos",
      });
    });

  memos
    .filter((item) => !isClosedStatus(item.status) && dateWithinDays(item.date, 7))
    .forEach((item) => {
      notices.push({
        id: `memo-${item.id}`,
        type: "Memo",
        tone: "info",
        title: item.title || "近期工項 Memo",
        desc: `${item.trade || "未分類"}｜${item.date || "未設定日期"}｜${item.status || "未設定狀態"}`,
        date: item.date,
        module: "memos",
      });
    });

  return notices.sort((a, b) => {
    const toneWeight = { danger: 0, warning: 1, info: 2 };
    const toneCompare = (toneWeight[a.tone] ?? 3) - (toneWeight[b.tone] ?? 3);
    if (toneCompare !== 0) return toneCompare;
    return compareDateKey(a.date, "9999-12-31").localeCompare(compareDateKey(b.date, "9999-12-31"));
  });
}

function projectModuleRestriction(project, module) {
  if (!project) return "";
  if (module === "claims" && project.canViewClaims === false) {
    return "此帳號沒有請款相關文件閱覽權限";
  }
  if (module === "contracts" && project.canViewContracts === false) {
    return "此帳號沒有合約相關文件閱覽權限";
  }
  return "";
}

function canUseProjectModule(project, moduleId) {
  return !projectModuleRestriction(project, moduleId);
}

function useProjectRecords(project, module, seedItems = []) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    if (!project?.id && !project?.name) {
      setItems([]);
      return () => {
        active = false;
      };
    }

    const restrictedMessage = projectModuleRestriction(project, module);
    if (restrictedMessage) {
      setItems([]);
      setError(restrictedMessage);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    if (useLocalPreview) {
      const key = localRecordsKey(project, module);
      const saved = window.localStorage.getItem(key);
      if (saved) {
        try {
          setItems(JSON.parse(saved));
        } catch {
          setItems(seedItemsForProject(seedItems, project));
        }
      } else {
        setItems(seedItemsForProject(seedItems, project));
      }
      return () => {
        active = false;
      };
    }

    async function loadRecords() {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch(
          `/api/projects/${encodeURIComponent(project.id)}/records?module=${encodeURIComponent(module)}`,
        );
        if (active) setItems((data.records || []).map(itemFromRecord));
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRecords();
    return () => {
      active = false;
    };
  }, [project?.id, project?.name, project?.canViewClaims, project?.canViewContracts, module]);

  useEffect(() => {
    if (typeof window === "undefined" || (!project?.id && !project?.name)) return undefined;

    function handleRecordCreated(event) {
      const detail = event.detail || {};
      if (detail.projectKey !== projectStorageKey(project) || detail.module !== module || !detail.record) {
        return;
      }
      setItems((current) =>
        current.some((item) => item.id === detail.record.id || item.recordId === detail.record.id)
          ? current
          : [detail.record, ...current],
      );
    }

    window.addEventListener("eztodo:record-created", handleRecordCreated);
    return () => window.removeEventListener("eztodo:record-created", handleRecordCreated);
  }, [project?.id, project?.name, module]);

  function writeLocal(nextItems) {
    if (!useLocalPreview || (!project?.id && !project?.name)) return;
    window.localStorage.setItem(localRecordsKey(project, module), JSON.stringify(nextItems));
  }

  async function saveItem(item, options = {}) {
    const restrictedMessage = projectModuleRestriction(project, module);
    if (restrictedMessage) {
      setError(restrictedMessage);
      throw new Error(restrictedMessage);
    }

    const attachments = useLocalPreview
      ? serializeAttachments(item.attachments)
      : await uploadAttachments(item.attachments, project, module);
    const sourceAttachment = item.sourceAttachment
      ? useLocalPreview
        ? stripAttachmentFile(item.sourceAttachment)
        : await uploadAttachment(item.sourceAttachment, project, `${module}-source`)
      : null;
    const nextLocal = {
      ...item,
      id: item.id || `${module}-${Date.now()}`,
      attachments,
      sourceAttachment,
      projectId: project?.id,
      projectName: project?.name,
    };

    if (useLocalPreview) {
      setItems((current) => {
        const nextItems = [nextLocal, ...current];
        writeLocal(nextItems);
        return nextItems;
      });
      if (module !== operationLogModule) {
        await appendOperationLog(project, {
          action: "create",
          targetModule: module,
          targetModuleLabel: moduleLabel(module),
          targetId: nextLocal.id,
          targetTitle: recordDisplayTitle(nextLocal, options),
          message: `新增「${recordDisplayTitle(nextLocal, options)}」至${moduleLabel(module)}`,
        }).catch(() => null);
      }
      return nextLocal;
    }

    const data = await apiFetch(`/api/projects/${encodeURIComponent(project.id)}/records`, {
      method: "POST",
      body: JSON.stringify({
        module,
        title:
          options.title ||
          item.title ||
          item.name ||
          item.stage ||
          item.location ||
          item.date ||
          "未命名資料",
        status: options.status || item.status || "",
        payload: serializeRecordPayload({
          ...item,
          attachments,
          sourceAttachment,
          projectId: project?.id,
          projectName: project?.name,
        }),
        attachments,
      }),
    });
    const saved = itemFromRecord(data.record);
    setItems((current) => [saved, ...current]);
    if (module !== operationLogModule) {
      await appendOperationLog(project, {
        action: "create",
        targetModule: module,
        targetModuleLabel: moduleLabel(module),
        targetId: saved.id,
        targetTitle: recordDisplayTitle(saved, options),
        message: `新增「${recordDisplayTitle(saved, options)}」至${moduleLabel(module)}`,
      }).catch(() => null);
    }
    return saved;
  }

  async function deleteItem(id) {
    const restrictedMessage = projectModuleRestriction(project, module);
    if (restrictedMessage) {
      setError(restrictedMessage);
      throw new Error(restrictedMessage);
    }

    const targetItem = items.find((item) => item.id === id || item.recordId === id);
    const targetTitle = recordDisplayTitle(targetItem);
    const previous = items;
    const nextItems = items.filter((item) => item.id !== id && item.recordId !== id);
    setItems(nextItems);
    writeLocal(nextItems);

    if (useLocalPreview) {
      if (module !== operationLogModule) {
        await appendOperationLog(project, {
          action: "delete",
          targetModule: module,
          targetModuleLabel: moduleLabel(module),
          targetId: id,
          targetTitle,
          message: `刪除${moduleLabel(module)}「${targetTitle}」`,
        }).catch(() => null);
      }
      return;
    }

    try {
      await apiFetch(
        `/api/projects/${encodeURIComponent(project.id)}/records/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (module !== operationLogModule) {
        await appendOperationLog(project, {
          action: "delete",
          targetModule: module,
          targetModuleLabel: moduleLabel(module),
          targetId: id,
          targetTitle,
          message: `刪除${moduleLabel(module)}「${targetTitle}」`,
        }).catch(() => null);
      }
    } catch (err) {
      setItems(previous);
      setError(err.message);
    }
  }

  async function updateItem(id, nextItem, options = {}) {
    const restrictedMessage = projectModuleRestriction(project, module);
    if (restrictedMessage) {
      setError(restrictedMessage);
      throw new Error(restrictedMessage);
    }

    const uploadedAttachments = useLocalPreview
      ? serializeAttachments(nextItem.attachments)
      : await uploadAttachments(nextItem.attachments, project, module);
    const uploadedSourceAttachment = nextItem.sourceAttachment
      ? useLocalPreview
        ? stripAttachmentFile(nextItem.sourceAttachment)
        : await uploadAttachment(nextItem.sourceAttachment, project, `${module}-source`)
      : null;
    const normalized = {
      ...nextItem,
      id,
      attachments: uploadedAttachments,
      sourceAttachment: uploadedSourceAttachment,
      projectId: project?.id,
      projectName: project?.name,
    };
    const previous = items;
    const previousItem = items.find((item) => item.id === id || item.recordId === id);
    const previousTitle = recordDisplayTitle(previousItem);
    const nextItems = items.map((item) =>
      item.id === id || item.recordId === id ? normalized : item,
    );
    setItems(nextItems);
    writeLocal(nextItems);

    if (useLocalPreview) {
      if (module !== operationLogModule) {
        await appendOperationLog(project, {
          action: "update",
          targetModule: module,
          targetModuleLabel: moduleLabel(module),
          targetId: id,
          targetTitle: recordDisplayTitle(normalized, options),
          previousTitle,
          message: `編輯${moduleLabel(module)}「${recordDisplayTitle(normalized, options)}」`,
        }).catch(() => null);
      }
      return normalized;
    }

    try {
      const data = await apiFetch(
        `/api/projects/${encodeURIComponent(project.id)}/records/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title:
              options.title ||
              normalized.title ||
              normalized.name ||
              normalized.stage ||
              normalized.location ||
              normalized.date ||
              "未命名資料",
            status: options.status || normalized.status || "",
            payload: serializeRecordPayload(normalized),
            attachments: normalized.attachments,
          }),
        },
      );
      const saved = itemFromRecord(data.record);
      setItems((current) =>
        current.map((item) => (item.id === id || item.recordId === id ? saved : item)),
      );
      if (module !== operationLogModule) {
        await appendOperationLog(project, {
          action: "update",
          targetModule: module,
          targetModuleLabel: moduleLabel(module),
          targetId: saved.id,
          targetTitle: recordDisplayTitle(saved, options),
          previousTitle,
          message: `編輯${moduleLabel(module)}「${recordDisplayTitle(saved, options)}」`,
        }).catch(() => null);
      }
      return saved;
    } catch (err) {
      setItems(previous);
      setError(err.message);
      throw err;
    }
  }

  return { items, loading, error, saveItem, updateItem, deleteItem, setItems };
}

console.assert(sum(claimSeed, "2026/05") === 332000, "claim total test");
console.assert(byTrade(claimSeed, "2026/05")["水電工程"] === 200000, "trade summary test");

function Badge({ children }) {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-medium leading-none text-slate-700">
      {children}
    </span>
  );
}

function VersionFooter({ className = "" }) {
  return (
    <div className={`text-center text-[11px] font-medium text-slate-400 ${className}`}>
      版本 {APP_VERSION}
    </div>
  );
}

function Del({ label, onClick, icon = false, className = "" }) {
  return (
    <Button
      type="button"
      variant="danger"
      size={icon ? "icon" : "sm"}
      onClick={() => del(label, onClick)}
      className={className}
      aria-label={`刪除 ${label}`}
    >
      <Trash2 className={icon ? "h-3.5 w-3.5" : "mr-1 h-3.5 w-3.5"} />
      {icon ? null : "刪除"}
    </Button>
  );
}

function EditButton({ label, onClick, icon = false, className = "" }) {
  return (
    <Button
      type="button"
      variant="outline"
      size={icon ? "icon" : "sm"}
      onClick={onClick}
      className={className}
      aria-label={`編輯 ${label}`}
    >
      <Pencil className={icon ? "h-3.5 w-3.5" : "mr-1 h-3.5 w-3.5"} />
      {icon ? null : "編輯"}
    </Button>
  );
}

function toImageAttachments(fileList, meta = {}) {
  return Array.from(fileList || [])
    .filter((file) => file.type.startsWith("image/"))
    .map((file) => {
      const { keepFile: _keepFile, ...attachmentMeta } = meta;
      return {
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
        file,
        ...attachmentMeta,
      };
    });
}

function ImageAttachments({
  value = [],
  onChange,
  className = "",
  title = "圖片附件",
  description = "可上傳現場照片，作為此筆資料的附件紀錄。",
  buttonLabel = "上傳圖片",
  maxFiles,
  meta,
}) {
  const inputId = useMemo(
    () => `image-attachments-${Math.random().toString(36).slice(2)}`,
    [],
  );
  const remaining = Number.isFinite(maxFiles) ? Math.max(maxFiles - value.length, 0) : null;

  return (
    <div className={className}>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const picked = toImageAttachments(event.target.files, meta);
          const limited = Number.isFinite(maxFiles) ? picked.slice(0, remaining) : picked;
          onChange([...(value || []), ...limited]);
          event.target.value = "";
        }}
      />
      <div className="flex flex-col gap-3 rounded-2xl border border-dashed bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
          {Number.isFinite(maxFiles) ? (
            <p className="mt-1 text-xs font-medium text-slate-500">
              已選 {value.length}/{maxFiles} 張
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={Number.isFinite(maxFiles) && value.length >= maxFiles}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          <Camera className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>
      </div>
      {value?.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {value.map((image) => (
            <div key={image.id} className="flex items-center gap-3 rounded-xl border bg-white p-2">
              <img
                src={image.url}
                alt={image.name}
                className="h-14 w-14 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{image.name}</p>
                <p className="text-xs text-slate-500">{Math.ceil(image.size / 1024)} KB</p>
              </div>
              <Button
                type="button"
                onClick={() => onChange(value.filter((item) => item.id !== image.id))}
                variant="dangerGhost"
                size="icon"
                className="shrink-0"
                aria-label={`移除 ${image.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AttachmentSummary({ attachments = [] }) {
  if (!attachments?.length) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Badge>圖片 {attachments.length} 張</Badge>
      {attachments.slice(0, 4).map((image) => (
        <img
          key={image.id}
          src={image.url}
          alt={image.name}
          className="h-10 w-10 rounded-lg border object-cover"
        />
      ))}
    </div>
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dailyReportRowsHtml(rows = [], columns = []) {
  if (!rows.length) return `<p class="empty">尚無資料</p>`;

  return `
    <table>
      <thead>
        <tr>${columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                ${columns
                  .map(([key]) => `<td>${escapeHtml(row[key] || "未填寫")}</td>`)
                  .join("")}
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function attachmentPrintHtml(attachments = []) {
  if (!attachments?.length) return `<p class="empty">未附加照片</p>`;

  return `
    <div class="photos">
      ${attachments
        .map(
          (image) => `
            <figure>
              ${image.url ? `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.name)}" />` : ""}
              <figcaption>${escapeHtml(image.name || "未命名圖片")}</figcaption>
            </figure>
          `,
        )
        .join("")}
    </div>
  `;
}

function compactA4PrintOverrides() {
  return `
    @page { size: A4; margin: 10mm; }
    body { font-size: 12px; line-height: 1.42; }
    h1 { font-size: 22px; margin-top: 4px; }
    h2 { font-size: 16px; }
    .cover {
      margin-bottom: 10px;
      padding-bottom: 10px;
    }
    .eyebrow { font-size: 11px; }
    .meta, .summary {
      gap: 6px;
      margin-top: 8px;
    }
    .summary { margin-bottom: 12px; }
    .meta div, .summary div {
      border-radius: 6px;
      padding: 6px 8px;
    }
    .label { font-size: 10px; }
    .value { font-size: 12px; }
    .report, .record {
      break-inside: auto;
      page-break-inside: auto;
      border-radius: 8px;
      margin-bottom: 10px;
      overflow: visible;
    }
    .report-header, .record-header {
      break-after: avoid;
      page-break-after: avoid;
      padding: 8px 10px;
    }
    .report-body, .record-body { padding: 8px 10px; }
    .section {
      break-inside: auto;
      page-break-inside: auto;
      margin-top: 8px;
    }
    .section h3 {
      break-after: avoid;
      page-break-after: avoid;
      font-size: 13px;
      margin-bottom: 4px;
    }
    table {
      break-inside: auto;
      page-break-inside: auto;
      font-size: 11px;
    }
    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    th, td { padding: 4px 6px; }
    .note {
      border-radius: 6px;
      font-size: 11px;
      min-height: 24px;
      padding: 6px 8px;
    }
    .photos {
      gap: 6px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    figure {
      border-radius: 6px;
      padding: 4px;
    }
    figure img {
      max-height: 70mm;
      object-fit: contain;
    }
    @media print {
      .report, .record {
        break-inside: auto !important;
        page-break-inside: auto !important;
      }
      .report-header, .record-header, tr {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  `;
}

function dailyReportsPrintHtml({ project, reports, from, to, includePhotos }) {
  const totalWorkers = reports.reduce((total, report) => total + Number(report.workers || 0), 0);
  const generatedAt = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return `<!doctype html>
    <html lang="zh-Hant">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(project.name)} 施工日報匯出</title>
        <style>
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          body {
            color: #0f172a;
            font-family: "Noto Sans TC", "Microsoft JhengHei", Arial, sans-serif;
            margin: 0;
            line-height: 1.55;
          }
          h1, h2, h3, p { margin: 0; }
          .cover {
            border-bottom: 3px solid #0f172a;
            margin-bottom: 18px;
            padding-bottom: 14px;
          }
          .eyebrow { color: #64748b; font-size: 12px; font-weight: 700; letter-spacing: .04em; }
          h1 { font-size: 26px; margin-top: 6px; }
          .meta {
            display: grid;
            gap: 8px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            margin-top: 14px;
          }
          .meta div, .summary div {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 9px 10px;
          }
          .label { color: #64748b; display: block; font-size: 11px; }
          .value { display: block; font-size: 14px; font-weight: 700; margin-top: 2px; }
          .summary {
            display: grid;
            gap: 8px;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            margin: 14px 0 20px;
          }
          .report {
            break-inside: avoid;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            margin-bottom: 16px;
            overflow: hidden;
          }
          .report-header {
            background: #0f172a;
            color: white;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 14px;
          }
          .report-body { padding: 12px 14px; }
          .section { margin-top: 12px; }
          .section h3 { font-size: 15px; margin-bottom: 6px; }
          table {
            border-collapse: collapse;
            font-size: 12px;
            width: 100%;
          }
          th, td {
            border: 1px solid #e2e8f0;
            padding: 7px 8px;
            text-align: left;
            vertical-align: top;
          }
          th { background: #f8fafc; color: #475569; }
          .note {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            font-size: 12px;
            min-height: 36px;
            padding: 9px 10px;
            white-space: pre-wrap;
          }
          .empty { color: #64748b; font-size: 12px; }
          .photos {
            display: grid;
            gap: 10px;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          figure {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            margin: 0;
            overflow: hidden;
            padding: 6px;
          }
          figure img {
            aspect-ratio: 4 / 3;
            display: block;
            object-fit: cover;
            width: 100%;
          }
          figcaption {
            color: #475569;
            font-size: 11px;
            margin-top: 5px;
            word-break: break-word;
          }
          .no-print { margin-top: 18px; }
          .no-print button {
            background: #0f172a;
            border: 0;
            border-radius: 10px;
            color: white;
            cursor: pointer;
            font: inherit;
            padding: 10px 14px;
          }
          @media print {
            .no-print { display: none; }
            .report { page-break-inside: avoid; }
          }
          ${compactA4PrintOverrides()}
        </style>
      </head>
      <body>
        <section class="cover">
          <p class="eyebrow">EZtoDO工程管理程式｜施工日報 PDF 匯出</p>
          <h1>${escapeHtml(project.name)} 施工日報彙整</h1>
          <div class="meta">
            <div><span class="label">工地地址</span><span class="value">${escapeHtml(project.address || "未填寫")}</span></div>
            <div><span class="label">日期區間</span><span class="value">${escapeHtml(from || "不限")} 至 ${escapeHtml(to || "不限")}</span></div>
            <div><span class="label">匯出時間</span><span class="value">${escapeHtml(generatedAt)}</span></div>
            <div><span class="label">照片附件</span><span class="value">${includePhotos ? "包含" : "不包含"}</span></div>
          </div>
        </section>
        <section class="summary">
          <div><span class="label">日報筆數</span><span class="value">${reports.length}</span></div>
          <div><span class="label">累計出工人數</span><span class="value">${totalWorkers}</span></div>
          <div><span class="label">匯出版本</span><span class="value">${escapeHtml(APP_VERSION)}</span></div>
        </section>
        ${reports
          .map(
            (report) => `
              <article class="report">
                <header class="report-header">
                  <div>
                    <h2>${escapeHtml(report.date)} 施工日報</h2>
                    <p>天氣：${escapeHtml(report.weather || "未選擇")}｜總人數：${escapeHtml(report.workers || 0)}</p>
                  </div>
                  <p>${escapeHtml(report.weatherNote || "")}</p>
                </header>
                <div class="report-body">
                  <section class="section">
                    <h3>施工工班</h3>
                    ${dailyReportRowsHtml(report.work || [], [
                      ["trade", "工班"],
                      ["workers", "人數"],
                      ["description", "施工項目"],
                      ["note", "備註"],
                    ])}
                  </section>
                  <section class="section">
                    <h3>材料使用 / 進場</h3>
                    ${dailyReportRowsHtml(report.materials || [], [
                      ["name", "材料"],
                      ["spec", "規格"],
                      ["quantity", "數量"],
                      ["unit", "單位"],
                      ["note", "備註"],
                    ])}
                  </section>
                  <section class="section">
                    <h3>機具使用</h3>
                    ${dailyReportRowsHtml(report.equipment || [], [
                      ["name", "機具"],
                      ["specification", "規格"],
                      ["quantity", "數量"],
                      ["unit", "單位"],
                      ["note", "備註"],
                    ])}
                  </section>
                  <section class="section">
                    <h3>其他備註 / 記事</h3>
                    <div class="note">${escapeHtml(report.dailyNote || report.note || "未填寫")}</div>
                  </section>
                  ${
                    includePhotos
                      ? `<section class="section">
                          <h3>現場施工照</h3>
                          ${attachmentPrintHtml(report.attachments || [])}
                        </section>`
                      : ""
                  }
                </div>
              </article>
            `,
          )
          .join("")}
        <div class="no-print">
          <button type="button" onclick="window.print()">列印 / 另存 PDF</button>
        </div>
        <script>
          window.addEventListener("load", () => {
            setTimeout(() => window.print(), 400);
          });
        </script>
      </body>
    </html>`;
}

function openDailyReportsPdfExport(options) {
  const printWindow = window.open("", "_blank", "width=1100,height=800");
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(dailyReportsPrintHtml(options));
  printWindow.document.close();
  return true;
}

function formatResourceQuantity(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Number.isInteger(number) ? number : Number(number.toFixed(2));
}

function meetingRecordsPrintHtml({ project, records, from, to, includeAttachments }) {
  const generatedAt = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  const typeSummary = records.reduce((summary, record) => {
    const type = record.meetingType || "未分類會議";
    summary[type] = (summary[type] || 0) + 1;
    return summary;
  }, {});

  return `<!doctype html>
    <html lang="zh-Hant">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(project.name)} 會議紀錄匯出</title>
        <style>
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          body {
            color: #0f172a;
            font-family: "Noto Sans TC", "Microsoft JhengHei", Arial, sans-serif;
            margin: 0;
            line-height: 1.55;
          }
          h1, h2, h3, p { margin: 0; }
          .cover {
            border-bottom: 3px solid #0f172a;
            margin-bottom: 18px;
            padding-bottom: 14px;
          }
          .eyebrow { color: #64748b; font-size: 12px; font-weight: 700; letter-spacing: .04em; }
          h1 { font-size: 26px; margin-top: 6px; }
          .meta, .summary {
            display: grid;
            gap: 8px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            margin-top: 14px;
          }
          .summary { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 20px; }
          .meta div, .summary div {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 9px 10px;
          }
          .label { color: #64748b; display: block; font-size: 11px; }
          .value { display: block; font-size: 14px; font-weight: 700; margin-top: 2px; }
          .record {
            break-inside: avoid;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            margin-bottom: 16px;
            overflow: hidden;
          }
          .record-header {
            background: #0f172a;
            color: white;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 14px;
          }
          .record-body { padding: 12px 14px; }
          .section { margin-top: 12px; }
          .section h3 { font-size: 15px; margin-bottom: 6px; }
          table {
            border-collapse: collapse;
            font-size: 12px;
            width: 100%;
          }
          th, td {
            border: 1px solid #e2e8f0;
            padding: 7px 8px;
            text-align: left;
            vertical-align: top;
          }
          th { background: #f8fafc; color: #475569; }
          .note {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            font-size: 12px;
            min-height: 36px;
            padding: 9px 10px;
            white-space: pre-wrap;
          }
          .empty { color: #64748b; font-size: 12px; }
          .photos {
            display: grid;
            gap: 10px;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          figure {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            margin: 0;
            overflow: hidden;
            padding: 6px;
          }
          figure img {
            aspect-ratio: 4 / 3;
            display: block;
            object-fit: cover;
            width: 100%;
          }
          figcaption {
            color: #475569;
            font-size: 11px;
            margin-top: 5px;
            word-break: break-word;
          }
          .no-print { margin-top: 18px; }
          .no-print button {
            background: #0f172a;
            border: 0;
            border-radius: 10px;
            color: white;
            cursor: pointer;
            font: inherit;
            padding: 10px 14px;
          }
          @media print {
            .no-print { display: none; }
            .record { page-break-inside: avoid; }
          }
          ${compactA4PrintOverrides()}
        </style>
      </head>
      <body>
        <section class="cover">
          <p class="eyebrow">EZtoDO工程管理程式｜會議紀錄 PDF 匯出</p>
          <h1>${escapeHtml(project.name)} 會議紀錄彙整</h1>
          <div class="meta">
            <div><span class="label">工地地址</span><span class="value">${escapeHtml(project.address || "未填寫")}</span></div>
            <div><span class="label">日期區間</span><span class="value">${escapeHtml(from || "不限")} 至 ${escapeHtml(to || "不限")}</span></div>
            <div><span class="label">匯出時間</span><span class="value">${escapeHtml(generatedAt)}</span></div>
            <div><span class="label">附件</span><span class="value">${includeAttachments ? "包含" : "不包含"}</span></div>
          </div>
        </section>
        <section class="summary">
          <div><span class="label">會議筆數</span><span class="value">${records.length}</span></div>
          <div><span class="label">會議類型</span><span class="value">${escapeHtml(Object.keys(typeSummary).length || 0)}</span></div>
          <div><span class="label">匯出版本</span><span class="value">${escapeHtml(APP_VERSION)}</span></div>
        </section>
        ${records
          .map(
            (record) => `
              <article class="record">
                <header class="record-header">
                  <div>
                    <h2>${escapeHtml(record.date)} ${escapeHtml(record.meetingType || "會議紀錄")}</h2>
                    <p>${escapeHtml(record.title || "未命名會議")}｜地點：${escapeHtml(record.location || "未填寫")}</p>
                  </div>
                  <p>記錄：${escapeHtml(record.recorder || "未填寫")}</p>
                </header>
                <div class="record-body">
                  <section class="section">
                    <h3>基本資訊</h3>
                    <table>
                      <tbody>
                        <tr><th>主席 / 主持人</th><td>${escapeHtml(record.chair || "未填寫")}</td><th>記錄人員</th><td>${escapeHtml(record.recorder || "未填寫")}</td></tr>
                        <tr><th>會議地點</th><td>${escapeHtml(record.location || "未填寫")}</td><th>會議日期</th><td>${escapeHtml(record.date || "未設定")}</td></tr>
                      </tbody>
                    </table>
                  </section>
                  <section class="section">
                    <h3>與會人員</h3>
                    ${dailyReportRowsHtml(record.attendees || [], [
                      ["name", "姓名"],
                      ["company", "單位 / 公司"],
                      ["role", "職務"],
                      ["note", "備註"],
                    ])}
                  </section>
                  <section class="section">
                    <h3>會議內容 / 決議事項</h3>
                    ${dailyReportRowsHtml(record.items || [], [
                      ["topic", "項目"],
                      ["content", "內容"],
                      ["decision", "決議 / 待辦"],
                      ["owner", "負責人"],
                      ["dueDate", "期限"],
                      ["note", "備註"],
                    ])}
                  </section>
                  <section class="section">
                    <h3>其他備註</h3>
                    <div class="note">${escapeHtml(record.note || "未填寫")}</div>
                  </section>
                  ${
                    includeAttachments
                      ? `<section class="section">
                          <h3>附件圖片</h3>
                          ${attachmentPrintHtml(record.attachments || [])}
                        </section>`
                      : ""
                  }
                </div>
              </article>
            `,
          )
          .join("")}
        <div class="no-print">
          <button type="button" onclick="window.print()">列印 / 另存 PDF</button>
        </div>
        <script>
          window.addEventListener("load", () => {
            setTimeout(() => window.print(), 400);
          });
        </script>
      </body>
    </html>`;
}

function openMeetingRecordsPdfExport(options) {
  const printWindow = window.open("", "_blank", "width=1100,height=800");
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(meetingRecordsPrintHtml(options));
  printWindow.document.close();
  return true;
}

function normalizeRecordDate(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "未填日期" || raw === "未設定") return "";
  if (/^\d{4}\/\d{1,2}$/.test(raw)) {
    const [year, month] = raw.split("/");
    return `${year}-${month.padStart(2, "0")}-01`;
  }
  if (/^\d{4}-\d{1,2}$/.test(raw)) {
    const [year, month] = raw.split("-");
    return `${year}-${month.padStart(2, "0")}-01`;
  }
  if (/^\d{4}\/\d{1,2}\/\d{1,2}/.test(raw)) {
    const [year, month, day] = raw.split(/[\/\s]/);
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return compareDateKey(raw);
}

function recordDateKey(record = {}) {
  return normalizeRecordDate(
    record.date ||
      record.due ||
      record.dueDate ||
      record.month ||
      record.startDate ||
      record.endDate ||
      record.createdAt,
  );
}

function flattenRecordText(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(flattenRecordText).join(" ");
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => !["attachments", "sourceAttachment", "file", "url"].includes(key))
      .map(([, entry]) => flattenRecordText(entry))
      .join(" ");
  }
  return String(value);
}

function printValue(value) {
  if (value == null || value === "") return "未填寫";
  return String(value);
}

function printFieldsHtml(fields = []) {
  const cleanFields = fields.filter(Boolean);
  if (!cleanFields.length) return `<p class="empty">未填寫資料</p>`;
  const rows = [];
  for (let index = 0; index < cleanFields.length; index += 2) {
    rows.push(cleanFields.slice(index, index + 2));
  }

  return `
    <table class="field-table">
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                ${row
                  .map(
                    ([label, value]) =>
                      `<th>${escapeHtml(label)}</th><td>${escapeHtml(printValue(value))}</td>`,
                  )
                  .join("")}
                ${row.length === 1 ? `<th></th><td></td>` : ""}
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function printRecordHtml(record, includeAttachments) {
  return `
    <article class="record">
      <header class="record-header">
        <div>
          <h2>${escapeHtml(record.title || "未命名資料")}</h2>
          ${record.subtitle ? `<p>${escapeHtml(record.subtitle)}</p>` : ""}
        </div>
        ${record.status ? `<p>${escapeHtml(record.status)}</p>` : ""}
      </header>
      <div class="record-body">
        <section class="section">
          <h3>基本資料</h3>
          ${printFieldsHtml(record.fields || [])}
        </section>
        ${(record.tables || [])
          .map(
            (table) => `
              <section class="section">
                <h3>${escapeHtml(table.title)}</h3>
                ${dailyReportRowsHtml(table.rows || [], table.columns || [])}
              </section>
            `,
          )
          .join("")}
        ${
          record.note
            ? `<section class="section"><h3>備註</h3><div class="note">${escapeHtml(record.note)}</div></section>`
            : ""
        }
        ${
          includeAttachments
            ? `<section class="section">
                <h3>附件圖片</h3>
                ${attachmentPrintHtml(record.attachments || [])}
              </section>`
            : ""
        }
      </div>
    </article>
  `;
}

function genericRecordsPrintHtml({
  project,
  title,
  records,
  from,
  to,
  includeAttachments,
  buildPrintRecord,
}) {
  const generatedAt = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  const printRecords = records.map(buildPrintRecord);

  return `<!doctype html>
    <html lang="zh-Hant">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(project.name)} ${escapeHtml(title)}匯出</title>
        <style>
          * { box-sizing: border-box; }
          body {
            color: #0f172a;
            font-family: "Noto Sans TC", "Microsoft JhengHei", Arial, sans-serif;
            margin: 0;
          }
          h1, h2, h3, p { margin: 0; }
          .cover {
            border-bottom: 2px solid #0f172a;
          }
          .meta, .summary {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .summary { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .meta div, .summary div {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }
          .label { color: #64748b; display: block; }
          .value { display: block; font-weight: 700; }
          .record {
            border: 1px solid #cbd5e1;
            overflow: visible;
          }
          .record-header {
            background: #0f172a;
            color: white;
            display: flex;
            justify-content: space-between;
            gap: 12px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          th, td {
            border: 1px solid #e2e8f0;
            text-align: left;
            vertical-align: top;
            word-break: break-word;
          }
          th { background: #f8fafc; color: #475569; width: 18%; }
          .note {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            white-space: pre-wrap;
          }
          .empty { color: #64748b; }
          .photos {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          figure {
            border: 1px solid #e2e8f0;
            margin: 0;
            overflow: hidden;
          }
          figure img {
            display: block;
            object-fit: contain;
            width: 100%;
          }
          figcaption {
            color: #475569;
            word-break: break-word;
          }
          .no-print { margin-top: 14px; }
          .no-print button {
            background: #0f172a;
            border: 0;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            font: inherit;
            padding: 8px 12px;
          }
          @media print { .no-print { display: none; } }
          ${compactA4PrintOverrides()}
        </style>
      </head>
      <body>
        <section class="cover">
          <p class="eyebrow">EZtoDO工程管理程式｜${escapeHtml(title)} PDF 匯出</p>
          <h1>${escapeHtml(project.name)} ${escapeHtml(title)}彙整</h1>
          <div class="meta">
            <div><span class="label">工地地址</span><span class="value">${escapeHtml(project.address || "未填寫")}</span></div>
            <div><span class="label">日期區間</span><span class="value">${escapeHtml(from || "不限")} 至 ${escapeHtml(to || "不限")}</span></div>
            <div><span class="label">匯出時間</span><span class="value">${escapeHtml(generatedAt)}</span></div>
            <div><span class="label">附件圖片</span><span class="value">${includeAttachments ? "包含" : "不包含"}</span></div>
          </div>
        </section>
        <section class="summary">
          <div><span class="label">匯出筆數</span><span class="value">${records.length}</span></div>
          <div><span class="label">資料類型</span><span class="value">${escapeHtml(title)}</span></div>
          <div><span class="label">匯出版本</span><span class="value">${escapeHtml(APP_VERSION)}</span></div>
        </section>
        ${printRecords.map((record) => printRecordHtml(record, includeAttachments)).join("")}
        <div class="no-print">
          <button type="button" onclick="window.print()">列印 / 另存 PDF</button>
        </div>
        <script>
          window.addEventListener("load", () => {
            setTimeout(() => window.print(), 400);
          });
        </script>
      </body>
    </html>`;
}

function openGenericRecordsPdfExport(options) {
  const printWindow = window.open("", "_blank", "width=1100,height=800");
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(genericRecordsPrintHtml(options));
  printWindow.document.close();
  return true;
}

function useRecordExport({ project, title, records, buildPrintRecord }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [query, setQuery] = useState("");
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [exportError, setExportError] = useState("");

  const filteredRecords = records.filter((record) => {
    const keyword = query.trim().toLowerCase();
    const matchesKeyword = !keyword || flattenRecordText(record).toLowerCase().includes(keyword);
    const matchesDate = !dateFrom && !dateTo ? true : isDateInRange(recordDateKey(record), dateFrom, dateTo);
    return matchesKeyword && matchesDate;
  });

  function exportRecords(targetRecords = filteredRecords, range = {}) {
    const recordsToExport = [...targetRecords].sort((a, b) =>
      recordDateKey(a).localeCompare(recordDateKey(b)),
    );
    if (!recordsToExport.length) {
      setExportError("目前檢索條件內沒有可匯出的資料。");
      return;
    }

    const opened = openGenericRecordsPdfExport({
      project,
      title,
      records: recordsToExport,
      from: range.from ?? dateFrom,
      to: range.to ?? dateTo,
      includeAttachments,
      buildPrintRecord,
    });

    if (!opened) {
      setExportError("瀏覽器封鎖了匯出視窗，請允許彈出視窗後再試一次。");
      return;
    }

    setExportError("");
  }

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setQuery("");
    setExportError("");
  }

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    query,
    setQuery,
    includeAttachments,
    setIncludeAttachments,
    exportError,
    filteredRecords,
    exportRecords,
    clearFilters,
  };
}

function RecordExportToolbar({ controls, placeholder = "搜尋資料內容" }) {
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="grid gap-2 xl:grid-cols-[150px_150px_minmax(220px,1fr)_auto_auto] xl:items-end">
          <label>
            <span className="text-xs font-medium text-slate-500">開始日期</span>
            <div className="mt-1">
              <Input type="date" value={controls.dateFrom} onChange={controls.setDateFrom} />
            </div>
          </label>
          <label>
            <span className="text-xs font-medium text-slate-500">結束日期</span>
            <div className="mt-1">
              <Input type="date" value={controls.dateTo} onChange={controls.setDateTo} />
            </div>
          </label>
          <label>
            <span className="text-xs font-medium text-slate-500">快速檢索</span>
            <div className="mt-1">
              <Input value={controls.query} onChange={controls.setQuery} ph={placeholder} />
            </div>
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={controls.includeAttachments}
              onChange={(event) => controls.setIncludeAttachments(event.target.checked)}
            />
            包含附件
          </label>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-none xl:grid-flow-col">
            <Button type="button" onClick={() => controls.exportRecords()}>
              <FileDown className="mr-2 h-4 w-4" />
              匯出 PDF
            </Button>
            <Button type="button" variant="outline" onClick={controls.clearFilters}>
              清除
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>目前符合：{controls.filteredRecords.length} 筆</p>
          <p>匯出會依日期排序，並使用 A4 版面重新排版。</p>
        </div>
        {controls.exportError ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {controls.exportError}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function numberValue(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function claimDetailAmount(row = {}) {
  const directAmount = Number(row.amount);
  if (Number.isFinite(directAmount) && directAmount > 0) return directAmount;
  return numberValue(row.quantity) * numberValue(row.unitPrice);
}

function claimDetailTotal(details = []) {
  return details.reduce((total, row) => total + claimDetailAmount(row), 0);
}

function claimRetentionAmount(claim = {}) {
  return numberValue(claim.retentionAmount);
}

function claimCleaningFee(claim = {}) {
  return numberValue(claim.cleaningFee);
}

function claimInsuranceFee(claim = {}) {
  return numberValue(claim.insuranceFee);
}

function claimOtherDeduction(claim = {}) {
  return numberValue(claim.otherDeduction);
}

function claimDeductionTotal(claim = {}) {
  return (
    claimRetentionAmount(claim) +
    claimCleaningFee(claim) +
    claimInsuranceFee(claim) +
    claimOtherDeduction(claim)
  );
}

function claimGrossAmount(claim = {}) {
  const detailsTotal = claimDetailTotal(claim.details || []);
  return numberValue(claim.grossAmount ?? claim.claimAmount ?? (detailsTotal || claim.amount));
}

function claimNetAmount(claim = {}) {
  if (claim.netAmount !== undefined && claim.netAmount !== null && claim.netAmount !== "") {
    return numberValue(claim.netAmount);
  }
  if (
    claim.grossAmount === undefined &&
    claim.claimAmount === undefined &&
    !claim.details?.length &&
    claim.amount !== undefined
  ) {
    return numberValue(claim.amount);
  }
  return Math.max(claimGrossAmount(claim) - claimDeductionTotal(claim), 0);
}

function claimPaidAmount(claim = {}) {
  return paidClaimStatuses.has(claim.status) ? claimNetAmount(claim) : 0;
}

function claimContractKey(claim = {}) {
  return String(claim.contractId || `${claim.vendor || ""}::${claim.contract || ""}`);
}

function claimIsTemporary(claim = {}, contracts = []) {
  if (claim.sourceType === "temporary") return true;
  if (claim.contractId) return false;
  return !contracts.some(
    (contract) => contract.vendor === claim.vendor && contract.name === claim.contract,
  );
}

function contractForClaim(claim = {}, contracts = []) {
  if (claim.contractId) return contracts.find((contract) => contract.id === claim.contractId) || null;
  return (
    contracts.find((contract) => contract.vendor === claim.vendor && contract.name === claim.contract) || null
  );
}

function claimContractAmount(claim = {}, contracts = []) {
  const contract = contractForClaim(claim, contracts);
  return numberValue(claim.contractAmount || contract?.amount);
}

function normalizedClaim(claim = {}, contracts = []) {
  const grossAmount = claimGrossAmount(claim);
  const netAmount = claimNetAmount(claim);
  const contract = contractForClaim(claim, contracts);
  const temporary = claimIsTemporary(claim, contracts);

  return {
    ...claim,
    sourceType: claim.sourceType || (temporary ? "temporary" : "contract"),
    contractId: claim.contractId || contract?.id || "",
    contractAmount: claimContractAmount(claim, contracts),
    grossAmount,
    retentionAmount: claimRetentionAmount(claim),
    cleaningFee: claimCleaningFee(claim),
    insuranceFee: claimInsuranceFee(claim),
    otherDeduction: claimOtherDeduction(claim),
    deductionTotal: claimDeductionTotal(claim),
    netAmount,
    paidAmount: claimPaidAmount(claim),
    temporary,
  };
}

function summarizeClaims(claims = [], contracts = []) {
  const normalized = claims.map((claim) => normalizedClaim(claim, contracts));
  const contractTotal = contracts.reduce((total, contract) => total + numberValue(contract.amount), 0);
  const temporaryContractTotal = normalized
    .filter((claim) => claim.temporary)
    .reduce((total, claim) => total + Math.max(claim.contractAmount, claim.grossAmount), 0);
  const totals = normalized.reduce(
    (summary, claim) => {
      summary.grossAmount += claim.grossAmount;
      summary.approvedAmount += approvedClaimStatuses.has(claim.status) ? claim.netAmount : 0;
      summary.paidAmount += claim.paidAmount;
      summary.netAmount += claim.netAmount;
      summary.retentionAmount += claim.retentionAmount;
      summary.cleaningFee += claim.cleaningFee;
      summary.insuranceFee += claim.insuranceFee;
      summary.otherDeduction += claim.otherDeduction;
      summary.deductionTotal += claim.deductionTotal;
      return summary;
    },
    {
      contractTotal: contractTotal + temporaryContractTotal,
      formalContractTotal: contractTotal,
      temporaryContractTotal,
      grossAmount: 0,
      approvedAmount: 0,
      paidAmount: 0,
      netAmount: 0,
      retentionAmount: 0,
      cleaningFee: 0,
      insuranceFee: 0,
      otherDeduction: 0,
      deductionTotal: 0,
    },
  );
  const vendorMap = new Map();

  normalized.forEach((claim) => {
    const vendor = claim.vendor || "未填寫廠商";
    const current =
      vendorMap.get(vendor) || {
        vendor,
        claims: [],
        formalContractTotal: contracts
          .filter((contract) => contract.vendor === vendor)
          .reduce((total, contract) => total + numberValue(contract.amount), 0),
        temporaryContractTotal: 0,
        grossAmount: 0,
        netAmount: 0,
        paidAmount: 0,
        retentionAmount: 0,
        cleaningFee: 0,
        insuranceFee: 0,
        statuses: {},
      };
    current.claims.push(claim);
    if (claim.temporary) current.temporaryContractTotal += Math.max(claim.contractAmount, claim.grossAmount);
    current.grossAmount += claim.grossAmount;
    current.netAmount += claim.netAmount;
    current.paidAmount += claim.paidAmount;
    current.retentionAmount += claim.retentionAmount;
    current.cleaningFee += claim.cleaningFee;
    current.insuranceFee += claim.insuranceFee;
    current.statuses[claim.status || "未設定"] = (current.statuses[claim.status || "未設定"] || 0) + 1;
    vendorMap.set(vendor, current);
  });

  const vendors = Array.from(vendorMap.values())
    .map((vendor) => ({
      ...vendor,
      contractTotal: vendor.formalContractTotal + vendor.temporaryContractTotal,
      unpaidAmount: Math.max(vendor.netAmount - vendor.paidAmount, 0),
    }))
    .sort((a, b) => b.grossAmount - a.grossAmount);

  return {
    totals: {
      ...totals,
      unpaidAmount: Math.max(totals.netAmount - totals.paidAmount, 0),
      remainingContractAmount: Math.max(totals.contractTotal - totals.grossAmount, 0),
    },
    vendors,
    normalized,
  };
}

function buildClaimPrintRecord(record) {
  const claim = normalizedClaim(record);
  return {
    title: `${claim.vendor || "未填寫廠商"} ${claim.period || ""}`.trim(),
    subtitle: claim.temporary ? `臨時發包 / 無合約｜${claim.contract}` : claim.contract,
    status: claim.status,
    fields: [
      ["請款模式", claim.temporary ? "臨時發包 / 無合約" : "合約請款"],
      ["廠商名稱", claim.vendor],
      ["工程類別", claim.trade],
      ["合約 / 發包名稱", claim.contract],
      ["合約總額", twd(claim.contractAmount)],
      ["期別", claim.period],
      ["請款月份", claim.month],
      ["請款總額", twd(claim.grossAmount)],
      ["保留款", twd(claim.retentionAmount)],
      ["清潔費", twd(claim.cleaningFee)],
      ["保險費", twd(claim.insuranceFee)],
      ["其他扣款", twd(claim.otherDeduction)],
      ["本期應付", twd(claim.netAmount)],
      ["狀態", claim.status],
    ],
    tables: claim.details?.length
      ? [
          {
            title: "請款明細",
            rows: claim.details.map((row, index) => ({
              index: index + 1,
              item: row.item,
              quantity: row.quantity,
              unit: row.unit,
              unitPrice: row.unitPrice ? twd(row.unitPrice) : "",
              amount: twd(claimDetailAmount(row)),
              note: row.note,
            })),
            columns: [
              ["index", "序"],
              ["item", "工項"],
              ["quantity", "數量"],
              ["unit", "單位"],
              ["unitPrice", "單價"],
              ["amount", "金額"],
              ["note", "備註"],
            ],
          },
        ]
      : [],
    note: claim.note,
    attachments: claim.attachments,
  };
}

function buildContractPrintRecord(record) {
  return {
    title: record.name,
    subtitle: `廠商：${record.vendor || "未填寫"}`,
    status: record.status,
    fields: [
      ["合約名稱", record.name],
      ["廠商", record.vendor],
      ["工程類別", record.trade],
      ["合約金額", twd(record.amount)],
      ["狀態", record.status],
      ["聯絡人", record.contact],
      ["電話", record.phone],
      ["Email", record.email],
      ["地址", record.address],
    ],
    note: record.note,
    attachments: record.attachments,
  };
}

function buildMemoPrintRecord(record) {
  return {
    title: record.title,
    subtitle: `${record.trade || "未分類工項"}｜${record.date || "未設定"}`,
    status: record.status,
    fields: [
      ["日期", record.date],
      ["工項", record.trade],
      ["標題", record.title],
      ["狀態", record.status],
    ],
    note: record.note,
    attachments: record.attachments,
  };
}

function buildChecklistPrintRecord(record) {
  const checkedItems = Array.isArray(record.checkedItems)
    ? record.checkedItems
    : (record.items || []).slice(0, record.done || 0);

  return {
    title: record.stage,
    subtitle: `已完成 ${record.done || 0}/${record.items?.length || 0}`,
    status: (record.done || 0) >= (record.items?.length || 0) && record.items?.length ? "已完成" : "未完成",
    fields: [
      ["階段名稱", record.stage],
      ["檢核項目數", record.items?.length || 0],
      ["已完成", record.done || 0],
    ],
    tables: [
      {
        title: "檢核項目",
        rows: (record.items || []).map((item, index) => ({
          index: index + 1,
          item,
          status: checkedItems.includes(item) ? "完成" : "未完成",
        })),
        columns: [
          ["index", "序"],
          ["item", "項目"],
          ["status", "狀態"],
        ],
      },
    ],
    attachments: record.attachments,
  };
}

function buildDefectPrintRecord(record) {
  return {
    title: `${record.location || "未填寫位置"} ${record.type || ""}`.trim(),
    subtitle: `負責廠商：${record.vendor || "未指定"}`,
    status: record.status,
    fields: [
      ["缺失位置", record.location],
      ["類型", record.type],
      ["負責廠商", record.vendor],
      ["改善期限", record.due],
      ["狀態", record.status],
      ["嚴重程度", record.level],
    ],
    attachments: record.attachments,
  };
}

function buildTodoPrintRecord(record) {
  return {
    title: record.title,
    subtitle: `負責人：${record.owner || "未指定"}｜日期：${record.date || "未設定"}`,
    status: record.status,
    fields: [
      ["待辦事項", record.title],
      ["負責人", record.owner],
      ["日期", record.date],
      ["優先度", record.status],
    ],
    note: record.note,
    attachments: record.attachments,
  };
}

function buildPlaceholderPrintRecord(record, schema) {
  return {
    title: record.name,
    subtitle: schema.fields
      .filter((field) => field.key !== "name" && record[field.key])
      .slice(0, 2)
      .map((field) => `${field.label}：${record[field.key]}`)
      .join("｜"),
    status: record.status,
    fields: schema.fields.map((field) => [field.label, record[field.key]]),
    note: record.note,
    attachments: record.attachments,
  };
}

function buildOperationLogPrintRecord(record) {
  return {
    title: record.message || `${operationActionLabel(record.action)} ${record.targetTitle || ""}`.trim(),
    subtitle: `${record.targetModuleLabel || moduleLabel(record.targetModule)}｜${formatDateTime(record.createdAt)}`,
    status: operationActionLabel(record.action),
    fields: [
      ["操作", operationActionLabel(record.action)],
      ["模組", record.targetModuleLabel || moduleLabel(record.targetModule)],
      ["目標資料", record.targetTitle],
      ["操作時間", formatDateTime(record.createdAt)],
      ["日期", record.date],
    ],
    note: record.message,
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function withRowIds(rows, emptyRow) {
  const source = Array.isArray(rows) && rows.length ? rows : [emptyRow];
  return source.map((row, index) => ({
    id: Date.now() + index + Math.floor(Math.random() * 1000),
    ...emptyRow,
    ...row,
  }));
}

function Header({ title, sub, btn = "新增資料", onAdd }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 break-words text-sm text-slate-500">{sub}</p>
      </div>
      {onAdd ? (
        <Button type="button" className="w-full rounded-xl sm:w-auto" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {btn}
        </Button>
      ) : null}
    </div>
  );
}

function Stat({ title, value, desc, icon: Icon }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-slate-500">{title}</p>
            <h3 className="mt-2 break-words text-xl font-bold sm:text-2xl">{value}</h3>
            <p className="mt-1 text-xs text-slate-500">{desc}</p>
          </div>
          <div className="shrink-0 rounded-2xl bg-slate-100 p-3">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const otherOptionValue = "__other__";
const otherOptionLabel = "其他";

function CustomSelect({
  value = "",
  onChange,
  options = [],
  groupedOptions = [],
  placeholder,
  className = "",
  selectClassName = "",
  otherPlaceholder = "請輸入其他內容",
}) {
  const optionValues = [
    ...options,
    ...groupedOptions.flatMap(([, items]) => items),
  ];
  const hasValue = value !== "";
  const isOtherValue =
    value === otherOptionLabel || (hasValue && !optionValues.includes(value));
  const selectValue = isOtherValue ? otherOptionValue : value;

  return (
    <div className={className}>
      <select
        value={selectValue}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next === otherOptionValue ? otherOptionLabel : next);
        }}
        className={`w-full rounded-xl border bg-white px-3 py-2 outline-none ${selectClassName}`}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        {groupedOptions.map(([group, items]) => (
          <optgroup key={group} label={group}>
            {items.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={otherOptionValue}>{otherOptionLabel}</option>
      </select>
      {isOtherValue ? (
        <Input
          value={value === otherOptionLabel ? "" : value}
          onChange={onChange}
          ph={otherPlaceholder}
        />
      ) : null}
    </div>
  );
}

function SelectGroup({ value, onChange, type, placeholder }) {
  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      groupedOptions={groups[type]}
      placeholder={placeholder}
      otherPlaceholder="請輸入自訂項目"
      className="space-y-2"
    />
  );
}

const quickAddOptionValue = "__quick_add_common_setting__";

function CommonSettingSelect({
  value,
  items,
  placeholder,
  onChange,
  onQuickAdd,
  quickAddLabel,
}) {
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const activeItems = items.filter((item) => item.isActive);
  const hasCurrentValue = value && !activeItems.some((item) => item.name === value);

  async function submitQuickAdd() {
    if (busy) return;
    const name = quickName.trim();
    if (!name) {
      setError("請輸入名稱");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const item = await onQuickAdd(name);
      onChange(item.name, item);
      setQuickName("");
      setQuickOpen(false);
    } catch (quickAddError) {
      setError(quickAddError.message || "新增常用設定失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <select
        value={value || ""}
        onChange={(event) => {
          if (event.target.value === quickAddOptionValue) {
            setQuickOpen(true);
            return;
          }
          const item = activeItems.find((candidate) => candidate.name === event.target.value);
          onChange(event.target.value, item || null);
        }}
        className="w-full rounded-xl border bg-white px-3 py-2 outline-none"
      >
        <option value="">{placeholder}</option>
        {hasCurrentValue ? <option value={value}>{value}</option> : null}
        {activeItems.map((item) => (
          <option key={item.id} value={item.name}>
            {item.name}
          </option>
        ))}
        <option value={quickAddOptionValue}>＋ 新增至常用設定</option>
      </select>
      {quickOpen ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-medium text-slate-600">{quickAddLabel}</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input
              type="text"
              value={quickName}
              autoFocus
              inputMode="text"
              placeholder="輸入名稱"
              aria-label={quickAddLabel}
              className="w-full rounded-xl border bg-white px-3 py-2 outline-none"
              onInput={(event) => setQuickName(event.currentTarget.value)}
              onChange={(event) => setQuickName(event.currentTarget.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(event) => {
                setIsComposing(false);
                setQuickName(event.currentTarget.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !isComposing && !busy) {
                  event.preventDefault();
                  submitQuickAdd();
                }
              }}
            />
            <Button type="button" size="sm" onClick={submitQuickAdd} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              新增並套用
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setQuickOpen(false);
                setQuickName("");
                setError("");
              }}
            >
              取消
            </Button>
          </div>
          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function Input({ value, onChange, ph = "", type = "text", ro = false }) {
  const controlledProps =
    onChange || ro
      ? {
          value: value ?? "",
          onChange: (e) => onChange?.(e.target.value),
          readOnly: ro,
        }
      : { defaultValue: value ?? "" };

  return (
    <input
      type={type}
      placeholder={ph}
      className={`w-full rounded-xl border px-3 py-2 outline-none ${
        ro ? "bg-slate-100 text-slate-600" : "bg-white"
      }`}
      {...controlledProps}
    />
  );
}

function LoadingScreen() {
  return (
    <Shell full>
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          載入中
        </div>
      </div>
    </Shell>
  );
}

function LoginTransitionScreen({ user, onDone }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 1200);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-400">EZtoDO工程管理程式</p>
            <h1 className="mt-2 text-2xl font-bold">正在開啟工作台</h1>
            <p className="mt-2 text-sm text-slate-300">
              {user?.name || "使用者"}，正在整理你的工地資料與權限。
            </p>
          </div>
          <motion.div
            animate={{ rotate: [0, 8, -6, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.2 }}
            className="rounded-2xl bg-white p-3 text-slate-950"
          >
            <Building2 className="h-7 w-7" />
          </motion.div>
        </div>
        <div className="mt-6 grid gap-3">
          {["確認帳號權限", "載入工地清單", "準備表單模組"].map((text, index) => (
            <motion.div
              key={text}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.18 + index * 0.15, duration: 0.25 }}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200"
            >
              <CheckSquare className="h-4 w-4 text-emerald-300" />
              {text}
            </motion.div>
          ))}
        </div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.05, ease: "easeInOut" }}
            className="h-full rounded-full bg-white"
          />
        </div>
      </motion.div>
    </div>
  );
}

function AccordionSection({ title, desc, meta, open, onToggle, children }) {
  return (
    <div className="rounded-2xl border bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50"
      >
        <span className="min-w-0">
          <span className="block font-bold text-slate-900">{title}</span>
          {desc ? <span className="mt-1 block text-sm text-slate-500">{desc}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {meta ? <Badge>{meta}</Badge> : null}
          <ChevronRight
            className={`h-5 w-5 text-slate-500 transition ${open ? "rotate-90" : ""}`}
          />
        </span>
      </button>
      {open ? <div className="border-t p-4">{children}</div> : null}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [organizationName, setOrganizationName] = useState(organizationOptions[0]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [resendNotice, setResendNotice] = useState("");
  const [registerNotice, setRegisterNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const loginTags = ["工地管理", "施工日報", "廠商請款", "缺失追蹤", "甘特圖", "照片附件"];

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setErrorCode("");
    setResendNotice("");
    setRegisterNotice("");
    setLoading(true);

    try {
      if (mode === "register") {
        if (!name.trim()) {
          throw new Error("請輸入暱稱 / 姓名");
        }
        if (!organizationName) {
          throw new Error("請選擇所屬單位");
        }
        if (password.length < 8) {
          throw new Error("密碼至少需要 8 碼");
        }
        if (password !== confirmPassword) {
          throw new Error("兩次輸入的密碼不一致");
        }

        const data = await apiFetch("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ name, email, password, organizationName }),
        });

        if (data.emailVerificationRequired) {
          setRegisterNotice("註冊完成，驗證信已寄出。請先到信箱完成驗證後再登入。");
          setMode("login");
          setPassword("");
          setConfirmPassword("");
          return;
        }

        onLogin(data.user);
        return;
      }

      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
      setErrorCode(err.code || "");
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setError("");
    setResendNotice("");
    setResendLoading(true);

    try {
      const data = await apiFetch("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setResendNotice(data.message || "驗證信已寄出，請到信箱收信。");
    } catch (err) {
      setError(err.message);
      setErrorCode(err.code || "");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <Shell full>
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-5xl items-center gap-6 lg:grid-cols-[1fr_420px]">
        <div className="rounded-3xl bg-slate-900 p-8 text-white">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div className="inline-flex rounded-2xl bg-white/10 p-3">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <p className="text-right text-sm font-medium text-slate-300">製作團隊：R3nault</p>
          </div>
          <p className="text-sm font-medium text-slate-300">把案場每天的大小事，整理成能追蹤的進度</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
            EZtoDO工程管理程式
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-200">
            從工地進度、廠商合約、請款節點到缺失改善，將現場訊息、
            表單與照片紀錄收進同一個工作台，讓工程管理少一點翻找，多一點掌握。
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {loginTags.map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100">
                {item}
              </span>
            ))}
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-2xl font-bold">01</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">工地資料集中，避免多案場紀錄混在一起。</p>
            </div>
            <div>
              <p className="text-2xl font-bold">02</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">請款、Memo、待辦與缺失都能依工地追蹤。</p>
            </div>
            <div>
              <p className="text-2xl font-bold">03</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">預定進度搭配日曆檢視，讓下一步工作更好安排。</p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex rounded-2xl border bg-slate-50 p-1">
              {[
                ["login", "登入帳號"],
                ["register", "註冊帳號"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setMode(id);
                    setError("");
                    setErrorCode("");
                    setResendNotice("");
                    setRegisterNotice("");
                  }}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold transition ${
                    mode === id ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <h2 className="mt-5 text-xl font-bold">
              {mode === "login" ? "登入 EZtoDO" : "建立新帳號"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "login"
                ? "請輸入帳號密碼進入你的工地工作台。"
                : "註冊帳號必須使用可收信的 Email；完成信箱驗證後，才可以進入操作頁面。"}
            </p>
            <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
              {mode === "register" ? (
                <label>
                  <span className="text-sm font-medium">暱稱 / 姓名</span>
                  <div className="mt-2">
                    <Input value={name} onChange={setName} ph="例如：王主任" />
                  </div>
                </label>
              ) : null}
              {mode === "register" ? (
                <label>
                  <span className="text-sm font-medium">所屬單位</span>
                  <select
                    value={organizationName}
                    onChange={(event) => setOrganizationName(event.target.value)}
                    className="mt-2 w-full rounded-xl border bg-white px-3 py-2 outline-none"
                    required
                  >
                    {organizationOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label>
                <span className="text-sm font-medium">
                  {mode === "register" ? "帳號 Email" : "帳號"}
                </span>
                <div className="mt-2">
                  <Input value={email} onChange={setEmail} ph="email@example.com" type="email" />
                </div>
              </label>
              <label>
                <span className="text-sm font-medium">密碼</span>
                <div className="mt-2">
                  <Input
                    type="password"
                    value={password}
                    onChange={setPassword}
                    ph={mode === "login" ? "請輸入密碼" : "至少 8 碼"}
                  />
                </div>
              </label>
              {mode === "register" ? (
                <label>
                  <span className="text-sm font-medium">確認密碼</span>
                  <div className="mt-2">
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      ph="再次輸入密碼"
                    />
                  </div>
                </label>
              ) : null}
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                  {errorCode === "EMAIL_NOT_VERIFIED" ? (
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resendVerification}
                        disabled={resendLoading}
                        className="bg-white text-red-700 hover:bg-red-50"
                      >
                        {resendLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-2 h-4 w-4" />
                        )}
                        重寄驗證信
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {resendNotice ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {resendNotice}
                </div>
              ) : null}
              {registerNotice ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {registerNotice}
                </div>
              ) : null}
              <Button type="submit" disabled={loading} className="mt-1">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                {mode === "login" ? "登入" : "註冊帳號"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <VersionFooter className="mt-4" />
    </Shell>
  );
}

function ProjectSelect({ onSelect }) {
  const [mode, setMode] = useState("list");
  const [list, setList] = useState(useLocalPreview ? previewProjects : []);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(!useLocalPreview);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [p, setP] = useState({
    name: "",
    owner: "",
    address: "",
    status: "進行中",
    startDate: "",
    endDate: "",
    manager: "",
    note: "",
    attachments: [],
  });

  async function loadProjects({ quiet = false } = {}) {
    if (useLocalPreview) {
      setRefreshing(false);
      return;
    }

    setLoading(!quiet);
    setRefreshing(quiet);
    setError("");

    try {
      const data = await apiFetch("/api/projects");
      setList(data.projects || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function createProject() {
    let nextProject = {
      ...p,
      id: `preview-${Date.now()}`,
      name: p.name || "未命名工地",
      owner: p.owner || "未填寫",
      address: p.address || "未填寫地址",
      defects: 0,
      dailyPhotos: 0,
      nextClaim: "2026/05",
    };

    setError("");

    if (useLocalPreview) {
      setList([...list, nextProject]);
      onSelect(nextProject);
      return;
    }

    try {
      nextProject = {
        ...nextProject,
        attachments: await uploadAttachments(
          nextProject.attachments,
          { id: nextProject.id },
          "project",
        ),
      };
      const data = await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify(nextProject),
      });
      setList([...list, data.project]);
      onSelect(data.project);
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeProject(project) {
    setError("");

    if (useLocalPreview) {
      setList(list.filter((item) => item.id !== project.id));
      return;
    }

    try {
      await apiFetch(`/api/projects/${project.id}`, { method: "DELETE" });
      setList(list.filter((item) => item.id !== project.id));
    } catch (err) {
      setError(err.message);
    }
  }

  const filteredProjects = list.filter((project) => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return true;
    return [project.name, project.owner, project.address]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });

  if (mode === "create") {
    return (
      <Shell full>
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">建立新的工地資料</h1>
            <p className="mt-2 text-sm text-slate-300">
              後續日報、合約、請款、缺失與照片都會歸到此工地。
            </p>
          </div>
        </div>
        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <Card>
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            {[
              ["name", "工地名稱"],
              ["owner", "業主 / 客戶"],
              ["address", "工地地址"],
              ["manager", "工地主任 / 管理人"],
            ].map(([key, label]) => (
              <label key={key} className={key === "name" || key === "address" ? "md:col-span-2" : ""}>
                <span className="text-sm font-medium">{label}</span>
                <div className="mt-2">
                  <Input value={p[key]} onChange={(value) => setP({ ...p, [key]: value })} />
                </div>
              </label>
            ))}
            <label>
              <span className="text-sm font-medium">狀態</span>
              <CustomSelect
                value={p.status}
                onChange={(value) => setP({ ...p, status: value })}
                options={projectStatusOptions}
                className="mt-2 space-y-2"
                otherPlaceholder="請輸入自訂工地狀態"
              />
            </label>
            <label>
              <span className="text-sm font-medium">開工日期</span>
              <div className="mt-2">
                <Input type="date" value={p.startDate} onChange={(value) => setP({ ...p, startDate: value })} />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">預計完工日期</span>
              <div className="mt-2">
                <Input type="date" value={p.endDate} onChange={(value) => setP({ ...p, endDate: value })} />
              </div>
            </label>
            <label className="md:col-span-2">
              <span className="text-sm font-medium">備註</span>
              <textarea
                value={p.note}
                onChange={(e) => setP({ ...p, note: e.target.value })}
                className="mt-2 min-h-24 w-full rounded-xl border px-3 py-2"
              />
            </label>
            <ImageAttachments
              className="md:col-span-2"
              value={p.attachments}
              onChange={(attachments) => setP({ ...p, attachments })}
            />
            <ActionBar className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setMode("list")}>
                取消
              </Button>
              <Button
                type="button"
                onClick={createProject}
              >
                <Save className="mr-2 h-4 w-4" />
                儲存並進入
              </Button>
            </ActionBar>
          </CardContent>
        </Card>
        <VersionFooter className="mt-4" />
      </Shell>
    );
  }

  return (
    <Shell full>
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">請先創建/選擇工地</h1>
          <p className="mt-2 text-sm text-slate-300">
            只會顯示你建立或被邀請共同管理的工地。
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          disabled={refreshing || loading}
          onClick={() => loadProjects({ quiet: true })}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          刷新工地
        </Button>
      </div>
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="flex gap-3 rounded-2xl border bg-white p-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full outline-none"
            placeholder="搜尋工地"
          />
        </div>
        <Button type="button" variant="outline" onClick={() => setMode("create")}>
          <Plus className="mr-2 h-4 w-4" />
          新增工地
        </Button>
      </div>
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
          讀取工地資料中
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {!loading && filteredProjects.map((project) => (
          <Card key={project.id || project.name} className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold">{project.name}</h2>
                  <p className="mt-2 flex gap-1 text-sm text-slate-500">
                    <MapPin className="h-4 w-4" />
                    {project.address}
                  </p>
                  <p className="mt-1 flex gap-1 text-sm text-slate-500">
                    <UserRound className="h-4 w-4" />
                    業主：{project.owner}
                  </p>
                  <p className="mt-1 flex gap-1 text-sm text-slate-500">
                    <UserRound className="h-4 w-4" />
                    建立者：{project.createdByName || "系統管理員"}
                    {project.memberRole ? `｜我的權限：${projectMemberRoleLabel(project.memberRole)}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    開工：{formatDate(project.startDate)}｜預計完工：{formatDate(project.endDate)}
                  </p>
                  {project.note ? (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      備註：{project.note}
                    </p>
                  ) : null}
                  <AttachmentSummary attachments={project.attachments} />
                </div>
                <Badge>{project.status}</Badge>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  缺失
                  <br />
                  <b>{project.defects}</b>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  照片
                  <br />
                  <b>{project.dailyPhotos}</b>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  請款期
                  <br />
                  <b>{project.nextClaim}</b>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  天數
                  <br />
                  <b>{countWorkDays(project.startDate)}</b>
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Button type="button" onClick={() => onSelect(project)}>
                  進入
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
                {project.canManage ? (
                  <Del
                    label={project.name}
                    className="w-full"
                    onClick={() => removeProject(project)}
                  />
                ) : (
                  <Badge>{project.canEdit ? "可共同編輯" : "僅可閱覽"}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <VersionFooter className="mt-6" />
    </Shell>
  );
}

function Shell({ children, full = false }) {
  return (
    <div className="min-h-screen bg-slate-50 p-3 text-slate-900 sm:p-4">
      <div className={full ? "mx-auto w-full max-w-5xl" : ""}>{children}</div>
    </div>
  );
}

function DashboardCalendar({ project, todos, memos: memoItems, className = "" }) {
  const [monthKey, setMonthKey] = useState(todayKey().slice(0, 7));
  const days = useMemo(() => monthCalendarDays(monthKey), [monthKey]);
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const eventsByDate = useMemo(() => {
    const map = new Map();
    const pushEvent = (date, event) => {
      if (!date) return;
      map.set(date, [...(map.get(date) || []), event]);
    };

    todos.forEach((todo) => {
      pushEvent(todo.date, {
        id: todo.id,
        type: "todo",
        title: todo.title,
        meta: todo.owner || todo.status,
      });
    });
    memoItems.forEach((memo) => {
      pushEvent(memo.date, {
        id: memo.id,
        type: "memo",
        title: memo.title,
        meta: memo.trade || memo.status,
      });
    });

    return map;
  }, [todos, memoItems]);
  const daysWithEvents = days
    .map((day) => ({ ...day, events: eventsByDate.get(day.date) || [] }))
    .filter((day) => day.currentMonth && day.events.length);

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">待辦事項與工項 Memo</h2>
            <p className="mt-1 break-words text-sm text-slate-500">
              {project.name} 的月曆檢視
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setMonthKey(moveMonth(monthKey, -1))}
            >
              上月
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setMonthKey(todayKey().slice(0, 7))}
            >
              今天
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setMonthKey(moveMonth(monthKey, 1))}
            >
              下月
            </Button>
          </div>
        </div>

        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold sm:text-2xl">{monthTitle(monthKey)}</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              待辦事項
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              工項 Memo
            </span>
          </div>
        </div>

        <div className="sm:hidden">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-500">
            {weekDays.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const events = eventsByDate.get(day.date) || [];

              return (
                <div
                  key={day.date}
                  className={`flex aspect-square min-h-10 flex-col items-center justify-center rounded-xl border p-1 ${
                    day.currentMonth ? "bg-white" : "bg-slate-50 text-slate-300"
                  } ${day.isToday ? "border-slate-900" : ""}`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      day.isToday ? "bg-slate-900 text-white" : ""
                    }`}
                  >
                    {day.day}
                  </span>
                  <div className="mt-1 flex h-2 items-center justify-center gap-0.5">
                    {events.slice(0, 3).map((event) => (
                      <span
                        key={`${event.type}-${event.id}`}
                        className={`h-1.5 w-1.5 rounded-full ${
                          event.type === "todo" ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 max-h-80 overflow-auto rounded-2xl border bg-slate-50">
            {daysWithEvents.length ? (
              <div className="divide-y">
                {daysWithEvents.map((day) => (
                  <div key={day.date} className="grid grid-cols-[3.5rem_1fr] gap-3 p-3">
                    <div className="text-center">
                      <p className="text-xs text-slate-500">{shortDateLabel(day.date)}</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{day.day}</p>
                    </div>
                    <div className="space-y-2">
                      {day.events.map((event) => (
                        <div
                          key={`${event.type}-${event.id}`}
                          className={`rounded-xl border px-3 py-2 text-xs ${
                            event.type === "todo"
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          <p className="font-semibold">{event.title}</p>
                          {event.meta ? <p className="mt-0.5 opacity-80">{event.meta}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 text-center text-sm text-slate-500">
                本月尚無待辦事項或工項 Memo。
              </div>
            )}
          </div>
        </div>

        <div className="hidden overflow-x-auto rounded-2xl border bg-white sm:block">
          <div className="grid min-w-[700px] grid-cols-7 border-b bg-slate-50">
            {weekDays.map((day) => (
              <div key={day} className="border-r px-3 py-2 text-center text-xs font-bold text-slate-500 last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          <div className="grid min-w-[700px] grid-cols-7">
            {days.map((day, index) => {
              const events = eventsByDate.get(day.date) || [];

              return (
                <div
                  key={day.date}
                  className={`min-h-28 border-r border-b p-2 md:min-h-32 ${
                    day.currentMonth ? "bg-white" : "bg-slate-50 text-slate-400"
                  } ${(index + 1) % 7 === 0 ? "border-r-0" : ""}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                        day.isToday ? "bg-slate-900 text-white" : ""
                      }`}
                    >
                      {day.day}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {events.slice(0, 3).map((event) => (
                      <div
                        key={`${event.type}-${event.id}`}
                        className={`rounded-md border px-2 py-1 text-xs ${
                          event.type === "todo"
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        <p className="truncate font-semibold">{event.title}</p>
                        {event.meta ? <p className="truncate opacity-80">{event.meta}</p> : null}
                      </div>
                    ))}
                    {events.length > 3 ? (
                      <p className="px-2 text-xs font-medium text-slate-500">+{events.length - 3} 筆</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VendorContacts({ contracts }) {
  const [openId, setOpenId] = useState("");
  const [query, setQuery] = useState("");
  const filteredContracts = contracts.filter((contract) => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return true;
    return [
      contract.vendor,
      contract.name,
      contract.trade,
      contract.contact,
      contract.phone,
      contract.email,
    ]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });

  return (
    <Card className="lg:col-span-3">
      <CardContent className="p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">廠商資訊</h2>
            <p className="mt-1 text-sm text-slate-500">由工程合約同步的聯絡資訊</p>
          </div>
          <Badge>{contracts.length} 家廠商</Badge>
        </div>
        {contracts.length ? (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border bg-slate-50 px-3 py-2">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="搜尋廠商、合約、工種、聯絡人、電話"
            />
          </div>
        ) : null}
        {contracts.length ? (
          <div className="grid gap-3">
            {filteredContracts.map((contract) => {
              const isOpen = openId === contract.id;

              return (
              <div key={contract.id} className="rounded-2xl border p-4">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? "" : contract.id)}
                  className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between"
                  aria-expanded={isOpen}
                >
                  <span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{contract.vendor}</span>
                      <Badge>{contract.status}</Badge>
                      <Badge>{contract.trade}</Badge>
                    </span>
                    <span className="mt-2 block text-sm text-slate-500">{contract.name}</span>
                    <span className="mt-1 block text-sm text-slate-600">
                      {contract.contact || "未填寫聯絡人"}｜{contract.phone || "未填寫電話"}
                    </span>
                  </span>
                  <ChevronRight
                    className={`h-5 w-5 shrink-0 text-slate-500 transition ${
                      isOpen ? "rotate-90" : ""
                    }`}
                  />
                </button>
                {isOpen ? (
                  <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
                    <p>聯絡人：{contract.contact || "未填寫"}</p>
                    <p>電話：{contract.phone || "未填寫"}</p>
                    <p>Email：{contract.email || "未填寫"}</p>
                    <p>地址：{contract.address || "未填寫"}</p>
                    {contract.note ? (
                      <p className="sm:col-span-2">備註：{contract.note}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              );
            })}
            {!filteredContracts.length ? (
              <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">
                找不到符合的廠商資訊。
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">
            尚無工程合約廠商資訊。
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectMembers({ project }) {
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("manager");
  const [jobTitle, setJobTitle] = useState("工地主任");
  const [canViewClaims, setCanViewClaims] = useState(true);
  const [canViewContracts, setCanViewContracts] = useState(true);
  const [loading, setLoading] = useState(!useLocalPreview);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const canManage = useLocalPreview || Boolean(project.canManage);

  async function loadMembers() {
    if (useLocalPreview) {
      setMembers([
        {
          userId: "preview-owner",
          name: project.createdByName || "本機預覽",
          email: "preview@local",
          role: "owner",
          jobTitle: "工地建立者",
          canView: true,
          canEdit: true,
          canViewClaims: true,
          canViewContracts: true,
        },
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await apiFetch(`/api/projects/${encodeURIComponent(project.id)}/members`);
      setMembers(data.members || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (project.id) loadMembers();
  }, [project.id]);

  async function addMember() {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("請輸入已註冊帳號 Email");
      return;
    }

    setBusy("add");
    setError("");

    if (useLocalPreview) {
      setMembers([
        ...members,
        {
          userId: `preview-member-${Date.now()}`,
          name: cleanEmail.split("@")[0],
          email: cleanEmail,
          role,
          jobTitle,
          canView: true,
          canEdit: role !== "viewer",
          canViewClaims,
          canViewContracts,
        },
      ]);
      setEmail("");
      setBusy("");
      return;
    }

    try {
      const data = await apiFetch(`/api/projects/${encodeURIComponent(project.id)}/members`, {
        method: "POST",
        body: JSON.stringify({ email: cleanEmail, role, jobTitle, canViewClaims, canViewContracts }),
      });
      setMembers(data.members || []);
      setEmail("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function updateMember(
    member,
    nextRole,
    nextJobTitle = member.jobTitle || "現場工程師",
    nextPermissions = {},
  ) {
    if (member.role === "owner") return;

    setError("");
    const previous = members;
    const nextCanViewClaims =
      nextPermissions.canViewClaims ?? member.canViewClaims ?? true;
    const nextCanViewContracts =
      nextPermissions.canViewContracts ?? member.canViewContracts ?? true;
    const nextMembers = members.map((item) =>
      item.userId === member.userId
        ? {
            ...item,
            role: nextRole,
            jobTitle: nextJobTitle,
            canView: true,
            canEdit: nextRole !== "viewer",
            canViewClaims: nextCanViewClaims,
            canViewContracts: nextCanViewContracts,
          }
        : item,
    );
    setMembers(nextMembers);

    if (useLocalPreview) return;

    try {
      const data = await apiFetch(
        `/api/projects/${encodeURIComponent(project.id)}/members/${encodeURIComponent(member.userId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            role: nextRole,
            jobTitle: nextJobTitle,
            canViewClaims: nextCanViewClaims,
            canViewContracts: nextCanViewContracts,
          }),
        },
      );
      setMembers(data.members || nextMembers);
    } catch (err) {
      setError(err.message);
      setMembers(previous);
    }
  }

  async function removeMember(member) {
    if (member.role === "owner") return;
    if (!window.confirm(`確定將「${member.email}」移出此工地？`)) return;

    const previous = members;
    setMembers(members.filter((item) => item.userId !== member.userId));
    setError("");

    if (useLocalPreview) return;

    try {
      const data = await apiFetch(
        `/api/projects/${encodeURIComponent(project.id)}/members/${encodeURIComponent(member.userId)}`,
        { method: "DELETE" },
      );
      setMembers(data.members || []);
    } catch (err) {
      setError(err.message);
      setMembers(previous);
    }
  }

  return (
    <Card className="lg:col-span-3">
      <CardContent className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">工地成員與權限設定</h2>
            <p className="mt-1 text-sm text-slate-500">
              只有工地建立者、共同管理者與被邀請成員能看到此工地。
            </p>
          </div>
          <Button type="button" variant="outline" disabled={loading} onClick={loadMembers}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            刷新成員
          </Button>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {canManage ? (
          <div className="mb-4 rounded-2xl border bg-slate-50 p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_200px]">
              <label>
                <span className="text-xs font-medium text-slate-500">邀請帳號 Email</span>
                <div className="mt-1">
                  <Input value={email} onChange={setEmail} ph="輸入已註冊帳號 Email" />
                </div>
              </label>
              <label>
                <span className="text-xs font-medium text-slate-500">工地權限</span>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="mt-1 w-full rounded-xl border bg-white px-3 py-2 outline-none"
                >
                  {projectMemberRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-xs font-medium text-slate-500">工地職稱</span>
                <select
                  value={jobTitle}
                  onChange={(event) => setJobTitle(event.target.value)}
                  className="mt-1 w-full rounded-xl border bg-white px-3 py-2 outline-none"
                >
                  {projectJobTitleOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex min-h-11 items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={canViewClaims}
                    onChange={(event) => setCanViewClaims(event.target.checked)}
                  />
                  可閱覽請款相關文件
                </label>
                <label className="flex min-h-11 items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={canViewContracts}
                    onChange={(event) => setCanViewContracts(event.target.checked)}
                  />
                  可閱覽合約相關文件
                </label>
              </div>
              <Button type="button" disabled={busy === "add"} onClick={addMember} className="w-full lg:w-auto">
                {busy === "add" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                邀請加入
              </Button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">
            讀取成員中
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {members.map((member) => (
              <div key={member.userId} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words font-bold">{member.name || member.email}</h3>
                      <Badge>{projectMemberRoleLabel(member.role)}</Badge>
                      {member.jobTitle ? <Badge>{member.jobTitle}</Badge> : null}
                      {member.canViewClaims === false ? <Badge>請款受限</Badge> : <Badge>可閱覽請款</Badge>}
                      {member.canViewContracts === false ? <Badge>合約受限</Badge> : <Badge>可閱覽合約</Badge>}
                    </div>
                    <p className="mt-1 break-words text-sm text-slate-500">{member.email}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {member.canEdit ? "可查看與編輯此工地資料" : "只能查看此工地資料"}
                    </p>
                  </div>
                  {canManage && member.role !== "owner" ? (
                    <Button
                      type="button"
                      onClick={() => removeMember(member)}
                      variant="dangerGhost"
                      size="icon"
                      className="shrink-0"
                      aria-label={`移除 ${member.email}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                {canManage && member.role !== "owner" ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <select
                      value={member.role}
                      onChange={(event) => updateMember(member, event.target.value, member.jobTitle)}
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none"
                    >
                      {projectMemberRoleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={member.jobTitle || "現場工程師"}
                      onChange={(event) => updateMember(member, member.role, event.target.value)}
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none"
                    >
                      {projectJobTitleOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <label className="flex min-h-10 items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={member.canViewClaims !== false}
                        onChange={(event) =>
                          updateMember(member, member.role, member.jobTitle, {
                            canViewClaims: event.target.checked,
                          })
                        }
                      />
                      可閱覽請款
                    </label>
                    <label className="flex min-h-10 items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={member.canViewContracts !== false}
                        onChange={(event) =>
                          updateMember(member, member.role, member.jobTitle, {
                            canViewContracts: event.target.checked,
                          })
                        }
                      />
                      可閱覽合約
                    </label>
                  </div>
                ) : null}
              </div>
            ))}
            {!members.length ? (
              <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500 md:col-span-2">
                尚無工地成員資料。
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResourceTotalColumn({ title, emptyText, items, renderValue }) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <h3 className="font-bold">{title}</h3>
      {items.length ? (
        <div className="mt-3 space-y-2">
          {items.slice(0, 8).map((item) => (
            <div key={item.name} className="flex items-start justify-between gap-3 rounded-xl bg-white p-3 text-sm">
              <div className="min-w-0">
                <p className="break-words font-medium text-slate-900">{item.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  紀錄 {item.entries} 筆｜來源：{item.sourceReports} 筆施工日報
                </p>
              </div>
              <b className="shrink-0 whitespace-nowrap text-slate-900">{renderValue(item)}</b>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}

function DailyResourceSummary({ reports = [], commonSettings }) {
  const summary = summarizeDailyReportResources(reports, commonSettings);

  return (
    <Card className="lg:col-span-3">
      <CardContent className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">日報累計統計</h2>
            <p className="mt-1 text-sm text-slate-500">
              由已儲存施工日報自動累加工種出工、材料與機具設備進場數。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">日報筆數</p>
              <p className="font-bold">{summary.reportCount}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">累計出工</p>
              <p className="font-bold">{summary.totalWorkers} 人次</p>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <ResourceTotalColumn
            title="各工種出工計數"
            emptyText="尚未有工班出工紀錄。"
            items={summary.tradeTotals}
            renderValue={(item) => `${formatResourceQuantity(item.workers)} 人次`}
          />
          <ResourceTotalColumn
            title="材料進場 / 使用累計"
            emptyText="尚未有材料紀錄。"
            items={summary.materialTotals}
            renderValue={(item) =>
              `${formatResourceQuantity(item.quantity)}${item.unit ? ` ${item.unit}` : ""}`
            }
          />
          <ResourceTotalColumn
            title="機具設備使用累計"
            emptyText="尚未有機具設備紀錄。"
            items={summary.equipmentTotals}
            renderValue={(item) =>
              `${formatResourceQuantity(item.quantity)}${item.unit ? ` ${item.unit}` : ""}`
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ClaimMetric({ title, value, desc }) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
      {desc ? <p className="mt-1 text-xs text-slate-500">{desc}</p> : null}
    </div>
  );
}

function createClaimDetail() {
  return { id: Date.now() + Math.random(), item: "", quantity: "", unit: "", unitPrice: "", amount: "", note: "" };
}

function createClaimDraft(project, contracts = []) {
  const firstContract = contracts[0];
  return {
    sourceType: firstContract ? "contract" : "temporary",
    contractId: firstContract?.id || "",
    period: "",
    month: project.nextClaim || todayKey().slice(0, 7).replace("-", "/"),
    trade: firstContract?.trade || "",
    vendor: firstContract?.vendor || "",
    contract: firstContract?.name || "",
    contractAmount: firstContract?.amount || "",
    grossAmount: "",
    retentionAmount: "",
    cleaningFee: "",
    insuranceFee: "",
    otherDeduction: "",
    status: "待送審",
    note: "",
    details: [createClaimDetail()],
    attachments: [],
  };
}

function ClaimDetailRows({ rows, onChange, onAdd, onRemove }) {
  const total = claimDetailTotal(rows);

  return (
    <div className="rounded-2xl border p-4 md:col-span-2">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold">請款明細</h3>
          <p className="mt-1 text-xs text-slate-500">可逐列填工項、數量、單價；若直接填金額，系統會以該金額為準。</p>
        </div>
        <Button type="button" variant="outline" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          新增明細列
        </Button>
      </div>
      <div className="grid gap-3">
        {rows.map((row, index) => (
          <div key={row.id} className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <b>明細 {index + 1}</b>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={rows.length === 1}
                onClick={() => onRemove(row.id)}
              >
                刪除
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <Input value={row.item} onChange={(value) => onChange(row.id, "item", value)} ph="工項 / 品名" />
              <Input type="number" value={row.quantity} onChange={(value) => onChange(row.id, "quantity", value)} ph="數量" />
              <Input value={row.unit} onChange={(value) => onChange(row.id, "unit", value)} ph="單位" />
              <Input type="number" value={row.unitPrice} onChange={(value) => onChange(row.id, "unitPrice", value)} ph="單價" />
              <Input type="number" value={row.amount} onChange={(value) => onChange(row.id, "amount", value)} ph="金額" />
              <Input value={row.note} onChange={(value) => onChange(row.id, "note", value)} ph="備註" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-slate-900 px-4 py-3 text-right text-sm font-bold text-white">
        明細合計：{twd(total)}
      </div>
    </div>
  );
}

function Dashboard({
  p,
  claims,
  memoItems,
  todoItems,
  contractItems,
  dailyReports,
  commonSettings,
}) {
  const m = p.nextClaim || "2026/05";
  const total = sum(claims, m);
  const summary = byTrade(claims, m);
  const workDays = countWorkDays(p.startDate);

  return (
    <div>
      <Header title="工地總覽" sub="此工地的合約、請款、日報、缺失與材料" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="工地狀態" value={p.status} desc="目前工程狀態" icon={Building2} />
        <Stat title="累計天數" value={`${workDays} 天`} desc="含週日與國定假日" icon={CalendarDays} />
        <Stat
          title="本月廠商請款"
          value={twd(total)}
          desc={`${m}，共 ${claims.filter((x) => x.month === m).length} 筆`}
          icon={WalletCards}
        />
        <Stat title="待改善缺失" value={p.defects} desc="此工地缺失數" icon={AlertTriangle} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-lg font-bold">本月請款彙整</h2>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">{m}</p>
              <p className="text-2xl font-bold">{twd(total)}</p>
            </div>
            <div className="mt-4 space-y-2">
              {Object.entries(summary).map(([key, value]) => (
                <div key={key} className="flex justify-between rounded-xl border p-3 text-sm">
                  <b>{key}</b>
                  <b>{twd(value)}</b>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <DashboardCalendar className="lg:col-span-2" project={p} todos={todoItems} memos={memoItems} />
        <ProjectMembers project={p} />
        <VendorContacts contracts={contractItems} />
        <DailyResourceSummary reports={dailyReports} commonSettings={commonSettings} />
      </div>
    </div>
  );
}

function Claims({ p, claims, contracts = [], onSave, onUpdate, onDelete }) {
  const claimFormRef = useRef(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(() => createClaimDraft(p, contracts));
  const [editingId, setEditingId] = useState("");
  const [openClaimId, setOpenClaimId] = useState("");
  const [sections, setSections] = useState({
    summary: true,
    vendors: true,
    records: true,
  });
  const claimSummary = useMemo(() => summarizeClaims(claims, contracts), [claims, contracts]);
  const lineTotal = claimDetailTotal(draft.details);
  const draftGrossAmount = lineTotal || numberValue(draft.grossAmount);
  const draftDeductionTotal = claimDeductionTotal(draft);
  const draftNetAmount = Math.max(draftGrossAmount - draftDeductionTotal, 0);
  const selectedContract = contracts.find((contract) => contract.id === draft.contractId);

  function setSection(key) {
    setSections((current) => ({ ...current, [key]: !current[key] }));
  }

  function resetDraft() {
    setDraft(createClaimDraft(p, contracts));
    setEditingId("");
  }

  function scrollToClaimForm() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        claimFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function startEditClaim(claim) {
    const normalized = normalizedClaim(claim, contracts);
    const sourceDetails = claim.details?.length ? claim.details : normalized.details || [];
    setDraft({
      ...createClaimDraft(p, contracts),
      ...claim,
      ...normalized,
      sourceType: normalized.temporary ? "temporary" : "contract",
      contractId: normalized.temporary ? "" : normalized.contractId || claim.contractId || "",
      grossAmount: normalized.grossAmount || claim.grossAmount || claim.amount || "",
      contractAmount: normalized.contractAmount || claim.contractAmount || "",
      retentionAmount: normalized.retentionAmount || claim.retentionAmount || "",
      cleaningFee: normalized.cleaningFee || claim.cleaningFee || "",
      insuranceFee: normalized.insuranceFee || claim.insuranceFee || "",
      otherDeduction: normalized.otherDeduction || claim.otherDeduction || "",
      details: sourceDetails.length
        ? sourceDetails.map((row, index) => ({
            id: row.id || `${claim.id || Date.now()}-${index}`,
            ...row,
          }))
        : [createClaimDetail()],
      attachments: claim.attachments || [],
    });
    setEditingId(claim.id);
    setAdding(true);
    setOpenClaimId("");
    scrollToClaimForm();
  }

  function applyContract(contractId) {
    const contract = contracts.find((item) => item.id === contractId);
    setDraft((current) => ({
      ...current,
      sourceType: "contract",
      contractId,
      vendor: contract?.vendor || current.vendor,
      trade: contract?.trade || current.trade,
      contract: contract?.name || current.contract,
      contractAmount: contract?.amount || current.contractAmount,
    }));
  }

  function updateDetail(id, key, value) {
    setDraft((current) => ({
      ...current,
      details: current.details.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    }));
  }

  function addDetail() {
    setDraft((current) => ({ ...current, details: [...current.details, createClaimDetail()] }));
  }

  function removeDetail(id) {
    setDraft((current) => ({
      ...current,
      details: current.details.length === 1 ? current.details : current.details.filter((row) => row.id !== id),
    }));
  }

  async function saveClaim() {
    const details = draft.details
      .filter((row) =>
        [row.item, row.quantity, row.unit, row.unitPrice, row.amount, row.note].some((value) =>
          String(value || "").trim(),
        ),
      )
      .map(({ id, ...row }) => ({
        ...row,
        amount: claimDetailAmount(row),
      }));
    const grossAmount = claimDetailTotal(details) || numberValue(draft.grossAmount);
    const next = {
      ...draft,
      id: editingId || Date.now(),
      period: draft.period || `第 ${claims.length + 1} 期`,
      sourceType: draft.sourceType,
      contractId: draft.sourceType === "contract" ? draft.contractId : "",
      trade: draft.trade || "未分類工程",
      vendor: draft.vendor || "未填寫廠商",
      contract: draft.contract || (draft.sourceType === "temporary" ? "臨時發包" : "未填寫合約"),
      contractAmount: numberValue(draft.contractAmount),
      grossAmount,
      retentionAmount: numberValue(draft.retentionAmount),
      cleaningFee: numberValue(draft.cleaningFee),
      insuranceFee: numberValue(draft.insuranceFee),
      otherDeduction: numberValue(draft.otherDeduction),
      amount: Math.max(grossAmount - claimDeductionTotal(draft), 0),
      netAmount: Math.max(grossAmount - claimDeductionTotal(draft), 0),
      details,
      attachments: draft.attachments || [],
      projectId: p.id,
      projectName: p.name,
    };

    if (editingId && onUpdate) {
      await onUpdate(editingId, next, {
        title: `${next.vendor} ${next.period}`,
        status: next.status,
      });
    } else {
      await onSave(next, {
        title: `${next.vendor} ${next.period}`,
        status: next.status,
      });
    }
    resetDraft();
    setAdding(false);
  }

  const exportControls = useRecordExport({
    project: p,
    title: "廠商請款資料",
    records: claims,
    buildPrintRecord: buildClaimPrintRecord,
  });

  const normalizedFilteredClaims = exportControls.filteredRecords.map((claim) =>
    normalizedClaim(claim, contracts),
  );

  return (
    <div>
      <Header
        title="廠商請款資料"
        sub={`目前工地：${p.name}，彙整合約請款、臨時發包與各項扣款累計`}
        btn="新增請款"
        onAdd={() => {
          resetDraft();
          setAdding(true);
          setOpenClaimId("");
          scrollToClaimForm();
        }}
      />

      {adding ? (
        <div ref={claimFormRef} className="scroll-mt-4">
          <Card className="mb-4">
            <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <div className="md:col-span-2 grid gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2">
              <Button
                type="button"
                variant={draft.sourceType === "contract" ? "primary" : "outline"}
                onClick={() => applyContract(draft.contractId || contracts[0]?.id || "")}
                disabled={!contracts.length}
              >
                合約請款
              </Button>
              <Button
                type="button"
                variant={draft.sourceType === "temporary" ? "primary" : "outline"}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    sourceType: "temporary",
                    contractId: "",
                    contract: current.contract || "臨時發包",
                  }))
                }
              >
                無合約 / 臨時發包
              </Button>
            </div>

            {draft.sourceType === "contract" ? (
              <label className="md:col-span-2">
                <span className="text-sm font-medium">連結工程合約</span>
                <select
                  value={draft.contractId}
                  onChange={(event) => applyContract(event.target.value)}
                  className="mt-2 w-full rounded-xl border bg-white px-3 py-2 outline-none"
                >
                  <option value="">請選擇合約</option>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.vendor}｜{contract.name}｜{twd(contract.amount)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                此模式適合未正式建合約的臨時叫工、追加發包或一次性支出；仍可填入預估發包總額以納入統計。
              </div>
            )}

            <label>
              <span className="text-sm font-medium">廠商名稱</span>
              <div className="mt-2">
                <Input value={draft.vendor} onChange={(value) => setDraft({ ...draft, vendor: value })} ph="例如：宏鑫水電" />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">工程類別</span>
              <div className="mt-2">
                <Input value={draft.trade} onChange={(value) => setDraft({ ...draft, trade: value })} ph="例如：水電工程" />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">{draft.sourceType === "temporary" ? "發包名稱" : "合約名稱"}</span>
              <div className="mt-2">
                <Input value={draft.contract} onChange={(value) => setDraft({ ...draft, contract: value })} ph="例如：水電配管工程" />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">{draft.sourceType === "temporary" ? "預估發包總額" : "合約總額"}</span>
              <div className="mt-2">
                <Input type="number" value={draft.contractAmount} onChange={(value) => setDraft({ ...draft, contractAmount: value })} ph="例如：1200000" />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">期別</span>
              <div className="mt-2">
                <Input value={draft.period} onChange={(value) => setDraft({ ...draft, period: value })} ph="例如：第 1 期" />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">請款月份</span>
              <div className="mt-2">
                <Input value={draft.month} onChange={(value) => setDraft({ ...draft, month: value })} ph="例如：2026/05" />
              </div>
            </label>

            <ClaimDetailRows rows={draft.details} onChange={updateDetail} onAdd={addDetail} onRemove={removeDetail} />

            <label>
              <span className="text-sm font-medium">請款總額</span>
              <div className="mt-2">
                <Input type="number" value={draft.grossAmount} onChange={(value) => setDraft({ ...draft, grossAmount: value })} ph="明細未填金額時可手動輸入" />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">保留款</span>
              <div className="mt-2">
                <Input type="number" value={draft.retentionAmount} onChange={(value) => setDraft({ ...draft, retentionAmount: value })} ph="例如：10000" />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">清潔費</span>
              <div className="mt-2">
                <Input type="number" value={draft.cleaningFee} onChange={(value) => setDraft({ ...draft, cleaningFee: value })} ph="例如：3000" />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">保險費</span>
              <div className="mt-2">
                <Input type="number" value={draft.insuranceFee} onChange={(value) => setDraft({ ...draft, insuranceFee: value })} ph="例如：2000" />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">其他扣款</span>
              <div className="mt-2">
                <Input type="number" value={draft.otherDeduction} onChange={(value) => setDraft({ ...draft, otherDeduction: value })} ph="例如：0" />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">狀態</span>
              <CustomSelect
                value={draft.status}
                onChange={(value) => setDraft({ ...draft, status: value })}
                options={claimStatusOptions}
                className="mt-2 space-y-2"
                otherPlaceholder="請輸入自訂狀態"
              />
            </label>
            <label className="md:col-span-2">
              <span className="text-sm font-medium">請款備註</span>
              <textarea
                value={draft.note}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                className="mt-2 min-h-24 w-full rounded-xl border px-3 py-2 outline-none"
                placeholder="可記錄估驗依據、退回原因、付款條件或臨時發包原因"
              />
            </label>
            <div className="md:col-span-2 grid gap-3 rounded-2xl bg-slate-900 p-4 text-white sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-300">請款總額</p>
                <p className="mt-1 font-bold">{twd(draftGrossAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-300">扣款合計</p>
                <p className="mt-1 font-bold">{twd(draftDeductionTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-300">本期應付</p>
                <p className="mt-1 font-bold">{twd(draftNetAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-300">合約來源</p>
                <p className="mt-1 font-bold">{selectedContract ? "已連結" : "手動/臨時"}</p>
              </div>
            </div>
            <ImageAttachments
              className="md:col-span-2"
              value={draft.attachments}
              onChange={(attachments) => setDraft({ ...draft, attachments })}
            />
            <ActionBar className="md:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetDraft();
                  setAdding(false);
                }}
              >
                取消
              </Button>
              <Button type="button" onClick={saveClaim}>
                <Save className="mr-2 h-4 w-4" />
                {editingId ? "更新請款" : "儲存請款"}
              </Button>
            </ActionBar>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4">
        <AccordionSection
          title="請款總覽"
          desc="整體合約、請款、付款與扣款累計"
          meta={twd(claimSummary.totals.grossAmount)}
          open={sections.summary}
          onToggle={() => setSection("summary")}
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ClaimMetric title="合約總額" value={twd(claimSummary.totals.contractTotal)} desc="工程合約 + 臨時發包估算" />
            <ClaimMetric title="請款總額" value={twd(claimSummary.totals.grossAmount)} desc="所有期別原始請款合計" />
            <ClaimMetric title="已請款總額" value={twd(claimSummary.totals.paidAmount)} desc="已付款 / 已結案金額" />
            <ClaimMetric title="本期應付累計" value={twd(claimSummary.totals.netAmount)} desc="請款扣除保留款與費用後" />
            <ClaimMetric title="保留款總額" value={twd(claimSummary.totals.retentionAmount)} />
            <ClaimMetric title="清潔費總額" value={twd(claimSummary.totals.cleaningFee)} />
            <ClaimMetric title="保險費總額" value={twd(claimSummary.totals.insuranceFee)} />
            <ClaimMetric title="未付應付額" value={twd(claimSummary.totals.unpaidAmount)} desc="本期應付扣除已付款" />
          </div>
        </AccordionSection>

        <AccordionSection
          title="各廠商請款狀況"
          desc="依廠商彙整合約、臨時發包、請款與未付金額"
          meta={`${claimSummary.vendors.length} 家`}
          open={sections.vendors}
          onToggle={() => setSection("vendors")}
        >
          {claimSummary.vendors.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {claimSummary.vendors.map((vendor) => (
                <div key={vendor.vendor} className="rounded-2xl border bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-bold">{vendor.vendor}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        合約 {twd(vendor.formalContractTotal)}｜臨時 {twd(vendor.temporaryContractTotal)}
                      </p>
                    </div>
                    <Badge>{vendor.claims.length} 筆請款</Badge>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <ClaimMetric title="請款" value={twd(vendor.grossAmount)} />
                    <ClaimMetric title="已付" value={twd(vendor.paidAmount)} />
                    <ClaimMetric title="未付" value={twd(vendor.unpaidAmount)} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(vendor.statuses).map(([status, count]) => (
                      <Badge key={status}>{status} {count}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">尚無廠商請款資料。</p>
          )}
        </AccordionSection>

        <AccordionSection
          title="請款紀錄"
          desc="可檢索、匯出 PDF、展開查看扣款與明細"
          meta={`${normalizedFilteredClaims.length} 筆`}
          open={sections.records}
          onToggle={() => setSection("records")}
        >
          <RecordExportToolbar controls={exportControls} placeholder="搜尋廠商、工種、合約、期別、狀態或扣款內容" />
          {normalizedFilteredClaims.length ? (
            <div className="grid gap-3">
              {normalizedFilteredClaims.map((claim) => {
                const isOpen = openClaimId === claim.id;
                return (
                  <Card key={claim.id || `${claim.vendor}-${claim.period}-${claim.month}`}>
                    <CardContent className="p-5">
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                        <button
                          type="button"
                          onClick={() => setOpenClaimId(isOpen ? "" : claim.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold">{claim.vendor}</h3>
                            <Badge>{claim.status}</Badge>
                            <Badge>{claim.temporary ? "臨時發包" : "合約請款"}</Badge>
                            <Badge>{claim.trade}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-slate-500">
                            {claim.contract}｜{claim.period}/{claim.month}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            請款 {twd(claim.grossAmount)}｜扣款 {twd(claim.deductionTotal)}｜應付 {twd(claim.netAmount)}
                          </p>
                          <AttachmentSummary attachments={claim.attachments} />
                        </button>
                        <div className="grid gap-2 text-left sm:grid-cols-3 lg:w-[420px]">
                          <ClaimMetric title="請款總額" value={twd(claim.grossAmount)} />
                          <ClaimMetric title="保留款" value={twd(claim.retentionAmount)} />
                          <ClaimMetric title="本期應付" value={twd(claim.netAmount)} />
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 sm:justify-end">
                        <Button type="button" variant="outline" onClick={() => setOpenClaimId(isOpen ? "" : claim.id)}>
                          {isOpen ? "收合" : "查看明細"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => exportControls.exportRecords([claim], { from: recordDateKey(claim), to: recordDateKey(claim) })}
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          列印本筆
                        </Button>
                        <EditButton label={`${claim.vendor} ${claim.period}`} onClick={() => startEditClaim(claim)} />
                        <Del label={`${claim.vendor} ${claim.period}`} onClick={() => onDelete(claim.id)} />
                      </div>
                      {isOpen ? (
                        <div className="mt-4 grid gap-4 border-t pt-4">
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <ClaimMetric title="合約 / 發包總額" value={twd(claim.contractAmount)} />
                            <ClaimMetric title="清潔費" value={twd(claim.cleaningFee)} />
                            <ClaimMetric title="保險費" value={twd(claim.insuranceFee)} />
                            <ClaimMetric title="其他扣款" value={twd(claim.otherDeduction)} />
                          </div>
                          <DailyReportTable
                            title="請款明細"
                            rows={(claim.details || []).map((row, index) => ({
                              index: index + 1,
                              item: row.item,
                              quantity: row.quantity,
                              unit: row.unit,
                              unitPrice: row.unitPrice ? twd(row.unitPrice) : "",
                              amount: twd(claimDetailAmount(row)),
                              note: row.note,
                            }))}
                            columns={[
                              ["index", "序"],
                              ["item", "工項"],
                              ["quantity", "數量"],
                              ["unit", "單位"],
                              ["unitPrice", "單價"],
                              ["amount", "金額"],
                              ["note", "備註"],
                            ]}
                          />
                          {claim.note ? (
                            <div className="rounded-2xl border p-4">
                              <h4 className="font-bold">請款備註</h4>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{claim.note}</p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-slate-500">
                {claims.length ? "找不到符合條件的請款資料。" : "尚無廠商請款資料，請新增第一筆請款。"}
              </CardContent>
            </Card>
          )}
        </AccordionSection>
      </div>
    </div>
  );
}

function Contracts({ p, items, onSave, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false);
  const emptyDraft = {
    name: "",
    vendor: "",
    trade: "",
    amount: "",
    status: "草稿",
    contact: "",
    phone: "",
    email: "",
    address: "",
    note: "",
    attachments: [],
  };
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState("");

  function resetDraft() {
    setDraft(emptyDraft);
    setEditingId("");
  }

  function startEditContract(contract) {
    setDraft({
      ...emptyDraft,
      ...contract,
      amount: contract.amount ?? "",
      attachments: contract.attachments || [],
    });
    setEditingId(contract.id);
    setAdding(true);
  }

  async function saveContract() {
    const next = {
      id: editingId || Date.now(),
      projectId: p.id,
      projectName: p.name,
      name: draft.name || "未命名合約",
      vendor: draft.vendor || "未填寫廠商",
      trade: draft.trade || "未分類工程",
      amount: Number(draft.amount || 0),
      status: draft.status || "草稿",
      contact: draft.contact,
      phone: draft.phone,
      email: draft.email,
      address: draft.address,
      note: draft.note,
      attachments: draft.attachments || [],
    };
    if (editingId && onUpdate) {
      await onUpdate(editingId, next, { title: next.name, status: next.status });
    } else {
      await onSave(next, { title: next.name, status: next.status });
    }
    resetDraft();
    setAdding(false);
  }

  const exportControls = useRecordExport({
    project: p,
    title: "工程合約",
    records: items,
    buildPrintRecord: buildContractPrintRecord,
  });

  return (
    <ListPage
      title="工程合約"
      sub={`目前工地：${p.name}`}
      btn="新增合約"
      onAdd={() => {
        resetDraft();
        setAdding(true);
      }}
      items={exportControls.filteredRecords}
      toolbar={<RecordExportToolbar controls={exportControls} placeholder="搜尋合約、廠商、工種、聯絡人或電話" />}
      emptyText={items.length ? "找不到符合條件的合約資料。" : "尚無工程合約資料，請新增第一份合約。"}
      render={(contract) => (
        <Card key={contract.id}>
          <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row">
            <div>
              <div className="flex flex-wrap gap-2">
                <h3 className="text-lg font-bold">{contract.name}</h3>
                <Badge>{contract.status}</Badge>
                <Badge>{contract.trade}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                廠商：{contract.vendor}｜金額：{twd(contract.amount)}
              </p>
              <p className="text-sm text-slate-500">
                聯絡人：{contract.contact || "未填寫"}｜電話：{contract.phone || "未填寫"}
              </p>
              <p className="text-sm text-slate-500">
                Email：{contract.email || "未填寫"}
              </p>
              <AttachmentSummary attachments={contract.attachments} />
            </div>
            <div className="flex flex-wrap items-start gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  exportControls.exportRecords([contract], {
                    from: recordDateKey(contract),
                    to: recordDateKey(contract),
                  })
                }
              >
                <FileDown className="mr-1 h-3.5 w-3.5" />
                列印本筆
              </Button>
              <EditButton label={contract.name} onClick={() => startEditContract(contract)} />
              <Del label={contract.name} onClick={() => onDelete(contract.id)} />
            </div>
          </CardContent>
        </Card>
      )}
    >
      {adding ? (
        <Card className="mb-4">
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <label>
              <span className="text-sm font-medium">合約名稱</span>
              <div className="mt-2">
                <Input
                  value={draft.name}
                  onChange={(value) => setDraft({ ...draft, name: value })}
                  ph="例如：水電配管工程"
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">廠商名稱</span>
              <div className="mt-2">
                <Input
                  value={draft.vendor}
                  onChange={(value) => setDraft({ ...draft, vendor: value })}
                  ph="例如：宏鑫水電"
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">工程類別</span>
              <div className="mt-2">
                <Input
                  value={draft.trade}
                  onChange={(value) => setDraft({ ...draft, trade: value })}
                  ph="例如：水電工程"
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">合約金額</span>
              <div className="mt-2">
                <Input
                  type="number"
                  value={draft.amount}
                  onChange={(value) => setDraft({ ...draft, amount: value })}
                  ph="例如：1200000"
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">狀態</span>
              <CustomSelect
                value={draft.status}
                onChange={(value) => setDraft({ ...draft, status: value })}
                options={["草稿", "待簽核", "執行中", "已結案"]}
                className="mt-2 space-y-2"
                otherPlaceholder="請輸入自訂合約狀態"
              />
            </label>
            <label>
              <span className="text-sm font-medium">聯絡人</span>
              <div className="mt-2">
                <Input
                  value={draft.contact}
                  onChange={(value) => setDraft({ ...draft, contact: value })}
                  ph="例如：張先生"
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">電話</span>
              <div className="mt-2">
                <Input
                  value={draft.phone}
                  onChange={(value) => setDraft({ ...draft, phone: value })}
                  ph="例如：04-2222-1688"
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">Email</span>
              <div className="mt-2">
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(value) => setDraft({ ...draft, email: value })}
                  ph="例如：vendor@example.com"
                />
              </div>
            </label>
            <label className="md:col-span-2">
              <span className="text-sm font-medium">地址</span>
              <div className="mt-2">
                <Input
                  value={draft.address}
                  onChange={(value) => setDraft({ ...draft, address: value })}
                  ph="例如：台中市東區..."
                />
              </div>
            </label>
            <label className="md:col-span-2">
              <span className="text-sm font-medium">備註</span>
              <textarea
                value={draft.note}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                className="mt-2 min-h-24 w-full rounded-xl border px-3 py-2 outline-none"
                placeholder="付款條件、保固、現場窗口補充"
              />
            </label>
            <ImageAttachments
              className="md:col-span-2"
              value={draft.attachments}
              onChange={(attachments) => setDraft({ ...draft, attachments })}
            />
            <ActionBar className="md:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetDraft();
                  setAdding(false);
                }}
              >
                取消
              </Button>
              <Button type="button" onClick={saveContract}>
                <Save className="mr-2 h-4 w-4" />
                {editingId ? "更新合約" : "儲存合約"}
              </Button>
            </ActionBar>
          </CardContent>
        </Card>
      ) : null}
    </ListPage>
  );
}

function Memos({ p, items, onSave, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false);
  const emptyDraft = {
    trade: "",
    title: "",
    date: todayKey(),
    note: "",
    status: "待處理",
    attachments: [],
  };
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState("");

  function resetDraft() {
    setDraft({ ...emptyDraft, date: todayKey() });
    setEditingId("");
  }

  function startEditMemo(memo) {
    setDraft({
      ...emptyDraft,
      ...memo,
      date: memo.date || todayKey(),
      attachments: memo.attachments || [],
    });
    setEditingId(memo.id);
    setAdding(true);
  }

  async function saveMemo() {
    const next = {
      id: editingId || Date.now(),
      projectId: p.id,
      projectName: p.name,
      trade: draft.trade || "未分類工項",
      title: draft.title || "未命名 Memo",
      date: draft.date || todayKey(),
      note: draft.note || "未填寫內容",
      status: draft.status,
      attachments: draft.attachments || [],
    };
    if (editingId && onUpdate) {
      await onUpdate(editingId, next, { title: next.title, status: next.status });
    } else {
      await onSave(next, { title: next.title, status: next.status });
    }
    resetDraft();
    setAdding(false);
  }

  const exportControls = useRecordExport({
    project: p,
    title: "工項 Memo 紀錄",
    records: items,
    buildPrintRecord: buildMemoPrintRecord,
  });

  return (
    <ListPage
      title="工項 Memo 紀錄"
      sub={`目前工地：${p.name}`}
      onAdd={() => {
        resetDraft();
        setAdding(true);
      }}
      items={exportControls.filteredRecords}
      toolbar={<RecordExportToolbar controls={exportControls} placeholder="搜尋工項、標題、內容或狀態" />}
      emptyText={items.length ? "找不到符合條件的 Memo。" : "尚無工項 Memo，請新增第一筆紀錄。"}
      render={(x) => (
        <Card key={x.id || x.title}>
          <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge>{x.trade}</Badge>
                <Badge>{x.status}</Badge>
              </div>
              <h3 className="mt-3 text-lg font-bold">{x.title}</h3>
              <p className="text-sm text-slate-500">日期：{x.date || "未設定"}</p>
              <p className="text-sm text-slate-500">{x.note}</p>
              <AttachmentSummary attachments={x.attachments} />
            </div>
            <div className="flex flex-wrap items-start gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => exportControls.exportRecords([x], { from: recordDateKey(x), to: recordDateKey(x) })}
              >
                <FileDown className="mr-1 h-3.5 w-3.5" />
                列印本筆
              </Button>
              <EditButton label={x.title} onClick={() => startEditMemo(x)} />
              <Del label={x.title} onClick={() => onDelete(x.id)} />
            </div>
          </CardContent>
        </Card>
      )}
    >
      {adding ? (
        <Card className="mb-4">
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <label>
              <span className="text-sm font-medium">工項</span>
              <div className="mt-2">
                <Input
                  value={draft.trade}
                  onChange={(value) => setDraft({ ...draft, trade: value })}
                  ph="例如：防水工程"
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">狀態</span>
              <CustomSelect
                value={draft.status}
                onChange={(value) => setDraft({ ...draft, status: value })}
                options={["待確認", "待處理", "追蹤中", "已完成"]}
                className="mt-2 space-y-2"
                otherPlaceholder="請輸入自訂狀態"
              />
            </label>
            <label>
              <span className="text-sm font-medium">日期</span>
              <div className="mt-2">
                <Input
                  type="date"
                  value={draft.date}
                  onChange={(value) => setDraft({ ...draft, date: value })}
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">標題</span>
              <div className="mt-2">
                <Input
                  value={draft.title}
                  onChange={(value) => setDraft({ ...draft, title: value })}
                  ph="例如：浴室門檻加強"
                />
              </div>
            </label>
            <label className="md:col-span-2">
              <span className="text-sm font-medium">內容</span>
              <textarea
                value={draft.note}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                className="mt-2 min-h-24 w-full rounded-xl border px-3 py-2 outline-none"
                placeholder="記錄待確認事項、施工提醒或業主討論結果"
              />
            </label>
            <ImageAttachments
              className="md:col-span-2"
              value={draft.attachments}
              onChange={(attachments) => setDraft({ ...draft, attachments })}
            />
            <ActionBar className="md:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetDraft();
                  setAdding(false);
                }}
              >
                取消
              </Button>
              <Button type="button" onClick={saveMemo}>
                <Save className="mr-2 h-4 w-4" />
                {editingId ? "更新 Memo" : "儲存 Memo"}
              </Button>
            </ActionBar>
          </CardContent>
        </Card>
      ) : null}
    </ListPage>
  );
}

function Checklists({ p }) {
  const { items, saveItem, updateItem, deleteItem, loading, error } = useProjectRecords(p, "checklists", checks);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    stage: "",
    items: [{ id: 1, text: "" }],
    attachments: [],
  });
  const [editingId, setEditingId] = useState("");
  const [formError, setFormError] = useState("");

  function resetDraft() {
    setDraft({ stage: "", items: [{ id: Date.now(), text: "" }], attachments: [] });
    setEditingId("");
  }

  function startEditChecklist(stage) {
    setDraft({
      stage: stage.stage || "",
      items: (stage.items || []).length
        ? stage.items.map((item, index) => ({ id: `${stage.id || Date.now()}-${index}`, text: item }))
        : [{ id: Date.now(), text: "" }],
      attachments: stage.attachments || [],
    });
    setEditingId(stage.id);
    setAdding(true);
  }

  function addDraftItem() {
    setDraft((current) => ({
      ...current,
      items: [...current.items, { id: Date.now(), text: "" }],
    }));
  }

  function updateDraftItem(id, text) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, text } : item)),
    }));
  }

  function removeDraftItem(id) {
    setDraft((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((item) => item.id !== id),
    }));
  }

  async function saveChecklist() {
    const nextItems = draft.items.map((item) => item.text.trim()).filter(Boolean);
    if (!draft.stage.trim()) {
      setFormError("請輸入階段名稱");
      return;
    }
    if (!nextItems.length) {
      setFormError("請至少新增一個檢核項目");
      return;
    }

    const next = {
      stage: draft.stage.trim(),
      items: nextItems,
      attachments: draft.attachments || [],
      projectId: p.id,
      projectName: p.name,
    };
    const existing = editingId ? items.find((item) => item.id === editingId) : null;
    const checkedItems = existing
      ? (Array.isArray(existing.checkedItems)
          ? existing.checkedItems
          : existing.items?.slice(0, existing.done || 0) || []
        ).filter((item) => nextItems.includes(item))
      : [];
    next.checkedItems = checkedItems;
    next.done = checkedItems.length;

    setFormError("");
    if (editingId) {
      await updateItem(editingId, next, {
        title: next.stage,
        status: next.done >= next.items.length ? "已完成" : "未完成",
      });
    } else {
      await saveItem(next, { title: next.stage, status: "未完成" });
    }
    resetDraft();
    setAdding(false);
  }

  async function toggleChecklistItem(stage, item, checked) {
    const checkedItems = Array.isArray(stage.checkedItems)
      ? stage.checkedItems
      : stage.items.slice(0, stage.done || 0);
    const nextCheckedItems = checked
      ? Array.from(new Set([...checkedItems, item]))
      : checkedItems.filter((value) => value !== item);
    const nextStage = {
      ...stage,
      checkedItems: nextCheckedItems,
      done: nextCheckedItems.length,
    };

    await updateItem(stage.id, nextStage, {
      title: nextStage.stage,
      status: nextStage.done >= nextStage.items.length ? "已完成" : "未完成",
    });
  }

  function removeChecklistItem(stage, item) {
    const checkedItems = Array.isArray(stage.checkedItems)
      ? stage.checkedItems
      : stage.items.slice(0, stage.done || 0);
    const nextItems = stage.items.filter((value) => value !== item);
    const nextCheckedItems = checkedItems.filter((value) => value !== item);
    const nextStage = {
      ...stage,
      items: nextItems,
      checkedItems: nextCheckedItems,
      done: Math.min(nextCheckedItems.length, nextItems.length),
    };

    del(item, () =>
      updateItem(stage.id, nextStage, {
        title: nextStage.stage,
        status: nextStage.done >= nextStage.items.length ? "已完成" : "未完成",
      }),
    );
  }

  const exportControls = useRecordExport({
    project: p,
    title: "工地各階段檢核表",
    records: items,
    buildPrintRecord: buildChecklistPrintRecord,
  });

  return (
    <div>
      <Header
        title="工地各階段檢核表"
        sub={`目前工地：${p.name}`}
        btn="新增檢核表"
        onAdd={() => {
          resetDraft();
          setAdding(true);
        }}
      />
      {error || formError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error || formError}
        </div>
      ) : null}
      {loading ? (
        <div className="mb-4 rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">
          讀取檢核表中
        </div>
      ) : null}
      {adding ? (
        <Card className="mb-4">
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className="text-sm font-medium">階段名稱</span>
              <div className="mt-2">
                <Input
                  value={draft.stage}
                  onChange={(value) => setDraft({ ...draft, stage: value })}
                  ph="例如：屋頂防水驗收"
                />
              </div>
            </label>
            <label className="md:col-span-2">
              <span className="text-sm font-medium">檢核項目</span>
              <div className="mt-2 grid gap-2">
                {draft.items.map((item, index) => (
                  <div key={item.id} className="grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                    <span className="text-sm font-medium text-slate-500">項目 {index + 1}</span>
                    <Input
                      value={item.text}
                      onChange={(value) => updateDraftItem(item.id, value)}
                      ph="例如：防水試水完成"
                    />
                    <Button
                      type="button"
                      variant="dangerGhost"
                      size="icon"
                      onClick={() => removeDraftItem(item.id)}
                      disabled={draft.items.length === 1}
                      aria-label={`移除檢核項目 ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={addDraftItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  新增檢核項目
                </Button>
              </div>
            </label>
            <ImageAttachments
              className="md:col-span-2"
              value={draft.attachments}
              onChange={(attachments) => setDraft({ ...draft, attachments })}
            />
            <ActionBar className="md:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetDraft();
                  setAdding(false);
                }}
              >
                取消
              </Button>
              <Button type="button" onClick={saveChecklist}>
                <Save className="mr-2 h-4 w-4" />
                {editingId ? "更新檢核表" : "儲存檢核表"}
              </Button>
            </ActionBar>
          </CardContent>
        </Card>
      ) : null}
      <RecordExportToolbar controls={exportControls} placeholder="搜尋階段名稱、檢核項目或完成狀態" />
      <div className="grid gap-4 md:grid-cols-2">
        {exportControls.filteredRecords.map((s) => {
          const pct = s.items.length ? Math.round((s.done / s.items.length) * 100) : 0;
          const checkedItems = Array.isArray(s.checkedItems)
            ? s.checkedItems
            : s.items.slice(0, s.done || 0);

          return (
            <Card key={s.id || s.stage}>
              <CardContent className="p-5">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{s.stage}</h3>
                    <p className="text-sm text-slate-500">
                      已完成 {s.done}/{s.items.length}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => exportControls.exportRecords([s])}
                      aria-label={`列印 ${s.stage}`}
                    >
                      <FileDown className="h-4 w-4" />
                    </Button>
                    <EditButton icon label={s.stage} onClick={() => startEditChecklist(s)} />
                    <Del icon label={s.stage} onClick={() => deleteItem(s.id)} />
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-slate-900" style={{ width: `${pct}%` }} />
                </div>
                <AttachmentSummary attachments={s.attachments} />
                <div className="mt-4 space-y-2">
                  {s.items.map((item, i) => (
                    <div key={item} className="flex justify-between rounded-xl border p-3 text-sm">
                      <label>
                        <input
                          type="checkbox"
                          checked={checkedItems.includes(item)}
                          onChange={(event) => toggleChecklistItem(s, item, event.target.checked)}
                        />{" "}
                        {item}
                      </label>
                      <Button
                        type="button"
                        onClick={() => removeChecklistItem(s, item)}
                        variant="dangerGhost"
                        size="icon"
                        aria-label={`刪除 ${item}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!loading && !exportControls.filteredRecords.length ? (
          <Card className="md:col-span-2">
            <CardContent className="p-8 text-center text-slate-500">
              {items.length ? "找不到符合條件的檢核表。" : "尚無階段檢核表，請新增第一份檢核表。"}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

const commonSettingSections = [
  {
    type: "crews",
    title: "常用工班",
    singular: "工班",
    description: "統一工班名稱與統計分類，施工日報只顯示啟用項目。",
  },
  {
    type: "materials",
    title: "常用材料",
    singular: "材料",
    description: "管理常用材料及預設單位，供施工日報與後續庫存功能共用。",
  },
  {
    type: "equipment",
    title: "常用機具設備",
    singular: "機具設備",
    description: "管理設備名稱、規格與預設計量單位。",
  },
];

function commonSettingDraft(type, item = {}) {
  return {
    id: item.id || "",
    name: item.name || "",
    unit: item.unit || "",
    specification: item.specification || "",
    statisticsCategory: item.statisticsCategory || item.name || "",
    aliases: (item.aliases || []).join("、"),
    isActive: item.isActive ?? true,
    type,
  };
}

function CommonSettings({ p, settings, onSave, dailyReports = [], loading, error }) {
  const [activeType, setActiveType] = useState("crews");
  const [draft, setDraft] = useState(() => commonSettingDraft("crews"));
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const section = commonSettingSections.find((item) => item.type === activeType);
  const items = [...settings[activeType]].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "zh-Hant"),
  );

  function resetDraft(type = activeType) {
    setDraft(commonSettingDraft(type));
    setFormError("");
  }

  async function persistCollection(nextItems) {
    setBusy(true);
    setFormError("");
    try {
      await onSave({
        ...settings,
        [activeType]: nextItems.map((item, index) => ({
          ...item,
          sortOrder: index + 1,
        })),
      });
    } catch (saveError) {
      setFormError(saveError.message || "常用設定儲存失敗");
      throw saveError;
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    const name = draft.name.trim();
    if (!name) {
      setFormError(`請輸入${section.singular}名稱`);
      return;
    }
    const duplicate = items.find(
      (item) => item.name.trim().toLowerCase() === name.toLowerCase() && item.id !== draft.id,
    );
    if (duplicate) {
      setFormError(`已有同名${section.singular}`);
      return;
    }

    const nextItem = normalizeCommonSettingItem(
      {
        ...draft,
        id: draft.id || `${activeType}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        statisticsCategory: draft.statisticsCategory.trim() || name,
        aliases: draft.aliases,
        sortOrder: draft.id
          ? items.find((item) => item.id === draft.id)?.sortOrder || items.length + 1
          : items.length + 1,
      },
      items.length,
      activeType,
    );
    const nextItems = draft.id
      ? items.map((item) => (item.id === draft.id ? nextItem : item))
      : [...items, nextItem];
    await persistCollection(nextItems);
    resetDraft();
  }

  async function toggleItem(item) {
    await persistCollection(
      items.map((candidate) =>
        candidate.id === item.id ? { ...candidate, isActive: !candidate.isActive } : candidate,
      ),
    );
  }

  async function permanentlyDeleteItem(item) {
    const usageCount = countCommonSettingUsage(dailyReports, activeType, item);
    const usageMessage = usageCount
      ? `目前偵測到 ${usageCount} 筆施工日報紀錄使用此選項。`
      : "目前未偵測到施工日報使用此選項。";
    const confirmed = window.confirm(
      `確定永久刪除「${item.name}」？\n\n${usageMessage}\n永久刪除無法復原，可能導致已使用此選項的表單部分數據遺失或無法正確統計。若只是不想繼續使用，建議改用「停用」。`,
    );
    if (!confirmed) return;

    setBusy(true);
    setFormError("");
    try {
      await onSave(removeCommonSettingItem(settings, activeType, item.id));
      if (draft.id === item.id) resetDraft();
    } catch (deleteError) {
      setFormError(deleteError.message || "永久刪除失敗");
    } finally {
      setBusy(false);
    }
  }

  async function moveItem(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const nextItems = [...items];
    [nextItems[index], nextItems[target]] = [nextItems[target], nextItems[index]];
    await persistCollection(nextItems);
  }

  return (
    <div>
      <Header title="常用設定" sub={`目前工地：${p.name}｜統一施工日報選項與統計名稱`} />
      {error || formError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error || formError}
        </div>
      ) : null}
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {commonSettingSections.map((item) => (
          <Button
            key={item.type}
            type="button"
            variant={activeType === item.type ? "primary" : "outline"}
            onClick={() => {
              setActiveType(item.type);
              resetDraft(item.type);
            }}
          >
            {item.title}
          </Button>
        ))}
      </div>
      <Card className="mb-4">
        <CardContent className="p-5">
          <h2 className="text-lg font-bold">{draft.id ? `編輯${section.singular}` : `新增${section.singular}`}</h2>
          <p className="mt-1 text-sm text-slate-500">{section.description}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label>
              <span className="text-sm font-medium">{section.singular}名稱</span>
              <div className="mt-2">
                <Input
                  value={draft.name}
                  onChange={(name) =>
                    setDraft((current) => ({
                      ...current,
                      name,
                      statisticsCategory:
                        current.statisticsCategory === current.name
                          ? name
                          : current.statisticsCategory,
                    }))
                  }
                  ph={`例如：${activeType === "crews" ? "泥作工班" : activeType === "materials" ? "水泥" : "挖土機"}`}
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">統計分類</span>
              <div className="mt-2">
                <Input
                  value={draft.statisticsCategory}
                  onChange={(statisticsCategory) => setDraft({ ...draft, statisticsCategory })}
                  ph="Dashboard 統一顯示名稱"
                />
              </div>
            </label>
            {activeType !== "crews" ? (
              <label>
                <span className="text-sm font-medium">預設單位</span>
                <div className="mt-2">
                  <Input
                    value={draft.unit}
                    onChange={(unit) => setDraft({ ...draft, unit })}
                    ph={activeType === "materials" ? "例如：包、公斤、立方米" : "例如：台次、台班"}
                  />
                </div>
              </label>
            ) : null}
            {activeType === "equipment" ? (
              <label>
                <span className="text-sm font-medium">規格</span>
                <div className="mt-2">
                  <Input
                    value={draft.specification}
                    onChange={(specification) => setDraft({ ...draft, specification })}
                    ph="例如：120 型"
                  />
                </div>
              </label>
            ) : null}
            <label className="md:col-span-2">
              <span className="text-sm font-medium">同義詞 / AI 映射名稱</span>
              <div className="mt-2">
                <Input
                  value={draft.aliases}
                  onChange={(aliases) => setDraft({ ...draft, aliases })}
                  ph="以逗號或頓號分隔，例如：泥作、泥作工、泥作班"
                />
              </div>
            </label>
            <ActionBar className="md:col-span-2">
              {draft.id ? (
                <Button type="button" variant="outline" onClick={() => resetDraft()}>
                  取消編輯
                </Button>
              ) : null}
              <Button type="button" onClick={saveDraft} disabled={busy || loading}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {draft.id ? "更新" : "新增"}
              </Button>
            </ActionBar>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {items.map((item, index) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{item.name}</h3>
                    <Badge>{item.isActive ? "啟用中" : "已停用"}</Badge>
                    <Badge>統計：{item.statisticsCategory || item.name}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {item.unit ? `單位：${item.unit}｜` : ""}
                    {item.specification ? `規格：${item.specification}｜` : ""}
                    同義詞：{item.aliases.length ? item.aliases.join("、") : "尚未設定"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={index === 0 || busy}
                    onClick={() => moveItem(index, -1)}
                    aria-label={`上移 ${item.name}`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={index === items.length - 1 || busy}
                    onClick={() => moveItem(index, 1)}
                    aria-label={`下移 ${item.name}`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDraft(commonSettingDraft(activeType, item))}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    編輯
                  </Button>
                  <Button
                    type="button"
                    variant={item.isActive ? "danger" : "subtle"}
                    size="sm"
                    disabled={busy}
                    onClick={() => toggleItem(item)}
                  >
                    {item.isActive ? "停用" : "重新啟用"}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={busy}
                    onClick={() => permanentlyDeleteItem(item)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    永久刪除
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Daily({ p, records = {}, commonSettings, onQuickAddSetting }) {
  const empty = {
    work: {
      trade: "",
      workers: "",
      description: "",
      note: "",
      commonSettingId: "",
      statisticsCategory: "",
    },
    mat: {
      name: "",
      spec: "",
      quantity: "",
      unit: "",
      note: "",
      commonSettingId: "",
      statisticsCategory: "",
    },
    eq: {
      name: "",
      specification: "",
      quantity: "",
      unit: "",
      note: "",
      commonSettingId: "",
      statisticsCategory: "",
    },
  };
  const crewOptions = activeCommonSettingItems(commonSettings, "crews");
  const materialOptions = activeCommonSettingItems(commonSettings, "materials");
  const equipmentOptions = activeCommonSettingItems(commonSettings, "equipment");
  const paperInputId = useMemo(
    () => `daily-ai-source-${Math.random().toString(36).slice(2)}`,
    [],
  );
  const [work, setWork] = useState([{ id: 1, ...empty.work }]);
  const [mat, setMat] = useState([{ id: 1, ...empty.mat }]);
  const [eq, setEq] = useState([{ id: 1, ...empty.eq }]);
  const [reportDate, setReportDate] = useState("");
  const [dayWeather, setDayWeather] = useState("");
  const [weatherNote, setWeatherNote] = useState("");
  const [dailyNote, setDailyNote] = useState("");
  const [paperReport, setPaperReport] = useState(null);
  const [sitePhotos, setSitePhotos] = useState([]);
  const [aiStatus, setAiStatus] = useState("idle");
  const [aiMessage, setAiMessage] = useState("");
  const [aiSummary, setAiSummary] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [dateFromQuery, setDateFromQuery] = useState("");
  const [dateToQuery, setDateToQuery] = useState("");
  const [keywordQuery, setKeywordQuery] = useState("");
  const [openReportId, setOpenReportId] = useState("");
  const [exportIncludePhotos, setExportIncludePhotos] = useState(true);
  const [exportError, setExportError] = useState("");
  const {
    items: savedReports = [],
    saveItem: saveDailyRecord = async () => null,
    updateItem: updateDailyRecord = async () => null,
    deleteItem: deleteDailyRecord = () => {},
    loading: dailyLoading = false,
    error: dailyError = "",
  } = records;

  const upd = (set, id, key, value) =>
    set((items) => items.map((x) => (x.id === id ? { ...x, [key]: value } : x)));
  const add = (set, obj) => set((items) => [...items, { id: Date.now(), ...obj }]);
  const addAfter = (set, id, obj) =>
    set((items) => {
      const index = items.findIndex((item) => item.id === id);
      const next = [...items];
      next.splice(index < 0 ? next.length : index + 1, 0, {
        id: Date.now() + Math.floor(Math.random() * 1000),
        ...obj,
      });
      return next;
    });
  const rem = (set, id) => set((items) => (items.length === 1 ? items : items.filter((x) => x.id !== id)));

  function resetDaily() {
    setEditingId("");
    setReportDate("");
    setDayWeather("");
    setWeatherNote("");
    setDailyNote("");
    setPaperReport(null);
    setSitePhotos([]);
    setAiStatus("idle");
    setAiMessage("");
    setAiSummary(null);
    setWork([{ id: Date.now(), ...empty.work }]);
    setMat([{ id: Date.now() + 1, ...empty.mat }]);
    setEq([{ id: Date.now() + 2, ...empty.eq }]);
  }

  function openDailyForm() {
    resetDaily();
    setAdding(true);
    setOpenReportId("");
  }

  function startEditDaily(report) {
    setEditingId(report.id);
    setReportDate(report.date && report.date !== "未填日期" ? report.date : "");
    setDayWeather(report.weather && report.weather !== "未選擇" ? report.weather : "");
    setWeatherNote(report.weatherNote || "");
    setDailyNote(report.dailyNote || report.note || "");
    setPaperReport(report.sourceAttachment || null);
    setSitePhotos(report.attachments || []);
    setAiStatus("idle");
    setAiMessage("");
    setAiSummary(report.aiSummary || null);
    setWork(withRowIds(report.work || [], empty.work));
    setMat(withRowIds(report.materials || [], empty.mat));
    setEq(withRowIds(report.equipment || [], empty.eq));
    setAdding(true);
    setOpenReportId("");
  }

  function selectPaperReport(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAiStatus("error");
      setAiMessage("目前紙本日報 AI 判讀先支援圖片格式，請上傳 JPG、PNG 或手機拍照圖片。");
      return;
    }

    if (file.size > DAILY_AI_SOURCE_MAX_BYTES) {
      setAiStatus("error");
      setAiMessage("紙本日報圖片請先壓縮到 3MB 以下，再進行 AI 判讀與保存。");
      return;
    }

    setPaperReport(toImageAttachments([file], { kind: "daily-source", keepFile: true })[0]);
    setAiStatus("idle");
    setAiMessage("");
    setAiSummary(null);
  }

  function applyAiReport(report) {
    if (report.date) setReportDate(report.date);
    if (report.weather) setDayWeather(report.weather);
    setWeatherNote(report.weatherNote || "");
    setWork(withRowIds(report.work, empty.work));
    setMat(withRowIds(report.materials, empty.mat));
    setEq(withRowIds(report.equipment, empty.eq));
    setAiSummary(report);
    setAiStatus("applied");
    setAiMessage("AI 判讀已填入下方表單，請確認每一格內容後再儲存。");
  }

  async function analyzePaperReport() {
    if (!paperReport?.file) {
      setAiStatus("error");
      setAiMessage("請先上傳紙本日報圖片。");
      return;
    }

    setAiStatus("reading");
    setAiMessage("AI 正在判讀紙本日報，完成後會把資料填入下方表格。");

    try {
      const dataUrl = await fileToDataUrl(paperReport.file);
      const data = await apiFetch("/api/ai/daily-report", {
        method: "POST",
        body: JSON.stringify({
          projectName: p.name,
          image: {
            name: paperReport.name,
            type: paperReport.file.type,
            dataUrl,
          },
        }),
      });
      applyAiReport(data.report || {});
    } catch (error) {
      setAiStatus("error");
      setAiMessage(error.message || "AI 判讀失敗，請稍後再試。");
    }
  }

  async function saveDaily() {
    const totalWorkers = work.reduce((total, row) => total + Number(row.workers || 0), 0);
    const next = {
      id: editingId || Date.now(),
      date: reportDate || "未填日期",
      weather: dayWeather || "未選擇",
      weatherNote,
      dailyNote,
      workers: totalWorkers,
      workCount: work.length,
      materialCount: mat.length,
      equipmentCount: eq.length,
      work: work.map(({ id, ...row }) => row),
      materials: mat.map(({ id, ...row }) => row),
      equipment: eq.map(({ id, ...row }) => row),
      sourceAttachment: paperReport ? stripAttachmentFile(paperReport) : null,
      attachments: serializeAttachments(sitePhotos),
      aiSummary,
      projectId: p.id,
      projectName: p.name,
    };

    if (editingId) {
      await updateDailyRecord(editingId, next, {
        title: `${next.date} 施工日報`,
        status: next.weather,
      });
    } else {
      await saveDailyRecord(next, {
        title: `${next.date} 施工日報`,
        status: next.weather,
      });
    }
    resetDaily();
    setAdding(false);
  }

  const filteredReports = savedReports.filter((report) => {
    const dateFrom = dateFromQuery.trim();
    const dateTo = dateToQuery.trim();
    const keyword = keywordQuery.trim().toLowerCase();
    const matchesDate = !dateFrom && !dateTo ? true : isDateInRange(report.date, dateFrom, dateTo);
    const searchableText = [
      report.date,
      report.weather,
      report.weatherNote,
      report.dailyNote,
      report.note,
      ...(report.work || []).flatMap((row) => [
        row.trade,
        row.description,
        row.note,
      ]),
      ...(report.materials || []).flatMap((row) => [
        row.name,
        row.spec,
        row.quantity,
        row.unit,
        row.note,
      ]),
      ...(report.equipment || []).flatMap((row) => [
        row.name,
        row.quantity,
        row.note,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesKeyword = !keyword || searchableText.includes(keyword);
    return matchesDate && matchesKeyword;
  });

  function handleDailyPdfExport(reports = filteredReports, range = {}) {
    const exportReports = [...reports].sort((a, b) =>
      compareDateKey(a.date).localeCompare(compareDateKey(b.date)),
    );

    if (!exportReports.length) {
      setExportError("目前檢索條件內沒有可匯出的施工日報。");
      return;
    }

    const opened = openDailyReportsPdfExport({
      project: p,
      reports: exportReports,
      from: range.from ?? dateFromQuery,
      to: range.to ?? dateToQuery,
      includePhotos: exportIncludePhotos,
    });

    if (!opened) {
      setExportError("瀏覽器封鎖了匯出視窗，請允許彈出視窗後再試一次。");
      return;
    }

    setExportError("");
  }

  return (
    <div>
      <Header
        title="施工日報紀錄"
        sub={`目前工地：${p.name}`}
        btn="新增日報"
        onAdd={openDailyForm}
      />
      {dailyError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {dailyError}
        </div>
      ) : null}
      {adding ? (
        <Card className="mb-4">
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <div className="md:col-span-2 rounded-2xl border bg-white p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>AI 匯入</Badge>
                  <p className="text-sm font-bold text-slate-900">紙本日報表判讀</p>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  上傳紙本日報照片後，AI 會先將日期、天氣、工班、材料與機具填入下方表格；儲存前仍可自行修正每個欄位。
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id={paperInputId}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={selectPaperReport}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById(paperInputId)?.click()}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  上傳紙本日報
                </Button>
                <Button
                  type="button"
                  disabled={!paperReport || aiStatus === "reading"}
                  onClick={analyzePaperReport}
                >
                  {aiStatus === "reading" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckSquare className="mr-2 h-4 w-4" />
                  )}
                  AI 判讀填入
                </Button>
              </div>
            </div>
            {paperReport ? (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <img
                  src={paperReport.url}
                  alt={paperReport.name}
                  className="h-16 w-16 rounded-lg border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{paperReport.name}</p>
                  <p className="text-xs text-slate-500">{Math.ceil(paperReport.size / 1024)} KB</p>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setPaperReport(null);
                    setAiStatus("idle");
                    setAiMessage("");
                    setAiSummary(null);
                  }}
                  variant="dangerGhost"
                  size="icon"
                  className="shrink-0"
                  aria-label={`移除 ${paperReport.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
            {aiMessage ? (
              <div
                className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
                  aiStatus === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {aiMessage}
              </div>
            ) : null}
            {Array.isArray(aiSummary?.notes) && aiSummary.notes.length ? (
              <div className="mt-3 rounded-xl border bg-slate-50 p-3 text-sm text-slate-600">
                <p className="font-medium text-slate-900">AI 備註</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {aiSummary.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <Input type="date" value={reportDate} onChange={setReportDate} />
          <Input value={p.name} ro />
          <CustomSelect
            value={dayWeather}
            onChange={setDayWeather}
            options={weather}
            placeholder="請選擇天氣"
            className="space-y-2"
            otherPlaceholder="請輸入自訂天氣"
          />
          <Input value={weatherNote} onChange={setWeatherNote} ph="天氣備註" />
          <Rows
            title="施工工班 / 人數 / 內容"
            list={work}
            add={() => add(setWork, empty.work)}
            insertAfter={(id) => addAfter(setWork, id, empty.work)}
            del={(id, i) => del(`工班紀錄 ${i + 1}`, () => rem(setWork, id))}
            render={(x) => (
              <>
                <CommonSettingSelect
                  value={x.trade}
                  items={crewOptions}
                  onChange={(value, item) =>
                    setWork((items) =>
                      items.map((row) =>
                        row.id === x.id
                          ? {
                              ...row,
                              trade: value,
                              commonSettingId: item?.id || "",
                              statisticsCategory: item?.statisticsCategory || value,
                            }
                          : row,
                      ),
                    )
                  }
                  onQuickAdd={(name) => onQuickAddSetting("crews", name)}
                  placeholder="請選擇工班"
                  quickAddLabel="快速新增常用工班"
                />
                <Input
                  type="number"
                  value={x.workers}
                  onChange={(value) => upd(setWork, x.id, "workers", value)}
                  ph="人數"
                />
                <Input
                  value={x.description}
                  onChange={(value) => upd(setWork, x.id, "description", value)}
                  ph="今日施工項目"
                />
                <Input value={x.note} onChange={(value) => upd(setWork, x.id, "note", value)} ph="備註" />
              </>
            )}
          />
          <Rows
            title="材料使用 / 進場"
            list={mat}
            add={() => add(setMat, empty.mat)}
            insertAfter={(id) => addAfter(setMat, id, empty.mat)}
            del={(id, i) => del(`材料紀錄 ${i + 1}`, () => rem(setMat, id))}
            render={(x) => (
              <>
                <CommonSettingSelect
                  value={x.name}
                  items={materialOptions}
                  onChange={(value, item) =>
                    setMat((items) =>
                      items.map((row) =>
                        row.id === x.id
                          ? {
                              ...row,
                              name: value,
                              unit: row.unit || item?.unit || "",
                              commonSettingId: item?.id || "",
                              statisticsCategory: item?.statisticsCategory || value,
                            }
                          : row,
                      ),
                    )
                  }
                  onQuickAdd={(name) => onQuickAddSetting("materials", name)}
                  placeholder="請選擇材料"
                  quickAddLabel="快速新增常用材料"
                />
                <Input value={x.spec} onChange={(value) => upd(setMat, x.id, "spec", value)} ph="規格" />
                <Input
                  type="number"
                  value={x.quantity}
                  onChange={(value) => upd(setMat, x.id, "quantity", value)}
                  ph="數量"
                />
                <Input value={x.unit} onChange={(value) => upd(setMat, x.id, "unit", value)} ph="單位" />
                <Input value={x.note} onChange={(value) => upd(setMat, x.id, "note", value)} ph="備註" />
              </>
            )}
          />
          <Rows
            title="機具使用"
            list={eq}
            add={() => add(setEq, empty.eq)}
            insertAfter={(id) => addAfter(setEq, id, empty.eq)}
            del={(id, i) => del(`機具紀錄 ${i + 1}`, () => rem(setEq, id))}
            render={(x) => (
              <>
                <CommonSettingSelect
                  value={x.name}
                  items={equipmentOptions}
                  onChange={(value, item) =>
                    setEq((items) =>
                      items.map((row) =>
                        row.id === x.id
                          ? {
                              ...row,
                              name: value,
                              specification: row.specification || item?.specification || "",
                              unit: row.unit || item?.unit || "台次",
                              commonSettingId: item?.id || "",
                              statisticsCategory: item?.statisticsCategory || value,
                            }
                          : row,
                      ),
                    )
                  }
                  onQuickAdd={(name) => onQuickAddSetting("equipment", name)}
                  placeholder="請選擇機具"
                  quickAddLabel="快速新增常用機具設備"
                />
                <Input
                  value={x.specification}
                  onChange={(value) => upd(setEq, x.id, "specification", value)}
                  ph="規格"
                />
                <Input
                  type="number"
                  value={x.quantity}
                  onChange={(value) => upd(setEq, x.id, "quantity", value)}
                  ph="數量"
                />
                <Input value={x.unit} onChange={(value) => upd(setEq, x.id, "unit", value)} ph="單位" />
                <Input value={x.note} onChange={(value) => upd(setEq, x.id, "note", value)} ph="備註" />
              </>
            )}
          />
          <ImageAttachments
            className="md:col-span-2"
            title="現場施工照"
            description="附掛在本日報內，之後查閱指定日期時會一起顯示。暫時限制最多 10 張。"
            buttonLabel="上傳施工照"
            maxFiles={10}
            meta={{ kind: "site-photo" }}
            value={sitePhotos}
            onChange={setSitePhotos}
          />
          <label className="md:col-span-2">
            <span className="text-sm font-medium">其他備註 / 記事</span>
            <textarea
              value={dailyNote}
              onChange={(event) => setDailyNote(event.target.value)}
              className="mt-2 min-h-28 w-full rounded-xl border px-3 py-2 outline-none"
              placeholder="可記錄今日特殊狀況、協調事項、業主指示、停工原因或其他補充記事"
            />
          </label>
          <ActionBar className="md:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetDaily();
                setAdding(false);
              }}
            >
              取消
            </Button>
            <Button type="button" onClick={saveDaily}>
              <Save className="mr-2 h-4 w-4" />
              {editingId ? "更新日報" : "確認並儲存日報"}
            </Button>
          </ActionBar>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold">已儲存日報</h2>
              <p className="mt-1 text-sm text-slate-500">
                可依日期區間、工班、施工項目與備註記事搜尋，並直接匯出符合條件的 A4 PDF。
              </p>
            </div>
            <div className="grid gap-2 xl:grid-cols-[150px_150px_minmax(220px,1fr)_auto_auto] xl:items-end">
              <label>
                <span className="text-xs font-medium text-slate-500">開始日期</span>
                <div className="mt-1">
                  <Input type="date" value={dateFromQuery} onChange={setDateFromQuery} />
                </div>
              </label>
              <label>
                <span className="text-xs font-medium text-slate-500">結束日期</span>
                <div className="mt-1">
                  <Input type="date" value={dateToQuery} onChange={setDateToQuery} />
                </div>
              </label>
              <label>
                <span className="text-xs font-medium text-slate-500">快速檢索</span>
                <div className="mt-1">
                  <Input
                    value={keywordQuery}
                    onChange={setKeywordQuery}
                    ph="搜尋工班、施工項目、備註或記事"
                  />
                </div>
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={exportIncludePhotos}
                  onChange={(event) => setExportIncludePhotos(event.target.checked)}
                />
                包含施工照
              </label>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-none xl:grid-flow-col">
                <Button type="button" onClick={() => handleDailyPdfExport()}>
                  <FileDown className="mr-2 h-4 w-4" />
                  匯出 PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDateFromQuery("");
                    setDateToQuery("");
                    setKeywordQuery("");
                    setExportError("");
                  }}
                >
                  清除
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p>目前符合：{filteredReports.length} 筆</p>
              <p>匯出會依日期排序，並使用 A4 版面重新排版。</p>
            </div>
            {exportError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {exportError}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
      {dailyLoading ? (
        <div className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">
          讀取施工日報中
        </div>
      ) : null}
      {filteredReports.length ? (
        <div className="mt-4 grid gap-3">
          {filteredReports.map((report) => {
            const isOpen = openReportId === report.id;
            return (
            <Card key={report.id}>
              <CardContent className="p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => setOpenReportId(isOpen ? "" : report.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{report.date} 施工日報</h3>
                      <Badge>{isOpen ? "已展開" : "點擊查看"}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      天氣：{report.weather}｜工班 {report.workCount} 筆｜總人數 {report.workers}
                    </p>
                    <p className="text-sm text-slate-500">
                      材料 {report.materialCount} 筆｜機具 {report.equipmentCount} 筆
                    </p>
                    {report.sourceAttachment ? (
                      <div className="mt-2">
                        <Badge>已附紙本日報來源</Badge>
                      </div>
                    ) : null}
                    {report.dailyNote || report.note ? (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                        備註記事：{report.dailyNote || report.note}
                      </p>
                    ) : null}
                    <AttachmentSummary attachments={report.attachments} />
                  </button>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpenReportId(isOpen ? "" : report.id)}
                    >
                      {isOpen ? "收合" : "查看詳情"}
                    </Button>
                    {isOpen ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          handleDailyPdfExport([report], {
                            from: compareDateKey(report.date),
                            to: compareDateKey(report.date),
                          })
                        }
                      >
                        <FileDown className="mr-2 h-4 w-4" />
                        列印本張
                      </Button>
                    ) : null}
                    <EditButton icon label={`${report.date} 施工日報`} onClick={() => startEditDaily(report)} />
                    <Del icon label={`${report.date} 施工日報`} onClick={() => deleteDailyRecord(report.id)} />
                  </div>
                </div>
                {isOpen ? <DailyReportDetails report={report} /> : null}
              </CardContent>
            </Card>
            );
          })}
        </div>
      ) : !dailyLoading ? (
        <div className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">
          {savedReports.length ? "找不到符合條件的施工日報。" : "尚無已儲存施工日報。"}
        </div>
      ) : null}
    </div>
  );
}

function DailyReportDetails({ report }) {
  return (
    <div className="mt-4 grid gap-4 border-t pt-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">日期</p>
          <p className="mt-1 font-bold">{report.date}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">天氣</p>
          <p className="mt-1 font-bold">{report.weather}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">總人數</p>
          <p className="mt-1 font-bold">{report.workers || 0}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">天氣備註</p>
          <p className="mt-1 break-words font-bold">{report.weatherNote || "未填寫"}</p>
        </div>
      </div>
      <DailyReportTable
        title="施工工班"
        rows={report.work || []}
        columns={[
          ["trade", "工班"],
          ["workers", "人數"],
          ["description", "施工項目"],
          ["note", "備註"],
        ]}
      />
      <DailyReportTable
        title="材料使用 / 進場"
        rows={report.materials || []}
        columns={[
          ["name", "材料"],
          ["spec", "規格"],
          ["quantity", "數量"],
          ["unit", "單位"],
          ["note", "備註"],
        ]}
      />
      <DailyReportTable
        title="機具使用"
        rows={report.equipment || []}
        columns={[
          ["name", "機具"],
          ["specification", "規格"],
          ["quantity", "數量"],
          ["unit", "單位"],
          ["note", "備註"],
        ]}
      />
      <div className="rounded-2xl border p-4">
        <h4 className="font-bold">其他備註 / 記事</h4>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
          {report.dailyNote || report.note || "未填寫"}
        </p>
      </div>
      {report.sourceAttachment ? (
        <div className="rounded-2xl border p-4">
          <h4 className="font-bold">紙本日報來源</h4>
          <AttachmentSummary attachments={[report.sourceAttachment]} />
        </div>
      ) : null}
      <div className="rounded-2xl border p-4">
        <h4 className="font-bold">現場施工照</h4>
        {report.attachments?.length ? (
          <AttachmentSummary attachments={report.attachments} />
        ) : (
          <p className="mt-2 text-sm text-slate-500">未附加施工照片。</p>
        )}
      </div>
    </div>
  );
}

function DailyReportTable({ title, rows = [], columns = [] }) {
  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="border-b bg-slate-50 px-4 py-3">
        <h4 className="font-bold">{title}</h4>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-white text-slate-500">
              <tr>
                {columns.map(([, label]) => (
                  <th key={label} className="px-4 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-t">
                  {columns.map(([key]) => (
                    <td key={key} className="px-4 py-3 align-top text-slate-700">
                      {row[key] || "未填寫"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="p-4 text-sm text-slate-500">尚無資料。</p>
      )}
    </div>
  );
}

function createMeetingDraft(project) {
  return {
    meetingType: meetingTypeOptions[0],
    title: "",
    date: todayKey(),
    location: "",
    chair: "",
    recorder: "",
    attendees: [{ id: 1, name: "", company: "", role: "", note: "" }],
    items: [{ id: 2, topic: "", content: "", decision: "", owner: "", dueDate: "", note: "" }],
    note: "",
    attachments: [],
    projectId: project.id,
    projectName: project.name,
  };
}

function stripRowIds(rows = []) {
  return rows
    .map(({ id, ...row }) => row)
    .filter((row) => Object.values(row).some((value) => String(value || "").trim()));
}

function Meetings({ p }) {
  const { items, saveItem, updateItem: updateMeetingRecord, deleteItem, loading, error } = useProjectRecords(p, "meetings", []);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(() => createMeetingDraft(p));
  const [editingId, setEditingId] = useState("");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState("");
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exportIncludeAttachments, setExportIncludeAttachments] = useState(true);
  const [exportError, setExportError] = useState("");

  function resetDraft() {
    setDraft(createMeetingDraft(p));
    setEditingId("");
  }

  function startEditMeeting(record) {
    setDraft({
      ...createMeetingDraft(p),
      ...record,
      attendees: withRowIds(record.attendees || [], {
        name: "",
        company: "",
        role: "",
        note: "",
      }),
      items: withRowIds(record.items || [], {
        topic: "",
        content: "",
        decision: "",
        owner: "",
        dueDate: "",
        note: "",
      }),
      attachments: record.attachments || [],
    });
    setEditingId(record.id);
    setAdding(true);
    setOpenId("");
  }

  function updateAttendee(id, key, value) {
    setDraft((current) => ({
      ...current,
      attendees: current.attendees.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    }));
  }

  function updateItem(id, key, value) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    }));
  }

  function addAttendee() {
    setDraft((current) => ({
      ...current,
      attendees: [...current.attendees, { id: Date.now(), name: "", company: "", role: "", note: "" }],
    }));
  }

  function addMeetingItem() {
    setDraft((current) => ({
      ...current,
      items: [
        ...current.items,
        { id: Date.now(), topic: "", content: "", decision: "", owner: "", dueDate: "", note: "" },
      ],
    }));
  }

  function removeAttendee(id) {
    setDraft((current) => ({
      ...current,
      attendees:
        current.attendees.length === 1
          ? current.attendees
          : current.attendees.filter((row) => row.id !== id),
    }));
  }

  function removeMeetingItem(id) {
    setDraft((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((row) => row.id !== id),
    }));
  }

  async function saveMeeting() {
    const attendees = stripRowIds(draft.attendees);
    const meetingItems = stripRowIds(draft.items);
    const next = {
      ...draft,
      id: editingId || Date.now(),
      title: draft.title || `${draft.meetingType}紀錄`,
      location: draft.location || "未填寫",
      chair: draft.chair || "未填寫",
      recorder: draft.recorder || "未填寫",
      attendees,
      attendeeCount: attendees.length,
      items: meetingItems,
      itemCount: meetingItems.length,
      attachments: draft.attachments || [],
      projectId: p.id,
      projectName: p.name,
    };

    if (editingId) {
      await updateMeetingRecord(editingId, next, {
        title: `${next.date} ${next.title}`,
        status: next.meetingType,
      });
    } else {
      await saveItem(next, {
        title: `${next.date} ${next.title}`,
        status: next.meetingType,
      });
    }
    resetDraft();
    setAdding(false);
  }

  const filteredMeetings = items.filter((record) => {
    const keyword = query.trim().toLowerCase();
    const matchesDate = !exportFrom && !exportTo ? true : isDateInRange(record.date, exportFrom, exportTo);
    const searchable = [
      record.date,
      record.meetingType,
      record.title,
      record.location,
      record.chair,
      record.recorder,
      record.note,
      ...(record.attendees || []).flatMap((row) => [row.name, row.company, row.role, row.note]),
      ...(record.items || []).flatMap((row) => [
        row.topic,
        row.content,
        row.decision,
        row.owner,
        row.dueDate,
        row.note,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesKeyword = !keyword || searchable.includes(keyword);
    return matchesKeyword && matchesDate;
  });

  const exportRecords = filteredMeetings
    .sort((a, b) => compareDateKey(a.date).localeCompare(compareDateKey(b.date)));

  function exportMeetingsPdf(records = exportRecords, range = {}) {
    const recordsToExport = [...records].sort((a, b) =>
      compareDateKey(a.date).localeCompare(compareDateKey(b.date)),
    );
    if (!recordsToExport.length) {
      setExportError("目前檢索條件內沒有可匯出的會議紀錄。");
      return;
    }

    const opened = openMeetingRecordsPdfExport({
      project: p,
      records: recordsToExport,
      from: range.from ?? exportFrom,
      to: range.to ?? exportTo,
      includeAttachments: exportIncludeAttachments,
    });

    if (!opened) {
      setExportError("瀏覽器封鎖了匯出視窗，請允許彈出視窗後再試一次。");
      return;
    }

    setExportError("");
  }

  return (
    <div>
      <Header
        title="會議紀錄"
        sub={`目前工地：${p.name}，可建立工具箱、承攬商、工務與協議組織會議紀錄`}
        btn="新增會議紀錄"
        onAdd={() => {
          resetDraft();
          setAdding(true);
          setOpenId("");
        }}
      />
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {adding ? (
        <Card className="mb-4">
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <label>
              <span className="text-sm font-medium">會議類型</span>
              <CustomSelect
                value={draft.meetingType}
                onChange={(value) => setDraft({ ...draft, meetingType: value })}
                options={meetingTypeOptions}
                className="mt-2 space-y-2"
                otherPlaceholder="請輸入自訂會議類型"
              />
            </label>
            <label>
              <span className="text-sm font-medium">會議日期</span>
              <div className="mt-2">
                <Input type="date" value={draft.date} onChange={(value) => setDraft({ ...draft, date: value })} />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">會議名稱</span>
              <div className="mt-2">
                <Input
                  value={draft.title}
                  onChange={(value) => setDraft({ ...draft, title: value })}
                  ph="例如：第 5 次承攬商會議"
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">會議地點</span>
              <div className="mt-2">
                <Input
                  value={draft.location}
                  onChange={(value) => setDraft({ ...draft, location: value })}
                  ph="例如：工務所會議室"
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">主席 / 主持人</span>
              <div className="mt-2">
                <Input value={draft.chair} onChange={(value) => setDraft({ ...draft, chair: value })} />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">記錄人員</span>
              <div className="mt-2">
                <Input value={draft.recorder} onChange={(value) => setDraft({ ...draft, recorder: value })} />
              </div>
            </label>
            <div className="md:col-span-2 rounded-2xl border p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-bold">與會人員</h3>
                <Button type="button" variant="outline" onClick={addAttendee}>
                  <Plus className="mr-2 h-4 w-4" />
                  新增與會人員
                </Button>
              </div>
              <div className="grid gap-3">
                {draft.attendees.map((row, index) => (
                  <div key={row.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <b>人員 {index + 1}</b>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => removeAttendee(row.id)}
                        disabled={draft.attendees.length === 1}
                      >
                        刪除
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <Input value={row.name} onChange={(value) => updateAttendee(row.id, "name", value)} ph="姓名" />
                      <Input
                        value={row.company}
                        onChange={(value) => updateAttendee(row.id, "company", value)}
                        ph="單位 / 公司"
                      />
                      <Input value={row.role} onChange={(value) => updateAttendee(row.id, "role", value)} ph="職務" />
                      <Input value={row.note} onChange={(value) => updateAttendee(row.id, "note", value)} ph="備註" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 rounded-2xl border p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-bold">會議內容 / 決議事項</h3>
                <Button type="button" variant="outline" onClick={addMeetingItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  新增內容列
                </Button>
              </div>
              <div className="grid gap-3">
                {draft.items.map((row, index) => (
                  <div key={row.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <b>內容 {index + 1}</b>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => removeMeetingItem(row.id)}
                        disabled={draft.items.length === 1}
                      >
                        刪除
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <Input value={row.topic} onChange={(value) => updateItem(row.id, "topic", value)} ph="項目" />
                      <Input value={row.owner} onChange={(value) => updateItem(row.id, "owner", value)} ph="負責人" />
                      <Input
                        type="date"
                        value={row.dueDate}
                        onChange={(value) => updateItem(row.id, "dueDate", value)}
                      />
                      <label className="md:col-span-2 xl:col-span-3">
                        <span className="text-sm font-medium">內容</span>
                        <textarea
                          value={row.content}
                          onChange={(event) => updateItem(row.id, "content", event.target.value)}
                          className="mt-2 min-h-20 w-full rounded-xl border px-3 py-2 outline-none"
                          placeholder="會議討論內容"
                        />
                      </label>
                      <label className="md:col-span-2 xl:col-span-3">
                        <span className="text-sm font-medium">決議 / 待辦</span>
                        <textarea
                          value={row.decision}
                          onChange={(event) => updateItem(row.id, "decision", event.target.value)}
                          className="mt-2 min-h-20 w-full rounded-xl border px-3 py-2 outline-none"
                          placeholder="會議決議、待辦事項或追蹤條件"
                        />
                      </label>
                      <label className="md:col-span-2 xl:col-span-3">
                        <span className="text-sm font-medium">備註</span>
                        <textarea
                          value={row.note}
                          onChange={(event) => updateItem(row.id, "note", event.target.value)}
                          className="mt-2 min-h-16 w-full rounded-xl border px-3 py-2 outline-none"
                          placeholder="補充說明"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <label className="md:col-span-2">
              <span className="text-sm font-medium">其他備註</span>
              <textarea
                value={draft.note}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                className="mt-2 min-h-24 w-full rounded-xl border px-3 py-2 outline-none"
                placeholder="補充會議結論、下次會議提醒或其他說明"
              />
            </label>
            <ImageAttachments
              className="md:col-span-2"
              title="會議附件圖片"
              description="可附上簽到表、白板照片、現場照片或會議文件截圖。"
              buttonLabel="上傳附件"
              value={draft.attachments}
              onChange={(attachments) => setDraft({ ...draft, attachments })}
            />
            <ActionBar className="md:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetDraft();
                  setAdding(false);
                }}
              >
                取消
              </Button>
              <Button type="button" onClick={saveMeeting}>
                <Save className="mr-2 h-4 w-4" />
                {editingId ? "更新會議紀錄" : "儲存會議紀錄"}
              </Button>
            </ActionBar>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold">已儲存會議紀錄</h2>
              <p className="mt-1 text-sm text-slate-500">
                可依日期區間搜尋會議類型、與會人員、決議內容、負責人或備註，並直接匯出 A4 PDF。
              </p>
            </div>
            <div className="grid gap-2 xl:grid-cols-[150px_150px_minmax(220px,1fr)_auto_auto] xl:items-end">
              <label>
                <span className="text-xs font-medium text-slate-500">開始日期</span>
                <div className="mt-1">
                  <Input type="date" value={exportFrom} onChange={setExportFrom} />
                </div>
              </label>
              <label>
                <span className="text-xs font-medium text-slate-500">結束日期</span>
                <div className="mt-1">
                  <Input type="date" value={exportTo} onChange={setExportTo} />
                </div>
              </label>
              <label>
                <span className="text-xs font-medium text-slate-500">快速檢索</span>
                <div className="mt-1">
                  <Input value={query} onChange={setQuery} ph="搜尋會議、與會人員、決議或備註" />
                </div>
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={exportIncludeAttachments}
                  onChange={(event) => setExportIncludeAttachments(event.target.checked)}
                />
                包含附件
              </label>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-none xl:grid-flow-col">
                <Button type="button" onClick={() => exportMeetingsPdf()}>
                  <FileDown className="mr-2 h-4 w-4" />
                  匯出 PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setExportFrom("");
                    setExportTo("");
                    setExportError("");
                  }}
                >
                  清除
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p>目前符合：{filteredMeetings.length} 筆</p>
              <p>匯出會依日期排序，並使用 A4 版面重新排版。</p>
            </div>
            {exportError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {exportError}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
      {loading ? (
        <div className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">
          讀取會議紀錄中
        </div>
      ) : null}
      {filteredMeetings.length ? (
        <div className="mt-4 grid gap-3">
          {filteredMeetings.map((record) => {
            const isOpen = openId === record.id;
            return (
              <Card key={record.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? "" : record.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">{record.date} {record.title}</h3>
                        <Badge>{record.meetingType}</Badge>
                        <Badge>{isOpen ? "已展開" : "點擊查看"}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        地點：{record.location || "未填寫"}｜主席：{record.chair || "未填寫"}｜記錄：{record.recorder || "未填寫"}
                      </p>
                      <p className="text-sm text-slate-500">
                        與會 {record.attendeeCount || record.attendees?.length || 0} 人｜內容 {record.itemCount || record.items?.length || 0} 筆
                      </p>
                      <AttachmentSummary attachments={record.attachments} />
                    </button>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Button type="button" variant="outline" onClick={() => setOpenId(isOpen ? "" : record.id)}>
                        {isOpen ? "收合" : "查看詳情"}
                      </Button>
                      {isOpen ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            exportMeetingsPdf([record], {
                              from: compareDateKey(record.date),
                              to: compareDateKey(record.date),
                            })
                          }
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          列印本筆
                        </Button>
                      ) : null}
                      <EditButton icon label={`${record.date} ${record.title}`} onClick={() => startEditMeeting(record)} />
                      <Del icon label={`${record.date} ${record.title}`} onClick={() => deleteItem(record.id)} />
                    </div>
                  </div>
                  {isOpen ? <MeetingRecordDetails record={record} /> : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : !loading ? (
        <div className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">
          {items.length ? "找不到符合條件的會議紀錄。" : "尚無已儲存會議紀錄。"}
        </div>
      ) : null}
    </div>
  );
}

function MeetingRecordDetails({ record }) {
  return (
    <div className="mt-4 grid gap-4 border-t pt-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">會議類型</p>
          <p className="mt-1 font-bold">{record.meetingType || "未分類"}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">會議日期</p>
          <p className="mt-1 font-bold">{record.date || "未設定"}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">主席 / 主持人</p>
          <p className="mt-1 font-bold">{record.chair || "未填寫"}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">記錄人員</p>
          <p className="mt-1 font-bold">{record.recorder || "未填寫"}</p>
        </div>
      </div>
      <DailyReportTable
        title="與會人員"
        rows={record.attendees || []}
        columns={[
          ["name", "姓名"],
          ["company", "單位 / 公司"],
          ["role", "職務"],
          ["note", "備註"],
        ]}
      />
      <DailyReportTable
        title="會議內容 / 決議事項"
        rows={record.items || []}
        columns={[
          ["topic", "項目"],
          ["content", "內容"],
          ["decision", "決議 / 待辦"],
          ["owner", "負責人"],
          ["dueDate", "期限"],
          ["note", "備註"],
        ]}
      />
      <div className="rounded-2xl border p-4">
        <h4 className="font-bold">其他備註</h4>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
          {record.note || "未填寫"}
        </p>
      </div>
      <div className="rounded-2xl border p-4">
        <h4 className="font-bold">附件圖片</h4>
        {record.attachments?.length ? (
          <AttachmentSummary attachments={record.attachments} />
        ) : (
          <p className="mt-2 text-sm text-slate-500">未附加圖片。</p>
        )}
      </div>
    </div>
  );
}

function Rows({ title, list, add, insertAfter, del: remove, render }) {
  return (
    <div className="rounded-2xl border p-4 md:col-span-2">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-bold">{title}</h3>
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="mr-2 h-4 w-4" />
          新增
        </Button>
      </div>
      <div className="space-y-3">
        {list.map((x, i) => (
          <div key={x.id} className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-3 flex justify-between">
              <b>紀錄 {i + 1}</b>
              <Button
                type="button"
                onClick={() => remove(x.id, i)}
                variant="danger"
                size="sm"
              >
                刪除
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{render(x)}</div>
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full border-dashed"
              onClick={() => insertAfter(x.id)}
            >
              <Plus className="mr-2 h-4 w-4" />
              新增一筆
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Defects({ p, recordsApi }) {
  const localRecordsApi = useProjectRecords(p, "defects", defectSeed);
  const {
    items,
    saveItem,
    updateItem,
    deleteItem,
    loading,
    error,
  } = recordsApi || localRecordsApi;
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState("");
  const emptyDraft = {
    location: "",
    type: "",
    vendor: "",
    due: "",
    status: "待改善",
    level: "一般",
    attachments: [],
  };
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState("");

  function resetDraft() {
    setDraft(emptyDraft);
    setEditingId("");
  }

  function startEditDefect(defect) {
    setDraft({
      ...emptyDraft,
      ...defect,
      attachments: defect.attachments || [],
    });
    setEditingId(defect.id);
    setAdding(true);
  }

  async function saveDefect() {
    const next = {
      id: editingId || Date.now(),
      location: draft.location || "未填寫位置",
      type: draft.type || "未分類",
      vendor: draft.vendor || "未指定",
      due: draft.due || "未設定",
      status: draft.status,
      level: draft.level,
      attachments: draft.attachments || [],
    };

    setFormError("");
    if (editingId) {
      await updateItem(editingId, next, {
        title: `${next.location} ${next.type}`,
        status: next.status,
      });
    } else {
      await saveItem(next, {
        title: `${next.location} ${next.type}`,
        status: next.status,
      });
    }
    resetDraft();
    setAdding(false);
  }

  const exportControls = useRecordExport({
    project: p,
    title: "缺失改善",
    records: items,
    buildPrintRecord: buildDefectPrintRecord,
  });

  return (
    <div>
      <Header
        title="缺失改善"
        sub={`目前工地：${p.name}`}
        onAdd={() => {
          resetDraft();
          setAdding(true);
        }}
      />
      {error || formError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error || formError}
        </div>
      ) : null}
      {loading ? (
        <div className="mb-4 rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">
          讀取缺失資料中
        </div>
      ) : null}

      {adding ? (
        <Card className="mb-4">
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <label>
              <span className="text-sm font-medium">缺失位置</span>
              <div className="mt-2">
                <Input
                  value={draft.location}
                  onChange={(value) => setDraft({ ...draft, location: value })}
                  ph="例如：3F 主臥浴室"
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">類型</span>
              <div className="mt-2">
                <Input
                  value={draft.type}
                  onChange={(value) => setDraft({ ...draft, type: value })}
                  ph="例如：防水、油漆、磁磚"
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">負責廠商</span>
              <div className="mt-2">
                <Input
                  value={draft.vendor}
                  onChange={(value) => setDraft({ ...draft, vendor: value })}
                  ph="例如：永信防水"
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">改善期限</span>
              <div className="mt-2">
                <Input
                  type="date"
                  value={draft.due}
                  onChange={(value) => setDraft({ ...draft, due: value })}
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">狀態</span>
              <CustomSelect
                value={draft.status}
                onChange={(value) => setDraft({ ...draft, status: value })}
                options={["待改善", "改善中", "待複驗", "已完成"]}
                className="mt-2 space-y-2"
                otherPlaceholder="請輸入自訂狀態"
              />
            </label>
            <label>
              <span className="text-sm font-medium">嚴重程度</span>
              <CustomSelect
                value={draft.level}
                onChange={(value) => setDraft({ ...draft, level: value })}
                options={["一般", "重要", "重大"]}
                className="mt-2 space-y-2"
                otherPlaceholder="請輸入自訂嚴重程度"
              />
            </label>
            <ImageAttachments
              className="md:col-span-2"
              value={draft.attachments}
              onChange={(attachments) => setDraft({ ...draft, attachments })}
            />
            <ActionBar className="md:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetDraft();
                  setAdding(false);
                }}
              >
                取消
              </Button>
              <Button type="button" onClick={saveDefect}>
                <Save className="mr-2 h-4 w-4" />
                {editingId ? "更新缺失" : "儲存缺失"}
              </Button>
            </ActionBar>
          </CardContent>
        </Card>
      ) : null}

      <RecordExportToolbar controls={exportControls} placeholder="搜尋位置、類型、廠商、期限、狀態或嚴重程度" />
      <div className="grid gap-4">
        {exportControls.filteredRecords.map((x) => (
          <Card key={x.id || `${x.location}-${x.type}`}>
          <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row">
            <div>
              <div className="flex flex-wrap gap-2">
                <h3 className="text-lg font-bold">{x.location}</h3>
                <Badge>{x.level}</Badge>
                <Badge>{x.status}</Badge>
              </div>
              <p className="text-sm text-slate-500">
                類型：{x.type}｜負責廠商：{x.vendor}
              </p>
              <p className="text-sm text-slate-500">改善期限：{x.due}</p>
              <AttachmentSummary attachments={x.attachments} />
            </div>
            <div className="flex flex-wrap items-start gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => exportControls.exportRecords([x], { from: recordDateKey(x), to: recordDateKey(x) })}
              >
                <FileDown className="mr-1 h-3.5 w-3.5" />
                列印本筆
              </Button>
              <EditButton label={`${x.location} ${x.type}`} onClick={() => startEditDefect(x)} />
              <Del label={`${x.location} ${x.type}`} onClick={() => deleteItem(x.id)} />
            </div>
          </CardContent>
        </Card>
        ))}
        {!loading && !exportControls.filteredRecords.length ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              {items.length ? "找不到符合條件的缺失資料。" : "尚無缺失資料，請新增第一筆紀錄。"}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function ListPage({ title, sub, items, render, onAdd, btn, children, toolbar, emptyText = "尚無資料。" }) {
  return (
    <div>
      <Header title={title} sub={sub} btn={btn} onAdd={onAdd} />
      {children}
      {toolbar}
      {items.length ? (
        <div className="grid gap-4">{items.map(render)}</div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">{emptyText}</CardContent>
        </Card>
      )}
    </div>
  );
}

function ModuleRestricted({ title, message }) {
  return (
    <Card>
      <CardContent className="p-8 text-center text-slate-500">
        <ShieldCheck className="mx-auto h-8 w-8 text-slate-400" />
        <h2 className="mt-3 text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm">{message}</p>
      </CardContent>
    </Card>
  );
}

function NotificationCenter({ notifications, open, onOpenChange, onNavigate }) {
  const hasNotifications = notifications.length > 0;
  const preview = notifications.slice(0, 8);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onOpenChange(!open)}
        className="relative bg-white"
        aria-label="站內通知"
      >
        <Bell className="h-4 w-4" />
        {hasNotifications ? (
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border bg-white shadow-xl">
          <div className="border-b bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold">站內通知</h3>
                <p className="mt-1 text-xs text-slate-500">
                  公告、缺失期限、會議與待辦會在這裡彙整。
                </p>
              </div>
              {hasNotifications ? <Badge>{notifications.length}</Badge> : null}
            </div>
          </div>
          <div className="max-h-[60vh] overflow-auto p-3">
            {preview.length ? (
              <div className="grid gap-2">
                {preview.map((notice) => (
                  <button
                    key={notice.id}
                    type="button"
                    onClick={() => {
                      onNavigate(notice.module);
                      onOpenChange(false);
                    }}
                    className="w-full rounded-xl border p-3 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge>{notice.type}</Badge>
                          <span
                            className={`h-2 w-2 rounded-full ${
                              notice.tone === "danger"
                                ? "bg-red-500"
                                : notice.tone === "warning"
                                  ? "bg-amber-500"
                                  : "bg-sky-500"
                            }`}
                          />
                        </div>
                        <p className="mt-2 break-words font-bold text-slate-900">{notice.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{notice.desc}</p>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
                目前沒有需要提醒的事項。
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OperationLogs({ p, records, loading, error }) {
  const exportControls = useRecordExport({
    project: p,
    title: "操作紀錄",
    records,
    buildPrintRecord: buildOperationLogPrintRecord,
  });
  const actionClass = {
    create: "bg-emerald-50 text-emerald-700",
    update: "bg-amber-50 text-amber-700",
    delete: "bg-red-50 text-red-700",
  };

  return (
    <div>
      <Header
        title="操作紀錄"
        sub={`目前工地：${p.name}，自動記錄新增、編輯與刪除等重要操作`}
      />
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <RecordExportToolbar controls={exportControls} placeholder="搜尋操作、模組、資料名稱或日期" />
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">讀取操作紀錄中</CardContent>
        </Card>
      ) : exportControls.filteredRecords.length ? (
        <div className="grid gap-3">
          {exportControls.filteredRecords.map((record) => (
            <Card key={record.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          actionClass[record.action] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {operationActionLabel(record.action)}
                      </span>
                      <Badge>{record.targetModuleLabel || moduleLabel(record.targetModule)}</Badge>
                    </div>
                    <h3 className="mt-3 break-words font-bold">{record.message || record.targetTitle}</h3>
                    <p className="mt-1 break-words text-sm text-slate-500">
                      目標資料：{record.targetTitle || "未命名資料"}
                    </p>
                    {record.previousTitle && record.previousTitle !== record.targetTitle ? (
                      <p className="text-sm text-slate-500">原資料名稱：{record.previousTitle}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-left text-xs text-slate-500 sm:text-right">
                    <p>{formatDateTime(record.createdAt)}</p>
                    <p className="mt-1">紀錄日期：{record.date || "未設定"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            尚無操作紀錄；新增、編輯或刪除資料後會自動建立。
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Todos({ p, items, onSave, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false);
  const emptyDraft = {
    title: "",
    owner: "",
    date: todayKey(),
    status: "一般",
    note: "",
    attachments: [],
  };
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState("");

  function resetDraft() {
    setDraft({ ...emptyDraft, date: todayKey() });
    setEditingId("");
  }

  function startEditTodo(todo) {
    setDraft({
      ...emptyDraft,
      ...todo,
      date: todo.date || todayKey(),
      attachments: todo.attachments || [],
    });
    setEditingId(todo.id);
    setAdding(true);
  }

  async function saveTodo() {
    const next = {
      id: editingId || Date.now(),
      projectId: p.id,
      projectName: p.name,
      title: draft.title || "未命名待辦",
      owner: draft.owner || "未指定",
      date: draft.date || todayKey(),
      status: draft.status || "一般",
      note: draft.note,
      attachments: draft.attachments || [],
    };
    if (editingId && onUpdate) {
      await onUpdate(editingId, next, { title: next.title, status: next.status });
    } else {
      await onSave(next, { title: next.title, status: next.status });
    }
    resetDraft();
    setAdding(false);
  }

  const exportControls = useRecordExport({
    project: p,
    title: "待辦事項",
    records: items,
    buildPrintRecord: buildTodoPrintRecord,
  });

  return (
    <ListPage
      title="待辦事項"
      sub={`目前工地：${p.name}`}
      btn="新增待辦"
      onAdd={() => {
        resetDraft();
        setAdding(true);
      }}
      items={exportControls.filteredRecords}
      toolbar={<RecordExportToolbar controls={exportControls} placeholder="搜尋待辦事項、負責人、日期、優先度或備註" />}
      emptyText={items.length ? "找不到符合條件的待辦事項。" : "尚無待辦事項，請新增第一筆待辦。"}
      render={(todo) => (
        <Card key={todo.id}>
          <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row">
            <div>
              <div className="flex flex-wrap gap-2">
                <h3 className="text-lg font-bold">{todo.title}</h3>
                <Badge>{todo.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                負責人：{todo.owner}｜日期：{todo.date}
              </p>
              {todo.note ? <p className="text-sm text-slate-500">{todo.note}</p> : null}
              <AttachmentSummary attachments={todo.attachments} />
            </div>
            <div className="flex flex-wrap items-start gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  exportControls.exportRecords([todo], { from: recordDateKey(todo), to: recordDateKey(todo) })
                }
              >
                <FileDown className="mr-1 h-3.5 w-3.5" />
                列印本筆
              </Button>
              <EditButton label={todo.title} onClick={() => startEditTodo(todo)} />
              <Del label={todo.title} onClick={() => onDelete(todo.id)} />
            </div>
          </CardContent>
        </Card>
      )}
    >
      {adding ? (
        <Card className="mb-4">
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <label>
              <span className="text-sm font-medium">待辦事項</span>
              <div className="mt-2">
                <Input
                  value={draft.title}
                  onChange={(value) => setDraft({ ...draft, title: value })}
                  ph="例如：確認浴室門檻收邊"
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">負責人</span>
              <div className="mt-2">
                <Input
                  value={draft.owner}
                  onChange={(value) => setDraft({ ...draft, owner: value })}
                  ph="例如：李工務"
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">日期</span>
              <div className="mt-2">
                <Input
                  type="date"
                  value={draft.date}
                  onChange={(value) => setDraft({ ...draft, date: value })}
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">優先度</span>
              <CustomSelect
                value={draft.status}
                onChange={(value) => setDraft({ ...draft, status: value })}
                options={["一般", "重要", "緊急"]}
                className="mt-2 space-y-2"
                otherPlaceholder="請輸入自訂優先度"
              />
            </label>
            <label className="md:col-span-2">
              <span className="text-sm font-medium">備註</span>
              <textarea
                value={draft.note}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                className="mt-2 min-h-24 w-full rounded-xl border px-3 py-2 outline-none"
                placeholder="補充提醒、聯絡資訊或處理條件"
              />
            </label>
            <ImageAttachments
              className="md:col-span-2"
              value={draft.attachments}
              onChange={(attachments) => setDraft({ ...draft, attachments })}
            />
            <ActionBar className="md:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetDraft();
                  setAdding(false);
                }}
              >
                取消
              </Button>
              <Button type="button" onClick={saveTodo}>
                <Save className="mr-2 h-4 w-4" />
                {editingId ? "更新待辦" : "儲存待辦"}
              </Button>
            </ActionBar>
          </CardContent>
        </Card>
      ) : null}
    </ListPage>
  );
}

function createScheduleDraft(project) {
  const startDate = project.startDate || todayKey();
  return {
    trade: "",
    name: "",
    startDate,
    endDate: startDate,
    percent: 0,
    status: "未開始",
    note: "",
    attachments: [],
  };
}

function scheduleChartRange(project, items) {
  const starts = [project.startDate, ...items.map((item) => item.startDate)]
    .filter(Boolean)
    .sort();
  const ends = [project.endDate, ...items.map((item) => item.endDate)]
    .filter(Boolean)
    .sort();
  const start = starts[0] || todayKey();
  const end = ends[ends.length - 1] || start;
  return normalizeDateRange(start, end);
}

function Schedule({ p, items, onSave, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(() => createScheduleDraft(p));
  const [editingId, setEditingId] = useState("");

  const chartRange = useMemo(() => scheduleChartRange(p, items), [p, items]);
  const dates = useMemo(
    () => workDateRows(chartRange.start, chartRange.end),
    [chartRange.start, chartRange.end],
  );
  const trades = useMemo(() => {
    const names = items.map((item) => item.trade || "未分類工種");
    return Array.from(new Set(names));
  }, [items]);
  const chartTrades = trades.length ? trades : ["尚無工種"];
  const itemsByTrade = useMemo(
    () =>
      chartTrades.map((trade) => ({
        trade,
        items: items.filter((item) => (item.trade || "未分類工種") === trade),
      })),
    [chartTrades, items],
  );
  const chartDayCount = Math.max(dates.length, 1);
  const gridTemplateColumns = `minmax(132px, 160px) repeat(${chartDayCount}, minmax(96px, 1fr))`;
  const chartMinWidth = 132 + chartDayCount * 96;

  function resetDraft() {
    setDraft(createScheduleDraft(p));
    setEditingId("");
  }

  function startEditSchedule(item) {
    setDraft({
      ...createScheduleDraft(p),
      ...item,
      attachments: item.attachments || [],
    });
    setEditingId(item.id);
    setAdding(true);
  }

  async function saveSchedule() {
    const { start, end } = normalizeDateRange(draft.startDate, draft.endDate);
    const trade = draft.trade || "未分類工種";
    const next = {
      id: editingId || Date.now(),
      projectId: p.id,
      projectName: p.name,
      ...draft,
      trade,
      startDate: start,
      endDate: end,
      percent: clampPercent(draft.percent),
      name: draft.name || `${trade}預定進度`,
    };

    if (editingId && onUpdate) {
      await onUpdate(editingId, next, { title: next.name, status: next.status });
    } else {
      await onSave(next, { title: next.name, status: next.status });
    }
    resetDraft();
    setAdding(false);
  }

  return (
    <div>
      <Header
        title="預定進度"
        sub={`目前工地：${p.name}，表單儲存後會立即更新下方甘特圖`}
        btn="新增進度節點"
        onAdd={() => {
          resetDraft();
          setAdding(true);
        }}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Stat
          title="預定工期"
          value={`${dates.length} 天`}
          desc={`${formatDate(chartRange.start)} - ${formatDate(chartRange.end)}`}
          icon={CalendarDays}
        />
        <Stat title="工種數" value={trades.length || 0} desc="甘特圖 Y 軸分類" icon={ListChecks} />
        <Stat title="進度節點" value={items.length} desc="已登錄的預定進度" icon={ClipboardList} />
      </div>

      {adding ? (
        <Card className="mb-4">
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <label>
              <span className="text-sm font-medium">工種</span>
              <div className="mt-2">
                <SelectGroup
                  type="trade"
                  value={draft.trade}
                  onChange={(value) => setDraft({ ...draft, trade: value })}
                  placeholder="請選擇工種"
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">進度項目</span>
              <div className="mt-2">
                <Input
                  value={draft.name}
                  onChange={(value) => setDraft({ ...draft, name: value })}
                  ph="例如：3F 防水完成"
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">預定開始</span>
              <div className="mt-2">
                <Input
                  type="date"
                  value={draft.startDate}
                  onChange={(value) => setDraft({ ...draft, startDate: value })}
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">預定完成</span>
              <div className="mt-2">
                <Input
                  type="date"
                  value={draft.endDate}
                  onChange={(value) => setDraft({ ...draft, endDate: value })}
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">預定進度 %</span>
              <div className="mt-2">
                <Input
                  type="number"
                  value={draft.percent}
                  onChange={(value) => setDraft({ ...draft, percent: value })}
                  ph="例如：65"
                />
              </div>
            </label>
            <label>
              <span className="text-sm font-medium">狀態</span>
              <CustomSelect
                value={draft.status}
                onChange={(value) => setDraft({ ...draft, status: value })}
                options={scheduleStatusOptions}
                className="mt-2 space-y-2"
                otherPlaceholder="請輸入自訂狀態"
              />
            </label>
            <label className="md:col-span-2">
              <span className="text-sm font-medium">備註</span>
              <textarea
                value={draft.note}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                className="mt-2 min-h-24 w-full rounded-xl border px-3 py-2 outline-none"
                placeholder="進度說明或前置條件"
              />
            </label>
            <ImageAttachments
              className="md:col-span-2"
              value={draft.attachments}
              onChange={(attachments) => setDraft({ ...draft, attachments })}
            />
            <ActionBar className="md:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetDraft();
                  setAdding(false);
                }}
              >
                取消
              </Button>
              <Button type="button" onClick={saveSchedule}>
                <Save className="mr-2 h-4 w-4" />
                {editingId ? "更新並同步圖表" : "儲存並更新圖表"}
              </Button>
            </ActionBar>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-4">
        <CardContent className="p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">預定進度甘特圖</h2>
              <p className="mt-1 text-sm text-slate-500">
                X 軸為工作天與日期，Y 軸為工種。
              </p>
            </div>
            <Badge>{formatDate(chartRange.start)} - {formatDate(chartRange.end)}</Badge>
          </div>
          <div className="grid gap-3 md:hidden">
            {items.length ? (
              itemsByTrade.map(({ trade, items: tradeItems }) => (
                <div key={trade} className="rounded-2xl border bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="min-w-0 break-words text-sm font-bold">{trade}</h3>
                    <Badge>{tradeItems.length} 項</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {tradeItems.map((item) => (
                      <div key={item.id} className="rounded-xl border bg-white p-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words font-bold">{item.name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {shortDateLabel(item.startDate)} - {shortDateLabel(item.endDate)}
                            </p>
                          </div>
                          <Badge>{item.status}</Badge>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-slate-900"
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                        <p className="mt-1 text-right text-xs font-medium text-slate-500">
                          {item.percent}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">
                尚無預定進度，新增後會在這裡顯示手機版摘要。
              </div>
            )}
          </div>
          <div className="hidden max-h-[min(64vh,560px)] overflow-auto rounded-2xl border md:block">
            <div className="grid" style={{ gridTemplateColumns, minWidth: `${chartMinWidth}px` }}>
              <div className="sticky left-0 top-0 z-20 border-b border-r bg-slate-900 p-3 text-sm font-bold text-white">
                工種
              </div>
              {dates.map((row) => (
                <div
                  key={row.date}
                  className="sticky top-0 z-10 border-b border-r bg-slate-900 p-2 text-center text-white"
                >
                  <p className="text-xs font-bold">第 {row.workDay} 天</p>
                  <p className="mt-1 text-[11px] text-slate-300">{row.label}</p>
                </div>
              ))}
              {chartTrades.map((trade) => (
                <React.Fragment key={trade}>
                  <div className="sticky left-0 z-10 border-b border-r bg-white p-3">
                    <p className="break-words text-sm font-bold">{trade}</p>
                    <p className="text-xs text-slate-500">工種 / 分包</p>
                  </div>
                  {dates.map((row) => {
                    const activeItems = items.filter(
                      (item) =>
                        (item.trade || "未分類工種") === trade &&
                        item.startDate <= row.date &&
                        item.endDate >= row.date,
                    );

                    return (
                      <div key={`${trade}-${row.date}`} className="min-h-20 border-b border-r bg-slate-50 p-2">
                        {activeItems.length ? (
                          <div className="space-y-2">
                            {activeItems.map((item) => (
                              <div
                                key={item.id}
                                className={`rounded-lg border px-2 py-1 text-xs ${
                                  scheduleStatusClass[item.status] || scheduleStatusClass.未開始
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate font-medium">
                                    {row.date === item.startDate ? item.name : "進行中"}
                                  </span>
                                  <span className="shrink-0">{item.percent}%</span>
                                </div>
                                <div className="mt-1 h-1.5 rounded-full bg-white/70">
                                  <div
                                    className="h-1.5 rounded-full bg-slate-900/80"
                                    style={{ width: `${item.percent}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {items.length ? (
          items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <h3 className="text-lg font-bold">{item.name}</h3>
                    <Badge>{item.trade}</Badge>
                    <Badge>{item.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {item.startDate} - {item.endDate}｜預定進度 {item.percent}%
                  </p>
                  {item.note ? <p className="text-sm text-slate-500">{item.note}</p> : null}
                  <AttachmentSummary attachments={item.attachments} />
                </div>
                <div className="flex flex-wrap items-start gap-2 sm:justify-end">
                  <EditButton label={item.name} onClick={() => startEditSchedule(item)} />
                  <Del label={item.name} onClick={() => onDelete(item.id)} />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              尚無預定進度資料，請點右上角新增。
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Manual() {
  const [showVersions, setShowVersions] = useState(false);
  const manualSections = [
    {
      title: "開始使用",
      desc: "從選擇工地開始，把每一筆資料都歸到正確案場。",
      items: [
        "進入系統後先創建或選擇工地。",
        "左側深色工地卡可查看目前案場、狀態、開工日期與累計天數。",
        "使用功能列表切換總覽、日報、請款、缺失與其他模組。",
      ],
    },
    {
      title: "日常紀錄",
      desc: "適合每天巡場、整理現場狀況與留下照片附件。",
      items: [
        "施工日報可記錄天氣、工班人數、材料與機具，也可上傳紙本日報照片交由 AI 先行填入。",
        "AI 判讀結果會先進入可編輯表格，確認無誤後再自行儲存。",
        "現場施工照可附掛在日報內，暫時限制每份日報最多 10 張。",
        "施工日報可依日期區間匯出 PDF，並可選擇是否包含施工照。",
        "各表單的已儲存列表可用日期區間與關鍵字檢索，並可匯出 A4 PDF 或列印單筆資料。",
        "站內通知會彙整重要公告、即將到期缺失、近期會議與近期待辦事項。",
        "操作紀錄會自動保留新增、編輯與刪除等重要動作，方便日後追蹤。",
        "會議紀錄可保存工具箱、承攬商、工務與協議組織會議，並逐列記錄與會人員與決議事項。",
        "工項 Memo 用來記錄需要追蹤或與業主確認的事項。",
        "缺失改善可登錄位置、類型、負責廠商、期限與嚴重程度。",
      ],
    },
    {
      title: "合約與廠商",
      desc: "把廠商聯絡資料、合約與請款資訊集中查找。",
      items: [
        "工程合約可建立廠商、聯絡人、電話與合約金額。",
        "廠商請款可依期別、月份、工種與狀態記錄。",
        "總覽的廠商資訊會聯動工程合約，方便快速查找電話與聯絡人。",
      ],
    },
    {
      title: "進度與行程",
      desc: "將待辦、Memo 與預定進度轉成更容易比較的時間視圖。",
      items: [
        "總覽月曆會顯示待辦事項與工項 Memo。",
        "預定進度表單儲存後會同步更新甘特圖。",
        "甘特圖 X 軸為工作天與日期，Y 軸為工種。",
      ],
    },
    {
      title: "帳號管理",
      desc: "一般使用者可管理自己的帳號；系統管理員另有完整管理中心。",
      items: [
        "右上角帳號設定可修改暱稱、變更密碼或登出。",
        "系統管理員可進入系統管理中心查詢與管理所有註冊帳號。",
        "帳號會記錄所屬單位，註冊與新增帳號時都需先選擇分組。",
        "帳號列表依會員編號與所屬單位排序，可用搜尋與單位篩選快速查找人員。",
        "帳號列表採收合式呈現，展開後可重設密碼、調整權限或重寄驗證信。",
        "工地總覽可管理工地成員，只有被加入該工地的帳號能看到與操作資料。",
      ],
    },
  ];
  const versionNotes = [
    {
      version: APP_VERSION,
      title: "站內通知與操作紀錄",
      items: [
        "左側功能列表新增操作紀錄，系統會自動記錄各表單新增、編輯與刪除等重要操作。",
        "登入後右上角新增站內通知按鈕，若有重要公告、缺失期限、近期會議或待辦事項會顯示紅點。",
        "圖片附件會透過 /api/uploads 保存到 Vercel Blob；部署前需設定 BLOB_READ_WRITE_TOKEN。",
      ],
    },
    {
      version: "eztodo_26052607",
      title: "表單編輯與文件閱覽權限",
      items: [
        "各主要表單的已儲存資料新增編輯按鈕，可直接回填原表單更新內容。",
        "工地成員權限新增請款文件與合約文件閱覽設定，可針對內外部成員分開控管。",
        "工地職稱選單新增財務、會計、行政、採購、估算與內業工程師等內業職稱。",
      ],
    },
    {
      version: "eztodo_26052606",
      title: "請款工作台重整",
      items: [
        "廠商請款新增合約請款與無合約 / 臨時發包兩種模式，可依現場實際發包方式建檔。",
        "請款表單新增明細列、合約總額、請款總額、保留款、清潔費、保險費、其他扣款與本期應付計算。",
        "請款頁重整為總覽、各廠商請款狀況、請款紀錄三段收合式版面，方便快速查找與彙整。",
      ],
    },
    {
      version: "eztodo_26052605",
      title: "全表單 A4 匯出整合",
      items: [
        "廠商請款、工程合約、工項 Memo、檢核表、會議紀錄、缺失改善、待辦事項與通用表單新增檢索列匯出 PDF。",
        "各表單支援日期區間、關鍵字與附件選項，單筆資料也可直接列印匯出。",
        "A4 匯出版面改為更緊湊的列印配置，避免整筆資料強制不分頁造成大量空白。",
      ],
    },
    {
      version: "eztodo_26052604",
      title: "施工日報匯出與總覽累計",
      items: [
        "施工日報匯出整合到檢索列，可依日期區間與關鍵字輸出多張日報 PDF。",
        "展開已儲存日報後可直接列印該張單份日報。",
        "工地總覽新增工種出工、材料與機具設備累計統計，來源為已儲存施工日報。",
      ],
    },
    {
      version: "eztodo_26052603",
      title: "登入後轉場動畫",
      items: [
        "登入成功後新增工作台開啟轉場，讓登入頁到工地頁的切換更柔順。",
        "轉場會顯示帳號權限、工地清單與表單模組載入狀態。",
        "動畫維持短秒數，不影響日常登入效率。",
      ],
    },
    {
      version: "eztodo_26052602",
      title: "會議紀錄模組",
      items: [
        "左側功能列表新增會議紀錄，可建立工具箱會議、承攬商會議、工務會議與協議組織會議。",
        "會議表單支援逐列新增與會人員、會議內容、決議事項、負責人與追蹤期限。",
        "會議紀錄支援日期區間 PDF 匯出，並可選擇是否包含附件圖片。",
      ],
    },
    {
      version: "eztodo_26052601",
      title: "施工日報 PDF 匯出",
      items: [
        "施工日報新增 PDF 匯出入口，可依日期區間輸出彙整資料。",
        "匯出內容包含工班、材料、機具、其他備註與彙總資訊。",
        "匯出時可選擇是否包含現場施工照，方便依報告用途控制版面大小。",
      ],
    },
    {
      version: "eztodo_26052506",
      title: "檢核表與表單儲存調整",
      items: [
        "階段檢核表移除範例資料，改由使用者自行建立。",
        "檢核項目改成逐列新增，不需要再用逗號或換行整理。",
        "工地內表單改寫入 project_records，刷新頁面後仍會保留已儲存資料。",
        "工地成員新增職務名稱欄位，可搭配權限一起管理。",
        "版本更新紀錄移到獨立頁面，操作手冊閱讀更清楚。",
      ],
    },
    {
      version: "eztodo_26052505",
      title: "會員編號與管理名冊調整",
      items: [
        "所有帳號新增會員編號，最高管理員從 2600001 開始，後續帳號依序產生。",
        "系統管理中心的搜尋功能移到帳號列表上方，並新增所屬單位篩選。",
        "登出、刪除、移除等重要操作統一使用紅色系按鈕，並改善手機版按鈕排列。",
      ],
    },
    {
      version: "eztodo_26052504",
      title: "一般帳號設定與註冊驗證調整",
      items: [
        "一般帳號右上角新增帳號設定，可自行修改暱稱、變更密碼與登出。",
        "工地選擇頁簡化權限說明文字。",
        "註冊帳號新增所屬單位下拉選單，目前提供測試分組1、測試分組2、測試分組3。",
        "正式環境預設要求註冊後完成信箱驗證才能登入。",
      ],
    },
    {
      version: "eztodo_26052503",
      title: "獨立系統管理中心",
      items: [
        "右上角系統管理改為全頁管理中心，僅系統管理員可使用。",
        "帳號管理新增搜尋、帳號總覽統計、建立工地數與最後登入時間。",
        "點開帳號後可查看帳號建立時間、信箱驗證狀態並調整權限或重設密碼。",
      ],
    },
    {
      version: "eztodo_26052502",
      title: "多客戶工地隔離與共同管理",
      items: [
        "新增工地建立者與 project_members 成員權限模型。",
        "工地列表改為只顯示自己建立或被邀請加入的工地。",
        "工地總覽新增成員管理，可邀請已註冊帳號成為共同管理者、可編輯或僅閱覽。",
        "選擇工地頁新增刷新工地按鈕，讓被邀請人可立即重新讀取新工地。",
      ],
    },
    {
      version: "eztodo_26052501",
      title: "公開上線前信箱驗證",
      items: [
        "新增信箱驗證資料欄位、驗證連結與重寄驗證信 API。",
        "登入時若一般帳號尚未完成信箱驗證，系統會阻擋登入並提供重寄驗證信。",
        "帳號管理列表會顯示信箱驗證狀態，管理員可替未驗證帳號重寄驗證信。",
      ],
    },
    {
      version: "eztodo_26052402",
      title: "施工日報 AI 匯入與照片附件",
      items: [
        "施工日報新增紙本日報圖片上傳與 AI 判讀填入功能。",
        "AI 判讀後會先填入表格，使用者可修正欄位後再確認儲存。",
        "施工日報新增現場施工照附件區，暫時限制最多 10 張。",
      ],
    },
    {
      version: "eztodo_26052401",
      title: "初始操作手冊版本",
      items: [
        "新增版本號顯示，登入頁與登入後介面底部皆可核對版本。",
        "保留單一範例工地，並在工地卡上標示範例備註。",
        "新增操作手冊頁，後續每次版本更新都在此補充新增功能操作說明。",
      ],
    },
  ];

  if (showVersions) {
    return (
      <div>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">版本更新紀錄</h1>
            <p className="mt-1 text-sm text-slate-500">
              目前版本：{APP_VERSION}。新增功能上線時，請同步補上操作入口與注意事項。
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => setShowVersions(false)}>
            返回操作手冊
          </Button>
        </div>
        <div className="grid gap-3">
          {versionNotes.map((note) => (
            <Card key={note.version}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold">{note.title}</h2>
                  <Badge>{note.version}</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {note.items.map((item) => (
                    <p key={item} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {item}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="操作手冊"
        sub={`目前版本：${APP_VERSION}。功能操作說明會隨版本更新補充。`}
      />
      <div className="mb-4 flex justify-end">
        <Button type="button" variant="outline" onClick={() => setShowVersions(true)}>
          <FileText className="mr-2 h-4 w-4" />
          查看版本更新
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {manualSections.map((section) => (
          <Card key={section.title}>
            <CardContent className="p-5">
              <h2 className="text-lg font-bold">{section.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{section.desc}</p>
              <div className="mt-4 space-y-2">
                {section.items.map((item, index) => (
                  <div key={item} className="flex gap-3 rounded-xl border bg-slate-50 p-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="leading-6 text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

const placeholderModuleMap = {
  重要公告: "announcements",
  材料庫存: "materials",
  照片中心: "photos",
};

function Placeholder({ title, p, recordsApi }) {
  const schema =
    {
      重要公告: {
        btn: "新增公告",
        fields: [
          { key: "name", label: "公告標題", ph: "例如：明日停水施工通知" },
          { key: "owner", label: "發布人", ph: "例如：王主任" },
          { key: "status", label: "重要程度", options: ["一般", "重要", "緊急"] },
          { key: "note", label: "公告內容", ph: "輸入需要通知工班或業主的重要事項", wide: true },
        ],
      },
      工程合約: {
        btn: "新增合約",
        fields: [
          { key: "name", label: "合約名稱", ph: "例如：水電配管工程" },
          { key: "vendor", label: "廠商", ph: "例如：宏鑫水電" },
          { key: "amount", label: "合約金額", ph: "例如：1200000", type: "number" },
          { key: "date", label: "簽約日期", type: "date" },
          { key: "status", label: "狀態", options: ["草稿", "待簽核", "執行中", "已結案"] },
        ],
      },
      材料庫存: {
        btn: "新增材料",
        fields: [
          { key: "name", label: "材料名稱", ph: "例如：PVC 管" },
          { key: "category", label: "分類", ph: "例如：水電材料" },
          { key: "quantity", label: "數量", ph: "例如：50", type: "number" },
          { key: "unit", label: "單位", ph: "例如：支" },
          { key: "location", label: "存放位置", ph: "例如：1F 倉庫" },
        ],
      },
      預定進度: {
        btn: "新增進度節點",
        fields: [
          { key: "name", label: "進度項目", ph: "例如：3F 防水完成" },
          { key: "startDate", label: "預定開始", type: "date" },
          { key: "endDate", label: "預定完成", type: "date" },
          { key: "percent", label: "預定進度 %", ph: "例如：65", type: "number" },
          { key: "status", label: "狀態", options: ["未開始", "進行中", "延遲", "已完成"] },
          { key: "note", label: "備註", ph: "進度說明或前置條件", wide: true },
        ],
      },
      待辦事項: {
        btn: "新增待辦",
        fields: [
          { key: "name", label: "待辦事項", ph: "例如：確認浴室門檻收邊" },
          { key: "owner", label: "負責人", ph: "例如：李工務" },
          { key: "date", label: "到期日", type: "date" },
          { key: "status", label: "優先度", options: ["一般", "重要", "緊急"] },
        ],
      },
      照片中心: {
        btn: "新增照片紀錄",
        fields: [
          { key: "name", label: "照片標題", ph: "例如：3F 防水試水" },
          { key: "location", label: "拍攝位置", ph: "例如：3F 主臥浴室" },
          { key: "status", label: "分類", options: ["施工前", "施工中", "完工", "缺失", "材料"] },
          { key: "note", label: "備註", ph: "照片上傳功能後續接雲端儲存", wide: true },
        ],
      },
    }[title] || {
      btn: "新增資料",
      fields: [
        { key: "name", label: "名稱", ph: "請輸入名稱" },
        { key: "status", label: "狀態", options: ["待處理", "進行中", "已完成"] },
        { key: "note", label: "備註", ph: "補充說明", wide: true },
      ],
    };
  const emptyDraft = schema.fields.reduce((draft, field) => {
    draft[field.key] = field.options ? field.options[0] : "";
    return draft;
  }, { attachments: [] });
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState("");
  const internalRecordsApi = useProjectRecords(p, placeholderModuleMap[title] || `placeholder-${title}`, []);
  const {
    items: records,
    saveItem,
    updateItem,
    deleteItem,
    loading,
    error,
  } = recordsApi || internalRecordsApi;
  const exportControls = useRecordExport({
    project: p,
    title,
    records,
    buildPrintRecord: (record) => buildPlaceholderPrintRecord(record, schema),
  });

  async function saveRecord() {
    const next = {
      ...draft,
      id: editingId || Date.now(),
      name: draft.name || `${title}資料`,
      projectId: p.id,
      projectName: p.name,
    };

    if (editingId) {
      await updateItem(editingId, next, {
        title: next.name,
        status: next.status || "",
      });
    } else {
      await saveItem(next, {
        title: next.name,
        status: next.status || "",
      });
    }
    setDraft(emptyDraft);
    setEditingId("");
    setAdding(false);
  }

  function startEditRecord(record) {
    setDraft({
      ...emptyDraft,
      ...record,
      attachments: record.attachments || [],
    });
    setEditingId(record.id);
    setAdding(true);
  }

  return (
    <div>
      <Header
        title={title}
        sub={`目前工地：${p.name}`}
        btn={schema.btn}
        onAdd={() => {
          setDraft(emptyDraft);
          setEditingId("");
          setAdding(true);
        }}
      />
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {adding ? (
        <Card className="mb-4">
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            {schema.fields.map((field) => (
              <label key={field.key} className={field.wide ? "md:col-span-2" : ""}>
                <span className="text-sm font-medium">{field.label}</span>
                {field.options ? (
                  <CustomSelect
                    value={draft[field.key]}
                    onChange={(value) => setDraft({ ...draft, [field.key]: value })}
                    options={field.options}
                    className="mt-2 space-y-2"
                    otherPlaceholder={`請輸入自訂${field.label}`}
                  />
                ) : field.wide ? (
                  <textarea
                    value={draft[field.key]}
                    onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
                    className="mt-2 min-h-24 w-full rounded-xl border px-3 py-2 outline-none"
                    placeholder={field.ph}
                  />
                ) : (
                  <div className="mt-2">
                    <Input
                      type={field.type || "text"}
                      value={draft[field.key]}
                      onChange={(value) => setDraft({ ...draft, [field.key]: value })}
                      ph={field.ph}
                    />
                  </div>
                )}
              </label>
            ))}
            <ImageAttachments
              className="md:col-span-2"
              value={draft.attachments}
              onChange={(attachments) => setDraft({ ...draft, attachments })}
            />
            <ActionBar className="md:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraft(emptyDraft);
                  setEditingId("");
                  setAdding(false);
                }}
              >
                取消
              </Button>
              <Button type="button" onClick={saveRecord}>
                <Save className="mr-2 h-4 w-4" />
                {editingId ? "更新" : "儲存"}
              </Button>
            </ActionBar>
          </CardContent>
        </Card>
      ) : null}
      <RecordExportToolbar controls={exportControls} placeholder={`搜尋${title}內容`} />
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">讀取{title}資料中</CardContent>
          </Card>
        ) : exportControls.filteredRecords.length ? (
          exportControls.filteredRecords.map((record) => (
            <Card key={record.id}>
              <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <h3 className="text-lg font-bold">{record.name}</h3>
                    {record.status ? <Badge>{record.status}</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {schema.fields
                      .filter((field) => field.key !== "name" && record[field.key])
                      .slice(0, 4)
                      .map((field) => `${field.label}：${record[field.key]}`)
                      .join("｜")}
                  </p>
                  <AttachmentSummary attachments={record.attachments} />
                </div>
                <div className="flex flex-wrap items-start gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportControls.exportRecords([record], {
                        from: recordDateKey(record),
                        to: recordDateKey(record),
                      })
                    }
                  >
                    <FileDown className="mr-1 h-3.5 w-3.5" />
                    列印本筆
                  </Button>
                  <EditButton label={record.name} onClick={() => startEditRecord(record)} />
                  <Del label={record.name} onClick={() => deleteItem(record.id)} />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              {records.length ? `找不到符合條件的${title}資料。` : `尚無${title}資料，請點右上角新增。`}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function AdminPanel({ currentUser, onLogout, onUserUpdate, open, onOpenChange }) {
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const [users, setUsers] = useState(adminSeedUsers.map(normalizeAccountPermissions));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [accountQuery, setAccountQuery] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [draft, setDraft] = useState(defaultAccountDraft);
  const [profileName, setProfileName] = useState(currentUser?.name || "");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [sections, setSections] = useState({
    account: false,
    create: false,
    users: true,
  });
  const [openUserId, setOpenUserId] = useState("");
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [resetDrafts, setResetDrafts] = useState({});

  useEffect(() => {
    setProfileName(currentUser?.name || "");
  }, [currentUser?.name]);

  const isSystemAdmin = useLocalPreview || currentUser?.role === "admin";

  useEffect(() => {
    if (!open || useLocalPreview || currentUser?.role !== "admin") return;

    let active = true;
    apiFetch("/api/users")
      .then((data) => {
        if (active) setUsers((data.users || []).map(normalizeAccountPermissions));
      })
      .catch((err) => {
        if (active) setError(err.message);
      });

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event) {
      const target = event.target;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, onOpenChange]);

  const sortedUsers = [...users].sort((a, b) => {
    const organizationCompare = String(a.organizationName || "").localeCompare(
      String(b.organizationName || ""),
      "zh-Hant",
    );
    if (organizationCompare) return organizationCompare;
    return String(a.memberNumber || "").localeCompare(String(b.memberNumber || ""));
  });
  const filteredUsers = sortedUsers.filter((user) => {
    const keyword = accountQuery.trim().toLowerCase();
    const matchesOrganization =
      organizationFilter === "all" || user.organizationName === organizationFilter;
    if (!matchesOrganization) return false;
    if (!keyword) return true;
    return [
      user.memberNumber,
      user.name,
      user.email,
      user.organizationName,
      user.role,
      user.emailVerified ? "verified" : "unverified",
    ]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });
  const totalProjects = users.reduce((total, user) => total + Number(user.createdProjectCount || 0), 0);
  const verifiedCount = users.filter((user) => user.emailVerified).length;
  const activeCount = users.filter((user) => user.lastLoginAt).length;

  function toggleSection(section) {
    setSections((current) => ({ ...current, [section]: !current[section] }));
  }

  async function saveUser() {
    setError("");
    setNotice("");

    if (!draft.password || draft.password.length < 8) {
      setError("初始密碼至少需要 8 碼");
      return;
    }
    if (!draft.organizationName) {
      setError("請選擇所屬單位");
      return;
    }

    const next = normalizeAccountPermissions({
      ...draft,
      id: `user-${Date.now()}`,
      memberNumber: nextPreviewMemberNumber(users),
      name: draft.name || "未命名使用者",
      email: draft.email || `user-${Date.now()}@example.com`,
    });

    if (useLocalPreview) {
      setUsers([next, ...users]);
      setDraft(defaultAccountDraft());
      setNotice("已新增預覽帳號");
      return;
    }

    try {
      setBusy("create-user");
      const data = await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify(next),
      });
      setUsers([normalizeAccountPermissions(data.user), ...users]);
      setDraft(defaultAccountDraft());
      setNotice(data.verificationEmailSent ? "帳號已新增，驗證信已寄出" : "帳號已新增");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function resendUserVerification(user) {
    setError("");
    setNotice("");

    if (useLocalPreview) {
      setNotice(`已模擬寄送 ${user.email} 的驗證信`);
      return;
    }

    try {
      setBusy(`verify-${user.id}`);
      const data = await apiFetch("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email: user.email }),
      });
      setNotice(data.message || `已寄送 ${user.email} 的驗證信`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function updatePermission(user, patch) {
    if (user.role === "admin") return;
    setError("");
    setNotice("");
    const updated = normalizeAccountPermissions({ ...user, ...patch });
    setUsers(users.map((item) => (item.id === user.id ? updated : item)));

    if (useLocalPreview) return;

    try {
      await apiFetch(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
    } catch (err) {
      setError(err.message);
      setUsers(users);
    }
  }

  async function changeOwnPassword() {
    setError("");
    setNotice("");

    if (passwordDraft.newPassword.length < 8) {
      setError("新密碼至少需要 8 碼");
      return;
    }
    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      setError("兩次輸入的新密碼不一致");
      return;
    }

    if (useLocalPreview) {
      setPasswordDraft({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice("本機預覽已模擬更新密碼");
      return;
    }

    try {
      setBusy("change-password");
      await apiFetch("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: passwordDraft.currentPassword,
          newPassword: passwordDraft.newPassword,
        }),
      });
      setPasswordDraft({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice("密碼已更新，下次登入請使用新密碼");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function saveProfileName() {
    const name = profileName.trim();
    setError("");
    setNotice("");

    if (!name) {
      setError("請輸入暱稱");
      return;
    }

    if (useLocalPreview) {
      onUserUpdate?.({ ...currentUser, name });
      setNotice("本機預覽已模擬更新暱稱");
      return;
    }

    try {
      setBusy("profile-name");
      const data = await apiFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setUsers(
        users.map((user) =>
          user.id === data.user.id ? normalizeAccountPermissions({ ...user, ...data.user }) : user,
        ),
      );
      onUserUpdate?.(data.user);
      setNotice("暱稱已更新，重新整理或下次登入後會套用到全站");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function resetUserPassword(user) {
    const password = resetDrafts[user.id] || "";
    setError("");
    setNotice("");

    if (password.length < 8) {
      setError("重設密碼至少需要 8 碼");
      return;
    }

    if (useLocalPreview) {
      setResetDrafts({ ...resetDrafts, [user.id]: "" });
      setNotice(`已模擬重設 ${user.email} 的密碼`);
      return;
    }

    try {
      setBusy(`reset-${user.id}`);
      await apiFetch(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password }),
      });
      setResetDrafts({ ...resetDrafts, [user.id]: "" });
      setNotice(`已重設 ${user.email} 的密碼`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function removeUser(user) {
    if (user.role === "admin") return;
    if (!window.confirm(`確定刪除帳號「${user.email}」？`)) return;

    setError("");
    setNotice("");
    setUsers(users.filter((item) => item.id !== user.id));

    if (useLocalPreview) return;

    try {
      await apiFetch(`/api/users/${user.id}`, { method: "DELETE" });
    } catch (err) {
      setError(err.message);
      setUsers(users);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        className="fixed right-4 top-4 z-50 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-lg hover:bg-slate-50"
      >
        {isSystemAdmin ? <ShieldCheck className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
        {isSystemAdmin ? "系統管理" : "帳號設定"}
      </button>

      {open ? isSystemAdmin ? (
        <div ref={panelRef} className="fixed inset-0 z-50 overflow-auto bg-slate-50">
          <div className="sticky top-0 z-10 border-b bg-white/95 p-4 shadow-sm backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">系統管理中心</h2>
                <p className="mt-1 text-sm text-slate-500">
                  僅最高權限系統管理員可使用｜目前管理者：{currentUser?.name || "管理員"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-xl border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                返回系統
              </button>
            </div>
          </div>

          <div className="mx-auto max-w-7xl p-4">
            {error ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {notice ? (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {notice}
              </div>
            ) : null}

            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat title="註冊帳號" value={users.length} desc="系統內全部帳號" icon={UserRound} />
              <Stat title="已驗證信箱" value={verifiedCount} desc="包含系統管理員" icon={ShieldCheck} />
              <Stat title="有登入紀錄" value={activeCount} desc="依最後登入時間統計" icon={LogIn} />
              <Stat title="建立工地" value={totalProjects} desc="所有帳號建立總數" icon={Building2} />
            </div>

            <div className="grid gap-3">
              <AccordionSection
                title="目前帳號設定"
                desc={`${currentUser?.memberNumber || "未編號"}｜${currentUser?.name || "使用者"}｜${currentUser?.organizationName || "未設定單位"}｜${currentUser?.email || "未登入"}`}
                open={sections.account}
                onToggle={() => toggleSection("account")}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="font-bold">個人設定</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      修改暱稱、變更密碼或登出目前帳號。
                    </p>
                  </div>
                  <Button type="button" variant="danger" onClick={onLogout} className="w-full sm:w-auto">
                    <LogOut className="mr-2 h-4 w-4" />
                    登出帳號
                  </Button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Input
                    value={profileName}
                    onChange={setProfileName}
                    ph="暱稱"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={saveProfileName}
                    disabled={busy === "profile-name"}
                  >
                    {busy === "profile-name" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    儲存暱稱
                  </Button>
                </div>
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPasswordOpen(!passwordOpen)}
                    className="w-full sm:w-auto"
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {passwordOpen ? "收合密碼變更" : "變更密碼"}
                  </Button>
                </div>
                {passwordOpen ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <Input
                        type="password"
                        value={passwordDraft.currentPassword}
                        onChange={(value) =>
                          setPasswordDraft({ ...passwordDraft, currentPassword: value })
                        }
                        ph="目前密碼"
                      />
                      <Input
                        type="password"
                        value={passwordDraft.newPassword}
                        onChange={(value) =>
                          setPasswordDraft({ ...passwordDraft, newPassword: value })
                        }
                        ph="新密碼，至少 8 碼"
                      />
                      <Input
                        type="password"
                        value={passwordDraft.confirmPassword}
                        onChange={(value) =>
                          setPasswordDraft({ ...passwordDraft, confirmPassword: value })
                        }
                        ph="再次輸入新密碼"
                      />
                    </div>
                    <ActionBar className="mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={changeOwnPassword}
                        disabled={busy === "change-password"}
                      >
                        {busy === "change-password" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-2 h-4 w-4" />
                        )}
                        更新密碼
                      </Button>
                    </ActionBar>
                  </div>
                ) : null}
              </AccordionSection>

              <AccordionSection
                title="新增帳號"
                desc="建立新使用者並設定初始權限"
                meta={draft.role === "admin" ? "管理員" : "一般帳號"}
                open={sections.create}
                onToggle={() => toggleSection("create")}
              >
                <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
                  <Input
                    value={draft.name}
                    onChange={(value) => setDraft({ ...draft, name: value })}
                    ph="暱稱"
                  />
                  <Input
                    value={draft.email}
                    onChange={(value) => setDraft({ ...draft, email: value })}
                    ph="Email 帳號"
                  />
                  <select
                    value={draft.organizationName}
                    onChange={(event) =>
                      setDraft({ ...draft, organizationName: event.target.value })
                    }
                    className="w-full rounded-xl border bg-white px-3 py-2 outline-none"
                  >
                    {organizationOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="password"
                    value={draft.password}
                    onChange={(value) => setDraft({ ...draft, password: value })}
                    ph="初始密碼"
                  />
                  <select
                    value={draft.role}
                    onChange={(event) =>
                      setDraft(normalizeAccountPermissions({ ...draft, role: event.target.value }))
                    }
                    className="w-full rounded-xl border bg-white px-3 py-2 outline-none"
                  >
                    <option value="member">一般帳號</option>
                    <option value="admin">管理員</option>
                  </select>
                  <label className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.role === "admin" || draft.canView}
                      disabled={draft.role === "admin"}
                      onChange={(event) =>
                        setDraft(normalizeAccountPermissions({ ...draft, canView: event.target.checked }))
                      }
                    />
                    開啟閱覽
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.role === "admin" || draft.canEdit}
                      disabled={draft.role === "admin" || !draft.canView}
                      onChange={(event) =>
                        setDraft(normalizeAccountPermissions({ ...draft, canEdit: event.target.checked }))
                      }
                    />
                    開啟編輯
                  </label>
                  <div className="md:col-span-2">
                    <Button type="button" onClick={saveUser} disabled={busy === "create-user"}>
                      {busy === "create-user" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      新增帳號
                    </Button>
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection
                title="帳號列表"
                desc="依會員編號與所屬單位排序，方便搜尋、查看與管理人員"
                meta={`${filteredUsers.length}/${users.length} 個帳號`}
                open={sections.users}
                onToggle={() => toggleSection("users")}
              >
                <div className="grid gap-3">
                  <div className="grid gap-3 rounded-2xl bg-slate-50 p-3 lg:grid-cols-[1fr_180px_auto]">
                    <div className="flex items-center gap-3 rounded-xl border bg-white px-3 py-2">
                      <Search className="h-5 w-5 text-slate-400" />
                      <input
                        value={accountQuery}
                        onChange={(event) => setAccountQuery(event.target.value)}
                        className="w-full bg-transparent text-sm outline-none"
                        placeholder="搜尋會員編號、暱稱、Email、所屬單位或角色"
                      />
                    </div>
                    <select
                      value={organizationFilter}
                      onChange={(event) => setOrganizationFilter(event.target.value)}
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none"
                    >
                      <option value="all">全部單位</option>
                      {organizationOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setAccountQuery("");
                        setOrganizationFilter("all");
                      }}
                    >
                      清除搜尋
                    </Button>
                  </div>
              {filteredUsers.map((user) => {
                const isAdmin = user.role === "admin";
                const userOpen = openUserId === user.id;
                return (
                <div key={user.id} className="rounded-2xl border p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <button
                      type="button"
                      onClick={() => setOpenUserId(userOpen ? "" : user.id)}
                      className="min-w-0 flex-1 text-left"
                      aria-expanded={userOpen}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">{user.name}</h3>
                        <Badge>會員 {user.memberNumber || "未編號"}</Badge>
                        {user.organizationName ? <Badge>{user.organizationName}</Badge> : null}
                        <Badge>{isAdmin ? "管理員" : "一般帳號"}</Badge>
                        {isAdmin ? <Badge>最高權限</Badge> : null}
                        {!isAdmin ? <Badge>{user.canEdit ? "可編輯" : user.canView ? "僅閱覽" : "未開放"}</Badge> : null}
                        {!isAdmin ? (
                          <Badge>{user.emailVerified ? "信箱已驗證" : "待信箱驗證"}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        會員編號：{user.memberNumber || "未編號"}｜所屬單位：{user.organizationName || "未設定"}｜建立工地 {Number(user.createdProjectCount || 0)} 個｜最後登入：{formatDateTime(user.lastLoginAt)}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenUserId(userOpen ? "" : user.id)}
                      className="flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                      aria-label={userOpen ? "收合帳號設定" : "展開帳號設定"}
                    >
                      <ChevronRight className={`h-5 w-5 transition ${userOpen ? "rotate-90" : ""}`} />
                    </button>
                  </div>
                  {userOpen ? (
                  <>
                  <div className="mt-4 grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2 xl:grid-cols-6">
                    <div>
                      <p className="text-xs font-medium text-slate-500">會員編號</p>
                      <p className="mt-1 font-bold">{user.memberNumber || "未編號"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">建立工地</p>
                      <p className="mt-1 font-bold">{Number(user.createdProjectCount || 0)} 個</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">所屬單位</p>
                      <p className="mt-1 font-bold">{user.organizationName || "未設定"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">最後登入</p>
                      <p className="mt-1 font-bold">{formatDateTime(user.lastLoginAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">建立帳號時間</p>
                      <p className="mt-1 font-bold">{formatDateTime(user.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">信箱驗證</p>
                      <p className="mt-1 font-bold">{user.emailVerified ? "已驗證" : "尚未驗證"}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <select
                      value={user.role}
                      onChange={(event) => updatePermission(user, { role: event.target.value })}
                      disabled={isAdmin}
                      className="rounded-xl border bg-white px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      <option value="member">一般帳號</option>
                      <option value="admin">管理員</option>
                    </select>
                    <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isAdmin || Boolean(user.canView)}
                        disabled={isAdmin}
                        onChange={(event) => updatePermission(user, { canView: event.target.checked })}
                      />
                      閱覽
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isAdmin || Boolean(user.canEdit)}
                        disabled={isAdmin || !user.canView}
                        onChange={(event) => updatePermission(user, { canEdit: event.target.checked })}
                      />
                      編輯
                    </label>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Input
                      type="password"
                      value={resetDrafts[user.id] || ""}
                      onChange={(value) =>
                        setResetDrafts({ ...resetDrafts, [user.id]: value })
                      }
                      ph="重設密碼，至少 8 碼"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => resetUserPassword(user)}
                      disabled={busy === `reset-${user.id}`}
                    >
                      {busy === `reset-${user.id}` ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="mr-2 h-4 w-4" />
                      )}
                      重設密碼
                    </Button>
                  </div>
                  {!isAdmin && !user.emailVerified ? (
                    <ActionBar className="mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => resendUserVerification(user)}
                        disabled={busy === `verify-${user.id}`}
                      >
                        {busy === `verify-${user.id}` ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-2 h-4 w-4" />
                        )}
                        重寄驗證信
                      </Button>
                    </ActionBar>
                  ) : null}
                  <ActionBar className="mt-3">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeUser(user)}
                      disabled={isAdmin}
                      className="disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      刪除帳號
                    </Button>
                  </ActionBar>
                  </>
                  ) : null}
                </div>
                );
              })}
                </div>
              </AccordionSection>
            </div>
          </div>
        </div>
      ) : (
        <div ref={panelRef} className="fixed right-4 top-16 z-50 w-[calc(100vw-2rem)] max-w-md rounded-2xl border bg-white shadow-xl">
          <div className="border-b p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">帳號設定</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {currentUser?.memberNumber || "未編號"}｜{currentUser?.name || "使用者"}｜{currentUser?.organizationName || "未設定單位"}｜{currentUser?.email || "未登入"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              >
                關閉
              </button>
            </div>
          </div>
          <div className="p-4">
            {error ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {notice ? (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {notice}
              </div>
            ) : null}
            <div className="grid gap-3">
              <label>
                <span className="text-sm font-medium">暱稱</span>
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input value={profileName} onChange={setProfileName} ph="暱稱" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={saveProfileName}
                    disabled={busy === "profile-name"}
                  >
                    {busy === "profile-name" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    儲存
                  </Button>
                </div>
              </label>

              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordOpen(!passwordOpen)}
                className="w-full"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                {passwordOpen ? "收合密碼變更" : "變更密碼"}
              </Button>

              {passwordOpen ? (
                <div className="grid gap-3 rounded-2xl bg-slate-50 p-4">
                  <Input
                    type="password"
                    value={passwordDraft.currentPassword}
                    onChange={(value) =>
                      setPasswordDraft({ ...passwordDraft, currentPassword: value })
                    }
                    ph="目前密碼"
                  />
                  <Input
                    type="password"
                    value={passwordDraft.newPassword}
                    onChange={(value) =>
                      setPasswordDraft({ ...passwordDraft, newPassword: value })
                    }
                    ph="新密碼，至少 8 碼"
                  />
                  <Input
                    type="password"
                    value={passwordDraft.confirmPassword}
                    onChange={(value) =>
                      setPasswordDraft({ ...passwordDraft, confirmPassword: value })
                    }
                    ph="再次輸入新密碼"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={changeOwnPassword}
                    disabled={busy === "change-password"}
                  >
                    {busy === "change-password" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-4 w-4" />
                    )}
                    更新密碼
                  </Button>
                </div>
              ) : null}

              <Button type="button" variant="danger" onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                登出帳號
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function App() {
  const [auth, setAuth] = useState(
    useLocalPreview
      ? { loading: false, user: previewUser }
      : { loading: true, user: null },
  );
  const [active, setActive] = useState("dashboard");
  const [p, setP] = useState(null);
  const [moduleListOpen, setModuleListOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loginTransitionUser, setLoginTransitionUser] = useState(null);
  const announcementRecords = useProjectRecords(p, "announcements", []);
  const claimRecords = useProjectRecords(p, "claims", claimSeed);
  const contractRecords = useProjectRecords(p, "contracts", contractSeed);
  const memoRecords = useProjectRecords(p, "memos", memos);
  const scheduleRecords = useProjectRecords(p, "schedule", scheduleSeed);
  const meetingRecords = useProjectRecords(p, "meetings", []);
  const todoRecords = useProjectRecords(p, "todos", todoSeed);
  const dailyRecords = useProjectRecords(p, "daily", []);
  const defectRecords = useProjectRecords(p, "defects", defectSeed);
  const operationRecords = useProjectRecords(p, operationLogModule, []);
  const commonSettingsRecords = useProjectRecords(p, "commonSettings", []);
  const commonSettingsValue = useMemo(
    () => normalizeCommonSettings(commonSettingsRecords.items[0] || defaultCommonSettings),
    [commonSettingsRecords.items],
  );

  useEffect(() => {
    if (useLocalPreview) return;

    let activeRequest = true;

    async function loadSession() {
      try {
        const data = await apiFetch("/api/auth/me");
        if (activeRequest) setAuth({ loading: false, user: data.user });
      } catch {
        if (activeRequest) setAuth({ loading: false, user: null });
      }
    }

    loadSession();

    return () => {
      activeRequest = false;
    };
  }, []);

  async function handleLogout() {
    if (useLocalPreview) {
      setP(null);
      setActive("dashboard");
      setModuleListOpen(false);
      setAdminOpen(false);
      setNotificationsOpen(false);
      return;
    }

    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setP(null);
    setActive("dashboard");
    setModuleListOpen(false);
    setAdminOpen(false);
    setNotificationsOpen(false);
    setLoginTransitionUser(null);
    setAuth({ loading: false, user: null });
  }

  function closeAdminPanel() {
    if (adminOpen) setAdminOpen(false);
  }

  function finishLoginTransition() {
    if (!loginTransitionUser) return;
    setAuth({ loading: false, user: loginTransitionUser });
    setActive("dashboard");
    setP(null);
    setModuleListOpen(false);
    setAdminOpen(false);
    setNotificationsOpen(false);
    setLoginTransitionUser(null);
  }

  async function persistCommonSettings(nextSettings) {
    const normalized = {
      ...normalizeCommonSettings(nextSettings),
      name: "常用設定",
      updatedAt: new Date().toISOString(),
    };
    const existing = commonSettingsRecords.items[0];
    if (existing) {
      return commonSettingsRecords.updateItem(existing.id, normalized, {
        title: "常用設定",
        status: "已更新",
      });
    }
    return commonSettingsRecords.saveItem(normalized, {
      title: "常用設定",
      status: "啟用中",
    });
  }

  async function quickAddCommonSetting(type, name) {
    const cleanName = String(name || "").trim();
    if (!cleanName) throw new Error("請輸入名稱");
    const existing = commonSettingsValue[type].find(
      (item) => item.name.toLowerCase() === cleanName.toLowerCase(),
    );
    if (existing) {
      if (!existing.isActive) {
        await persistCommonSettings({
          ...commonSettingsValue,
          [type]: commonSettingsValue[type].map((item) =>
            item.id === existing.id ? { ...item, isActive: true } : item,
          ),
        });
      }
      return { ...existing, isActive: true };
    }

    const item = normalizeCommonSettingItem(
      {
        id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: cleanName,
        statisticsCategory: cleanName,
        aliases: [],
        isActive: true,
        sortOrder: commonSettingsValue[type].length + 1,
        ...(type === "materials" ? { unit: "" } : {}),
        ...(type === "equipment" ? { unit: "台次", specification: "" } : {}),
      },
      commonSettingsValue[type].length,
      type,
    );
    await persistCommonSettings({
      ...commonSettingsValue,
      [type]: [...commonSettingsValue[type], item],
    });
    return item;
  }

  const projectNotifications = useMemo(
    () =>
      buildProjectNotifications({
        announcements: announcementRecords.items,
        defects: defectRecords.items,
        meetings: meetingRecords.items,
        todos: todoRecords.items,
        memos: memoRecords.items,
      }),
    [
      announcementRecords.items,
      defectRecords.items,
      meetingRecords.items,
      todoRecords.items,
      memoRecords.items,
    ],
  );

  const page = useMemo(() => {
    if (!p) return null;
    const restriction = projectModuleRestriction(p, active);
    if (restriction) {
      return <ModuleRestricted title={mods.find((x) => x.id === active)?.label || "功能受限"} message={restriction} />;
    }
    const projectContracts = contractRecords.items;
    const projectClaims = claimRecords.items;
    const projectMemos = memoRecords.items;
    const projectScheduleItems = scheduleRecords.items;
    const projectMeetingItems = meetingRecords.items;
    const projectTodoItems = todoRecords.items;
    const projectDailyReports = dailyRecords.items;

    if (active === "manual") return <Manual />;
    if (active === "operationLogs") {
      return (
        <OperationLogs
          p={p}
          records={operationRecords.items}
          loading={operationRecords.loading}
          error={operationRecords.error}
        />
      );
    }
    if (active === "projects") {
      return <Placeholder p={p} title="重要公告" recordsApi={announcementRecords} />;
    }
    if (active === "dashboard") {
      return (
        <Dashboard
          p={p}
          claims={projectClaims}
          memoItems={projectMemos}
          todoItems={projectTodoItems}
          contractItems={projectContracts}
          dailyReports={projectDailyReports}
          commonSettings={commonSettingsValue}
        />
      );
    }
    if (active === "claims") {
      return (
        <Claims
          p={p}
          claims={projectClaims}
          contracts={projectContracts}
          onSave={(item, options) => claimRecords.saveItem(item, options)}
          onUpdate={(id, item, options) => claimRecords.updateItem(id, item, options)}
          onDelete={claimRecords.deleteItem}
        />
      );
    }
    if (active === "contracts") {
      return (
        <Contracts
          p={p}
          items={projectContracts}
          onSave={(item, options) => contractRecords.saveItem(item, options)}
          onUpdate={(id, item, options) => contractRecords.updateItem(id, item, options)}
          onDelete={contractRecords.deleteItem}
        />
      );
    }
    if (active === "memos") {
      return (
        <Memos
          p={p}
          items={projectMemos}
          onSave={(item, options) => memoRecords.saveItem(item, options)}
          onUpdate={(id, item, options) => memoRecords.updateItem(id, item, options)}
          onDelete={memoRecords.deleteItem}
        />
      );
    }
    if (active === "checklists") return <Checklists p={p} />;
    if (active === "schedule") {
      return (
        <Schedule
          p={p}
          items={projectScheduleItems}
          onSave={(item, options) => scheduleRecords.saveItem(item, options)}
          onUpdate={(id, item, options) => scheduleRecords.updateItem(id, item, options)}
          onDelete={scheduleRecords.deleteItem}
        />
      );
    }
    if (active === "meetings") return <Meetings p={p} items={projectMeetingItems} />;
    if (active === "daily") {
      return (
        <Daily
          p={p}
          records={dailyRecords}
          commonSettings={commonSettingsValue}
          onQuickAddSetting={quickAddCommonSetting}
        />
      );
    }
    if (active === "commonSettings") {
      return (
        <CommonSettings
          p={p}
          settings={commonSettingsValue}
          onSave={persistCommonSettings}
          dailyReports={projectDailyReports}
          loading={commonSettingsRecords.loading}
          error={commonSettingsRecords.error}
        />
      );
    }
    if (active === "defects") return <Defects p={p} recordsApi={defectRecords} />;
    if (active === "todos") {
      return (
        <Todos
          p={p}
          items={projectTodoItems}
          onSave={(item, options) => todoRecords.saveItem(item, options)}
          onUpdate={(id, item, options) => todoRecords.updateItem(id, item, options)}
          onDelete={todoRecords.deleteItem}
        />
      );
    }
    return <Placeholder p={p} title={mods.find((x) => x.id === active)?.label || "模組"} />;
  }, [
    active,
    p,
    announcementRecords.items,
    announcementRecords.loading,
    announcementRecords.error,
    claimRecords.items,
    contractRecords.items,
    defectRecords.items,
    defectRecords.loading,
    defectRecords.error,
    memoRecords.items,
    operationRecords.items,
    operationRecords.loading,
    operationRecords.error,
    scheduleRecords.items,
    meetingRecords.items,
    todoRecords.items,
    dailyRecords.items,
    dailyRecords.loading,
    dailyRecords.error,
    commonSettingsRecords.items,
    commonSettingsRecords.loading,
    commonSettingsRecords.error,
    commonSettingsValue,
  ]);

  if (auth.loading) {
    return <LoadingScreen />;
  }

  if (loginTransitionUser) {
    return <LoginTransitionScreen user={loginTransitionUser} onDone={finishLoginTransition} />;
  }

  if (!auth.user) {
    return (
      <LoginScreen
        onLogin={(user) => {
          setLoginTransitionUser(user);
        }}
      />
    );
  }

  if (!p) {
    return (
      <>
        <AdminPanel
          currentUser={auth.user}
          onLogout={handleLogout}
          onUserUpdate={(user) => setAuth((current) => ({ ...current, user }))}
          open={adminOpen}
          onOpenChange={setAdminOpen}
        />
        <div onPointerDownCapture={closeAdminPanel}>
          <ProjectSelect
            onSelect={(project) => {
              setP(project);
              setActive("dashboard");
              setModuleListOpen(false);
            }}
          />
        </div>
      </>
    );
  }

  const visibleModules = mods.filter((module) => canUseProjectModule(p, module.id));
  const activeModule = visibleModules.find((x) => x.id === active) || visibleModules[0] || mods[0];
  const ActiveModuleIcon = activeModule.icon;

  return (
    <>
      <AdminPanel
        currentUser={auth.user}
        onLogout={handleLogout}
        onUserUpdate={(user) => setAuth((current) => ({ ...current, user }))}
        open={adminOpen}
        onOpenChange={setAdminOpen}
      />
      <div onPointerDownCapture={closeAdminPanel} className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 lg:flex-row">
        <aside className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-72">
          <Card className="h-full rounded-2xl">
            <CardContent className="flex h-full flex-col p-4">
              <div className="mb-4 overflow-hidden rounded-2xl bg-slate-950 text-white shadow-sm">
                <div className="border-b border-white/10 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-300">
                      <Building2 className="h-4 w-4" />
                      目前工地
                    </span>
                  </div>
                  <h2 className="mt-3 break-words text-xl font-bold leading-snug">{p.name}</h2>
                  <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-300">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{p.address || "未填寫地址"}</span>
                  </p>
                  <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-300">
                    <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      建立者：{p.createdByName || "系統管理員"}
                      {p.memberRole ? `｜我的權限：${projectMemberRoleLabel(p.memberRole)}` : ""}
                    </span>
                  </p>
                  <label className="mt-4 block">
                    <span className="text-xs font-medium text-slate-400">工地狀態</span>
                    <CustomSelect
                      value={p.status}
                      onChange={(status) => setP({ ...p, status })}
                      options={projectStatusOptions}
                      placeholder="請選擇工地狀態"
                      className="mt-2 space-y-2"
                      selectClassName="project-status-select text-sm shadow-inner"
                      otherPlaceholder="請輸入自訂工地狀態"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2 p-4 text-xs">
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="text-slate-400">開工日期</p>
                    <p className="mt-1 font-semibold text-slate-50">{formatDate(p.startDate)}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="text-slate-400">預計完工</p>
                    <p className="mt-1 font-semibold text-slate-50">{formatDate(p.endDate)}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="text-slate-400">累計天數</p>
                    <p className="mt-1 font-semibold text-slate-50">{countWorkDays(p.startDate)} 天</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="text-slate-400">目前功能</p>
                    <p className="mt-1 truncate font-semibold text-slate-50">{activeModule.label}</p>
                  </div>
                </div>
                {!useLocalPreview ? (
                  <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300">
                    <UserRound className="h-3.5 w-3.5" />
                    <span className="truncate">{auth.user.name}｜{auth.user.role}</span>
                  </div>
                ) : null}
                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={() => setP(null)}
                    className="group flex w-full items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 text-left text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    <span>
                      <span className="block">返回主頁切換工地</span>
                      <span className="mt-0.5 block text-xs font-normal text-slate-500">
                        選擇其他案場或新增工地
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-500 transition group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
              <button
                type="button"
                aria-expanded={moduleListOpen}
                onClick={() => setModuleListOpen(!moduleListOpen)}
                className="flex w-full items-center justify-between rounded-xl border bg-white px-3 py-3 text-left text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <ActiveModuleIcon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-xs text-slate-500">功能列表</span>
                    <span className="block truncate">{activeModule.label}</span>
                  </span>
                </span>
                <ChevronRight
                  className={`h-5 w-5 shrink-0 text-slate-500 transition ${
                    moduleListOpen ? "rotate-90" : ""
                  }`}
                />
              </button>
              <nav className={`${moduleListOpen ? "grid" : "hidden"} mt-3 gap-2`}>
                {visibleModules.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setActive(m.id);
                        setModuleListOpen(false);
                      }}
                      className={`flex gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${
                        active === m.id
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {m.label}
                    </button>
                  );
                })}
              </nav>
              <VersionFooter className="mt-auto pt-4" />
            </CardContent>
          </Card>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="mb-4 flex justify-end">
            <NotificationCenter
              notifications={projectNotifications}
              open={notificationsOpen}
              onOpenChange={setNotificationsOpen}
              onNavigate={(moduleId) => {
                if (canUseProjectModule(p, moduleId)) {
                  setActive(moduleId);
                  setModuleListOpen(false);
                }
              }}
            />
          </div>
          <motion.div
            key={`${p.name}-${active}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {page}
          </motion.div>
        </main>
        </div>
      </div>
    </>
  );
}
