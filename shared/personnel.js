export const personnelStatuses = ["在職", "支援", "已離場"];

function text(value, label, max = 200, required = false) {
  if (value != null && typeof value !== "string") throw new Error(`${label}格式不正確`);
  const result = (value || "").trim();
  if (required && !result) throw new Error(`請填寫${label}`);
  if (result.length > max) throw new Error(`${label}最多 ${max} 字`);
  return result;
}

function date(value, label) {
  const result = text(value, label, 10);
  if (!result) return "";
  const parsed = new Date(`${result}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result) throw new Error(`${label}格式不正確`);
  return result;
}

export function normalizePersonnel(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("人員資料格式不正確");
  const name = text(input.name, "姓名", 100, true);
  const jobTitle = text(input.jobTitle, "管理職位", 100, true);
  const organization = text(input.organization, "所屬單位", 200, true);
  const experience = input.experienceYears;
  const experienceYears = experience == null || (typeof experience === "string" && !experience.trim()) ? "" : Number(experience);
  if (experienceYears !== "" && (!["string", "number"].includes(typeof experience) || !Number.isFinite(experienceYears) || experienceYears < 0 || experienceYears > 100)) throw new Error("相關工作年資請填寫 0 至 100 年，可填小數");
  const status = input.status || "在職";
  if (!personnelStatuses.includes(status)) throw new Error("請選擇有效的人員狀態");
  const startDate = date(input.startDate, "到任日期");
  const endDate = date(input.endDate, "離場日期");
  if (startDate && endDate && endDate < startDate) throw new Error("離場日期不可早於到任日期");
  if (input.certificates != null && !Array.isArray(input.certificates)) throw new Error("證照資料格式不正確");
  if ((input.certificates || []).length > 50) throw new Error("每位人員最多登錄 50 張證照");
  const certificates = (input.certificates || []).map((certificate) => {
    if (!certificate || typeof certificate !== "object" || Array.isArray(certificate)) throw new Error("證照資料格式不正確");
    return {
      name: text(certificate.name, "證照名稱", 200, true),
      issuer: text(certificate.issuer, "發證單位"),
      number: text(certificate.number, "證照字號"),
      expiresAt: date(certificate.expiresAt, "證照到期日"),
    };
  });
  const email = text(input.email, "電子郵件", 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("電子郵件格式不正確");
  return {
    ...input, name, jobTitle, organization, experienceYears, status, startDate, endDate, certificates, email,
    phone: text(input.phone, "聯絡電話", 100),
    workSummary: text(input.workSummary, "工作概要", 4000),
    expertise: text(input.expertise, "專長", 2000),
    note: text(input.note, "備註", 4000),
  };
}
