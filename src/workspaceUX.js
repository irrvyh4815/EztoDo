export function localMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function draftKey(userId, projectId, module) {
  return userId && projectId ? `eztodo:draft:v1:${encodeURIComponent(userId)}:${encodeURIComponent(projectId)}:${module}` : null;
}

export function readDraft(storage, key) {
  if (!key) return null;
  try {
    const value = JSON.parse(storage.getItem(key));
    return value?.version === 1 && value.data && typeof value.data === "object" ? value.data : null;
  } catch { return null; }
}

export function readBrowserDraft(key) {
  try { return readDraft(window.localStorage, key); } catch { return null; }
}

// Local File objects and blob URLs do not survive a reload. Never pretend they do.
export function persistentAttachment(item) {
  if (!item || item.file || !/^https:\/\//.test(item.url || "")) return null;
  const { file, ...metadata } = item;
  return metadata;
}

export const moduleDependencies = {
  dashboard: ["claims", "contracts", "memos", "todos", "daily", "commonSettings", "defects"],
  projects: ["announcements"], claims: ["claims", "contracts"], contracts: ["contracts"],
  memos: ["memos", "commonSettings"], schedule: ["schedule"], todos: ["todos"], defects: ["defects"],
  daily: ["daily", "commonSettings"], commonSettings: ["commonSettings", "daily"],
  operationLogs: ["operationLogs"],
};

export function needsRecords(active, module) {
  return (moduleDependencies[active] || []).includes(module);
}

export function workspaceHash(projectId, module = "dashboard") {
  return projectId ? `#project=${encodeURIComponent(projectId)}&module=${encodeURIComponent(module)}` : "";
}

export function parseWorkspaceHash(hash) {
  const values = new URLSearchParams(hash.replace(/^#/, ""));
  return { projectId: values.get("project"), module: values.get("module") || "dashboard" };
}
