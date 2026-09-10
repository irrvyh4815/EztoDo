import { useEffect, useState } from "react";

export function confirmWorkspaceLeave() {
  const event = new Event("eztodo:before-leave", { cancelable: true });
  window.dispatchEvent(event);
  return !event.defaultPrevented;
}

export default function useDraftProtection(key, data, enabled, saving = false) {
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    if (!key) return;
    try {
      if (enabled) localStorage.setItem(key, JSON.stringify({ version: 1, data, updatedAt: Date.now() }));
      else localStorage.removeItem(key);
      setStorageError("");
    } catch { setStorageError("此瀏覽器無法暫存草稿，請勿離開頁面並儘快儲存。"); }
  }, [key, data, enabled]);

  useEffect(() => {
    if (!enabled && !saving) return;
    const beforeUnload = (event) => { event.preventDefault(); event.returnValue = ""; };
    const beforeLeave = (event) => {
      if (event.defaultPrevented) return;
      if (saving) { window.alert("資料正在儲存，請完成後再切換。"); event.preventDefault(); return; }
      if (!window.confirm(storageError
        ? "尚有未儲存資料，且草稿暫存失敗。離開將遺失內容，確定離開？"
        : "尚有未儲存資料。文字草稿已保留在此瀏覽器，未上傳的照片需重新選取。確定離開？")) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("eztodo:before-leave", beforeLeave);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("eztodo:before-leave", beforeLeave);
    };
  }, [enabled, saving, storageError]);
  return storageError;
}
