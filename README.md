# EZtoDO 工程管理 React 原型

這是一個以 Vite、React、Tailwind CSS、framer-motion、lucide-react 整理出的可執行前端專案。

## 施工日報與常用設定

- 施工工班、材料、機具設備可在「常用設定」新增、編輯、停用與排序。
- 常用項目也可永久刪除；執行前會提示既有施工日報的引用風險，日常整理建議優先使用停用。
- 施工日報下拉選單只顯示啟用項目，並可直接「新增至常用設定」後套用。
- 每筆施工、材料、機具紀錄下方皆可就地新增下一筆，不必捲回區塊頂端。
- Dashboard 會依統計分類與同義詞合併累計，並顯示資料來源的施工日報筆數。
- 待辦事項與工項 Memo 月曆可切換月／週檢視；月檢視固定格高並以「+N」收合，週檢視顯示較完整內容。
- Memo 可設定工班／工種的進場起訖日期與時間，區間內每天聯動首頁及工地行事曆，Apple 訂閱保留完整起訖時間。
- 待辦可選擇完成期限或無期限；無期限保留在清單，不加入行事曆、不發到期提醒。
- 新版 Memo／待辦可選擇提前多久提醒、自訂分鐘或不提醒，並預覽台灣時間的實際提醒日期。站內通知在提前時間到達後出現，超過原定進場／截止時間 2 小時後移出。已完成項目不提醒。
- Apple 訂閱沿用提前提醒設定；需裝置允許通知，且抓取有延遲。不另寄郵件／簡訊。既有紀錄未編輯前維持原提醒規則，編輯後改用明確的提前時間。
- 通知中心會跨案場彙整，並在每則訊息標示所屬工地。
- 登入頁支援忘記密碼；輸入 Email 後會寄送一次性重設認證信，並以 CD 時間避免重複發送。

## 公司群組與權限階級

- 最高權限管理員從「系統管理 → 帳號列表」新增公司群組，再於帳號卡片分派群組與階級；只有即時資料庫確認為全系統管理員的帳號能呼叫管理 API。
- 群組使用固定 ID，名稱可修改；每組有獨立階級，預設管理／編輯／閱覽三級，可自訂名稱、排序與閱覽、編輯、工地管理上限。高階包含低階權限；既有階級不刪除，避免失去參照。相同名稱群組不可重複建立，並以版本號避免覆寫別人的變更。
- 實際存取取帳號開關、群組階級、工地成員及文件權限的交集。群組主管不是系統管理員，不能自行升權；權限變更於後續 API 請求讀取資料庫後生效。已顯示或下載的內容不能回收。
- 這是帳號分組及權限上限，不是完整多租戶隔離；不自動分享、搬移工地或撤銷既有成員資格。員工跨公司轉組時須另行核對工地成員；既有跨公司邀請仍有效。最高權限管理員維持跨群組管理能力。
- 未分組及既有 `organization_name` 文字標籤帳號保留既有權限；移出群組會恢復帳號原有開關，操作前有確認提示。群組的閱覽限制不會覆寫帳號原本的編輯開關。
- 資料庫採新增 `account_groups` 表與 `users.group_id/group_role_id` 欄位的非破壞性遷移；不自動將舊測試單位轉成公司、不調整既有帳號權限。

## 廠商請款與追加減

- 工程合約及請款表單內可登錄合約追加減；保留原約金額，僅已核准追加減計入調整後合約額。追加減有獨立儲存按鈕，不隨每期請款重複加計。
- 每期明細區分工程、點工、材料、機具與其他費用；每列另外選擇原約內、已核准追加或約外另計，並可記錄日期與點工單／送貨單／發票編號。
- 點工以人日或人時計量；採數量×單價或直接金額兩種明確模式，修改數量後不沿用舊的小計。
- 合約餘額扣除前期及本期合約內請款總額，約外費用計入應付但不占合約。超出原約、追加單或調整後總額會提示核對，不代替實際核准程序。
- 保留款、清潔費、保險費及其他扣回獨立列示；扣款超過本期總額會拒絕儲存並保留內容。金額保留至小數兩位，不自動加稅，使用者需採一致的含稅／未稅口徑。
- 已儲存請款保留當次合約額快照；舊版未分類請款暫計為原約內，編輯時可補充分類。既有已核准追加減變更時，應一併核對先前請款。

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
PASSWORD_RESET_TOKEN_MINUTES=30
PASSWORD_RESET_COOLDOWN_SECONDS=120
RESEND_API_KEY=
EMAIL_FROM=EZtoDO工程管理程式 <noreply@example.com>
APP_ORIGIN=https://your-production-domain.vercel.app
BLOB_READ_WRITE_TOKEN=
```

`DATABASE_URL` 可來自 Vercel Marketplace 的 Postgres 服務，例如 Neon、Supabase 或其他 PostgreSQL provider。部分 provider 也會注入 `POSTGRES_URL`，程式會同時支援 `DATABASE_URL` 與 `POSTGRES_URL`。

`OPENAI_API_KEY` 用於施工日報的紙本照片 AI 判讀；未設定時，其他功能仍可正常使用，只是 AI 判讀按鈕會回報尚未設定。

`BLOB_READ_WRITE_TOKEN` 由 Vercel Blob Store 自動建立。設定後，工地與各模組的圖片附件會上傳到 Blob，不再保存重新整理後即失效的瀏覽器暫存網址。單張圖片上限為 4MB。

`EMAIL_VERIFICATION_REQUIRED=true` 會啟用信箱驗證；一般帳號註冊後必須點擊驗證信才能登入。正式上線建議保持 `true`，並先設定 `RESEND_API_KEY`、`EMAIL_FROM` 與正式網址 `APP_ORIGIN`。

忘記密碼功能同樣使用 `RESEND_API_KEY`、`EMAIL_FROM` 與 `APP_ORIGIN`。`PASSWORD_RESET_TOKEN_MINUTES` 控制重設連結有效時間，`PASSWORD_RESET_COOLDOWN_SECONDS` 控制同一 Email 重複寄送的等待秒數。

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
- `POST /api/auth/request-password-reset`
- `POST /api/auth/reset-password`
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
