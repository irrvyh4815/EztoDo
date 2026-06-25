# EZtoDO 工程管理 React 原型

這是一個以 Vite、React、Tailwind CSS、framer-motion、lucide-react 整理出的可執行前端專案。

## 施工日報與常用設定

- 施工工班、材料、機具設備可在「常用設定」新增、編輯、停用與排序。
- 常用項目也可永久刪除；執行前會提示既有施工日報的引用風險，日常整理建議優先使用停用。
- 施工日報下拉選單只顯示啟用項目，並可直接「新增至常用設定」後套用。
- 每筆施工、材料、機具紀錄下方皆可就地新增下一筆，不必捲回區塊頂端。
- Dashboard 會依統計分類與同義詞合併累計，並顯示資料來源的施工日報筆數。
- Memo 與待辦可設定通知時間，超過設定時間 2 小時後會自動離開通知中心。

## 開發

```bash
npm install
npm run dev
```

預設開發網址：

```text
http://127.0.0.1:5173
```

本機 `npm run dev` 會自動略過登入，並使用前端暫存資料，方便快速預覽畫面。
若要連同登入、PostgreSQL、圖片上傳與其他 `/api` 一起測試：

```bash
cp .env.example .env.local
# 填妥 .env.local 後
npm run dev:api
```

如果 Windows PowerShell 擋住 `npm.ps1`，可改用：

```powershell
npm.cmd run dev
```

本專案的登入與資料庫 API 放在 `api/`，部署到 Vercel 後會以 Vercel Functions 執行。若要在本機完整測試 `/api`，請使用 Vercel CLI：

```bash
vercel dev
```

## 上線前檢查

```bash
npm ci
npm run check
```

專案也包含 GitHub Actions，所有推送與 Pull Request 都會自動執行測試與正式建置。

## 建置

```bash
npm run build
```

## 部署到 Vercel

建議用 GitHub 連接 Vercel，不需要上傳壓縮檔。

1. 先確認本機可以建置：

```bash
npm run build
```

2. 將專案推送到 GitHub：

```powershell
cd "D:\Documents\EZtoDO工程管理"
git status --short
git add .gitignore .env.example README.md package.json package-lock.json index.html vite.config.js tailwind.config.js postcss.config.js src api docs
git commit -m "Prepare EZtoDO for Vercel deployment"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPO.git
git push -u origin main
```

如果已經設定過 GitHub remote，改用：

```powershell
git remote set-url origin https://github.com/YOUR_ACCOUNT/YOUR_REPO.git
git push -u origin main
```

3. 到 Vercel 選擇 Add New Project，Import Git Repository，選取剛剛的 GitHub repo。

4. Vercel 專案設定：

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

5. 在 Vercel 的 Environment Variables 填入下方資料庫與登入設定，再 Deploy。

## Vercel 環境變數

在 Vercel 專案的 Environment Variables 設定以下變數：

```text
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
AUTH_SECRET=一串很長的隨機字串
ADMIN_EMAIL=admin@eztodo.local
ADMIN_PASSWORD=Admin@123456
ADMIN_NAME=系統管理員
SESSION_DAYS=7
OPENAI_API_KEY=
OPENAI_DAILY_REPORT_MODEL=gpt-5.4-mini
EMAIL_VERIFICATION_REQUIRED=true
EMAIL_VERIFICATION_DAYS=2
RESEND_API_KEY=
EMAIL_FROM=EZtoDO工程管理程式 <noreply@example.com>
APP_ORIGIN=https://your-production-domain.vercel.app
BLOB_READ_WRITE_TOKEN=
```

`DATABASE_URL` 可來自 Vercel Marketplace 的 Postgres 服務，例如 Neon、Supabase 或其他 PostgreSQL provider。部分 provider 也會注入 `POSTGRES_URL`，程式會同時支援 `DATABASE_URL` 與 `POSTGRES_URL`。

`OPENAI_API_KEY` 用於施工日報的紙本照片 AI 判讀；未設定時，其他功能仍可正常使用，只是 AI 判讀按鈕會回報尚未設定。

`BLOB_READ_WRITE_TOKEN` 由 Vercel Blob Store 自動建立。設定後，工地與各模組的圖片附件會上傳到 Blob，不再保存重新整理後即失效的瀏覽器暫存網址。單張圖片上限為 4MB。

`EMAIL_VERIFICATION_REQUIRED=true` 會啟用信箱驗證；一般帳號註冊後必須點擊驗證信才能登入。正式上線建議保持 `true`，並先設定 `RESEND_API_KEY`、`EMAIL_FROM` 與正式網址 `APP_ORIGIN`。

第一次登入時，系統會自動建立資料表，並建立預設管理員。

預設管理員：

```text
帳號：admin@eztodo.local
密碼：Admin@123456
```

正式上線前請務必在 Vercel 將 `ADMIN_PASSWORD` 改成自己的強密碼，並使用新的 `AUTH_SECRET`。

## 資料庫對接

資料表、API payload、圖片附件 metadata 與接 API 順序整理在：

[docs/DATABASE.md](docs/DATABASE.md)

目前後端提供：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/password`
- `GET /api/auth/verify-email`
- `POST /api/auth/resend-verification`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/projects`
- `POST /api/projects`
- `DELETE /api/projects/:projectId`
- `GET /api/projects/:projectId/members`
- `POST /api/projects/:projectId/members`
- `PATCH /api/projects/:projectId/members/:userId`
- `DELETE /api/projects/:projectId/members/:userId`
- `GET /api/projects`
- `POST /api/projects`
- `DELETE /api/projects/:projectId`
- `GET /api/projects/:projectId/records`
- `POST /api/projects/:projectId/records`
- `PATCH /api/projects/:projectId/records/:recordId`
- `DELETE /api/projects/:projectId/records/:recordId`
- `GET /api/uploads`
- `POST /api/uploads`

各分項表單建議先統一存進 `project_records`，用 `module` 區分資料來源，用 `payload` 存欄位資料，用 `attachments` 存圖片 URL metadata。

`/api/uploads` 已串接 Vercel Blob；未設定 `BLOB_READ_WRITE_TOKEN` 時會明確回報尚未完成設定。施工日報 AI 判讀接口為 `/api/ai/daily-report`，未設定 `OPENAI_API_KEY` 時會回報尚未設定。
