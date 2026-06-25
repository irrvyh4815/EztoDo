# EZtoDO 資料庫與 API 對接筆記

這份文件描述目前專案整理好的資料模型。前端表單先用本機暫存，正式部署時可逐步改成呼叫這裡的 API。

## 核心資料表

### `users`

帳號資料與登入驗證。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | `text` | 使用者 ID |
| `email` | `text` | 登入帳號，唯一 |
| `name` | `text` | 使用者暱稱 / 顯示名稱 |
| `member_no` | `text` | 會員編號，例如 `2600001` |
| `organization_name` | `text` | 所屬單位 / 分組名稱 |
| `password_hash` | `text` | bcrypt hash 後的密碼 |
| `role` | `text` | `admin` 或 `member` |
| `can_view` | `boolean` | 是否可閱覽資料 |
| `can_edit` | `boolean` | 是否可新增、修改、刪除資料 |
| `email_verified` | `boolean` | 信箱是否完成驗證 |
| `email_verified_at` | `timestamptz` | 信箱完成驗證時間 |
| `email_verification_token_hash` | `text` | 驗證 token 的 SHA-256 hash |
| `email_verification_expires_at` | `timestamptz` | 驗證連結失效時間 |
| `email_verification_sent_at` | `timestamptz` | 最近一次寄送驗證信時間 |
| `last_login_at` | `timestamptz` | 最近一次成功登入時間 |
| `created_at` | `timestamptz` | 建立時間 |

`admin` 永遠視為最高權限，後端會強制 `can_view = true`、`can_edit = true`，且不可透過權限管理降權或刪除。`member` 才會依照 `can_view` / `can_edit` 控制閱覽與編輯；若 `can_view = false`，後端也會一併關閉 `can_edit`。

若 `EMAIL_VERIFICATION_REQUIRED=true`，一般帳號必須先完成信箱驗證才可登入；管理員帳號預設視為已驗證，避免公開上線時被鎖在系統外。

會員編號格式為「年份後兩碼 + 五位序號」，例如 `2600001` 代表 2026 年第 1 筆帳號。既有帳號會在資料庫初始化時自動補上會員編號，最高管理員預設為 `2600001`。

### `projects`

工地主檔。

| 欄位 | 型別 | 前端欄位 |
| --- | --- | --- |
| `id` | `text` | `project.id` |
| `name` | `text` | 工地名稱 |
| `owner` | `text` | 業主 / 客戶 |
| `status` | `text` | `籌備中`、`進行中`、`收尾中`、`暫停`、`結案` |
| `address` | `text` | 工地地址 |
| `defects` | `integer` | 缺失數 |
| `daily_photos` | `integer` | 照片數 |
| `next_claim` | `text` | 請款期 |
| `start_date` | `text` | 開工日期 |
| `end_date` | `text` | 預計完工日期 |
| `manager` | `text` | 工地主任 |
| `note` | `text` | 備註 |
| `owner_id` | `text` | 工地建立者 / 擁有者 `users.id` |
| `created_by` | `text` | 建立此工地的帳號 `users.id` |
| `created_at` | `timestamptz` | 建立時間 |

### `project_members`

工地成員與多客戶隔離權限。一般使用者只能讀取自己建立或被加入的工地。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `project_id` | `text` | 對應 `projects.id` |
| `user_id` | `text` | 對應 `users.id` |
| `member_role` | `text` | `owner`、`manager`、`editor`、`viewer` |
| `can_view` | `boolean` | 是否可查看此工地 |
| `can_edit` | `boolean` | 是否可編輯此工地資料 |
| `can_view_claims` | `boolean` | 是否可閱覽請款相關文件 |
| `can_view_contracts` | `boolean` | 是否可閱覽合約相關文件 |
| `job_title` | `text` | 該成員在此工地的職務名稱 |
| `created_by` | `text` | 邀請人 `users.id` |
| `created_at` | `timestamptz` | 加入時間 |

建立工地時，建立者會自動成為 `owner`。`manager` 可作為共同管理者管理成員與編輯資料；`editor` 可編輯資料但不能管理成員；`viewer` 只能閱覽。工地建立者可替受邀成員設定該工地的職務名稱，並可獨立控制請款與合約文件閱覽權限。

### `project_records`

工地內所有分項表單統一存這張表。這是為了先讓資料能快速落庫，等流程穩定後再決定是否拆成專表。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | `text` | 紀錄 ID |
| `project_id` | `text` | 對應 `projects.id` |
| `module` | `text` | 模組代號，例如 `claims`、`memos`、`defects` |
| `title` | `text` | 卡片標題 / 搜尋用標題 |
| `status` | `text` | 狀態 |
| `payload` | `jsonb` | 該模組自己的表單欄位 |
| `attachments` | `jsonb` | 圖片附件 metadata |
| `created_by` | `text` | 建立者 `users.id` |
| `created_at` | `timestamptz` | 建立時間 |
| `updated_at` | `timestamptz` | 更新時間 |

## 模組代號建議

| 模組 | `module` |
| --- | --- |
| 工程合約 | `contracts` |
| 廠商請款 | `claims` |
| 工項 Memo | `memos` |
| 階段檢核表 | `checklists` |
| 預定進度 | `schedule` |
| 會議紀錄 | `meetings` |
| 施工日報 | `daily` |
| 常用設定 | `commonSettings` |
| 缺失改善 | `defects` |
| 材料庫存 | `materials` |
| 待辦事項 | `todos` |
| 照片中心 | `photos` |
| 重要公告 | `announcements` |
| 操作紀錄 | `operationLogs` |

`operationLogs` 由系統自動寫入，不建議開放使用者手動新增。新增、編輯、刪除表單資料時，payload 會保存 `action`、`targetModule`、`targetTitle`、`message`、`createdAt` 等欄位，供日後稽核追蹤。

圖片上傳接口 `/api/uploads` 已串接 Vercel Blob。部署時建立 Blob Store 並設定
`BLOB_READ_WRITE_TOKEN` 後，JPG、PNG、WebP 圖片會取得可長期保存的公開 URL；
單張圖片限制為 4MB。施工日報 AI 判讀接口為 `/api/ai/daily-report`。

## 通用紀錄 payload 範例

### 廠商請款

```json
{
  "module": "claims",
  "title": "宏鑫水電 第 1 期",
  "status": "待付款",
  "payload": {
    "period": "第 1 期",
    "month": "2026/05",
    "trade": "水電工程",
    "vendor": "宏鑫水電",
    "contract": "水電配管工程",
    "amount": 185000
  },
  "attachments": []
}
```

### 工程合約

```json
{
  "module": "contracts",
  "title": "水電配管工程",
  "status": "執行中",
  "payload": {
    "name": "水電配管工程",
    "vendor": "宏鑫水電",
    "trade": "水電工程",
    "amount": 1200000,
    "contact": "張先生",
    "phone": "04-2222-1688",
    "email": "service@hongxin.example",
    "address": "台中市東區進德路 88 號",
    "note": "現場窗口負責配管與弱電協調。"
  },
  "attachments": []
}
```

總覽的「廠商資訊」會讀取 `contracts` 模組中的 `vendor`、`contact`、`phone`、`email` 等欄位，作為快速查找聯絡資訊的來源。

### 工項 Memo

```json
{
  "module": "memos",
  "title": "2F 管線路徑待確認",
  "status": "待確認",
  "payload": {
    "trade": "水電工程",
    "date": "2026-05-26",
    "time": "14:30",
    "note": "廚房排水與弱電箱位置需與業主確認後再封板。"
  },
  "attachments": []
}
```

總覽月曆會使用 `memos` 的 `payload.date` 顯示工項 Memo，並與待辦事項一起呈現。Memo 與待辦通知會依 `date` + `time` 計算，設定時間超過 2 小時後自動從通知中心移除；舊資料沒有 `time` 時以當日 `23:59` 計算。

### 缺失改善

```json
{
  "module": "defects",
  "title": "3F 主臥浴室 防水",
  "status": "待改善",
  "payload": {
    "location": "3F 主臥浴室",
    "type": "防水",
    "vendor": "永信防水",
    "due": "2026-05-25",
    "level": "重大"
  },
  "attachments": []
}
```

### 施工日報

```json
{
  "module": "daily",
  "title": "2026-05-24 施工日報",
  "status": "已暫存",
  "payload": {
    "date": "2026-05-24",
    "weather": "晴",
    "weatherNote": "",
    "work": [
      {
        "commonSettingId": "crew-masonry",
        "trade": "泥作工班",
        "statisticsCategory": "泥作工班",
        "workers": 6,
        "description": "3F 砌磚",
        "note": ""
      }
    ],
    "materials": [
      {
        "commonSettingId": "material-cement",
        "name": "水泥",
        "statisticsCategory": "水泥",
        "spec": "卜特蘭一型",
        "quantity": 40,
        "unit": "包",
        "note": ""
      }
    ],
    "equipment": [
      {
        "commonSettingId": "equipment-excavator",
        "name": "挖土機",
        "statisticsCategory": "挖土機",
        "specification": "120 型",
        "quantity": 1,
        "unit": "台班",
        "note": ""
      }
    ],
    "aiSource": {
      "name": "daily-report.jpg",
      "url": "https://blob-store.example/projects/project-id/daily-source/file.jpg"
    }
  },
  "attachments": [
    {
      "kind": "site-photo",
      "name": "施工照.jpg",
      "url": "https://blob-store.example/projects/project-id/daily/2026-05-24/photo.jpg"
    }
  ]
}
```

紙本日報 AI 判讀建議先呼叫 `POST /api/ai/daily-report` 取得結構化結果，再讓使用者確認欄位內容，最後才用 `project_records` 寫入正式施工日報。目前紙本日報圖片限制 3MB 以下，現場施工照每份日報最多 10 張；圖片本體保存於 Vercel Blob，Postgres 只保存檔案 metadata 與 URL。

### 常用設定

每個工地保存一筆 `commonSettings` 紀錄。`aliases` 預留給人工輸入與未來 AI 匯入的同義詞映射；施工日報保存 `commonSettingId` 與 `statisticsCategory`，Dashboard 可優先依穩定 ID 或統計分類歸類。

```json
{
  "module": "commonSettings",
  "title": "常用設定",
  "status": "啟用中",
  "payload": {
    "crews": [
      {
        "id": "crew-masonry",
        "name": "泥作工班",
        "sortOrder": 10,
        "isActive": true,
        "statisticsCategory": "泥作工班",
        "aliases": ["泥作", "泥作工", "泥作班"]
      }
    ],
    "materials": [
      {
        "id": "material-cement",
        "name": "水泥",
        "unit": "包",
        "sortOrder": 10,
        "isActive": true,
        "statisticsCategory": "水泥",
        "aliases": ["卜特蘭水泥"]
      }
    ],
    "equipment": [
      {
        "id": "equipment-excavator",
        "name": "挖土機",
        "unit": "台班",
        "specification": "120 型",
        "sortOrder": 10,
        "isActive": true,
        "statisticsCategory": "挖土機",
        "aliases": ["怪手", "120怪手"]
      }
    ]
  },
  "attachments": []
}
```

### 會議紀錄

```json
{
  "module": "meetings",
  "title": "2026-05-26 第 5 次承攬商會議",
  "status": "承攬商會議",
  "payload": {
    "meetingType": "承攬商會議",
    "title": "第 5 次承攬商會議",
    "date": "2026-05-26",
    "location": "工務所會議室",
    "chair": "王主任",
    "recorder": "李工程師",
    "attendees": [
      {
        "name": "陳先生",
        "company": "宏鑫水電",
        "role": "承攬商窗口",
        "note": ""
      }
    ],
    "items": [
      {
        "topic": "2F 管線協調",
        "content": "確認管線路徑與封板時程。",
        "decision": "5/30 前完成套管確認。",
        "owner": "宏鑫水電",
        "dueDate": "2026-05-30",
        "note": ""
      }
    ],
    "note": "下次會議追蹤 2F 施工進度。"
  },
  "attachments": []
}
```

會議紀錄目前支援工具箱會議、承攬商會議、工務會議與協議組織會議。前端可依日期區間產生 PDF 匯出，並可選擇是否包含附件圖片。

### 預定進度

```json
{
  "module": "schedule",
  "title": "3F 防水完成",
  "status": "進行中",
  "payload": {
    "trade": "防水工班",
    "startDate": "2026-05-01",
    "endDate": "2026-05-10",
    "percent": 65,
    "note": "等試水完成後複驗"
  },
  "attachments": []
}
```

甘特圖會使用 `payload.trade` 作為 Y 軸工種列，並用 `payload.startDate` / `payload.endDate` 轉成 X 軸的工作天與日期。前端儲存預定進度表單後，會以同一份資料立即更新圖表。

## 圖片附件格式

目前前端使用 `blob:` 暫存網址，只能本機預覽。正式接資料庫時，圖片本體不要存進 Postgres，建議上傳到 Vercel Blob、S3、Supabase Storage 等物件儲存，再把 metadata 存進 `attachments`。

建議格式：

```json
[
  {
    "id": "uuid",
    "name": "3f-bathroom.jpg",
    "size": 245760,
    "mimeType": "image/jpeg",
    "url": "https://storage.example.com/3f-bathroom.jpg"
  }
]
```

## API

### 註冊帳號

`POST /api/auth/register`

```json
{
  "name": "Renault",
  "organizationName": "測試分組1",
  "email": "renault@example.com",
  "password": "至少 8 碼"
}
```

若已啟用 `EMAIL_VERIFICATION_REQUIRED=true`，註冊成功後系統會寄送驗證信，並回傳：

```json
{
  "emailVerificationRequired": true,
  "verificationEmailSent": true
}
```

### 信箱驗證

`GET /api/auth/verify-email?token=...`

使用者點擊驗證信中的連結後，後端會驗證 token、標記 `email_verified = true`，並顯示回登入頁按鈕。

`POST /api/auth/resend-verification`

```json
{
  "email": "site-manager@example.com"
}
```

登入頁與帳號管理都可用此 API 重寄驗證信。

### 登入

`POST /api/auth/login`

```json
{
  "email": "admin@eztodo.local",
  "password": "Admin@123456"
}
```

成功後會設定 HTTP-only cookie。

### 修改目前帳號密碼

需登入。

`POST /api/auth/password`

```json
{
  "currentPassword": "目前密碼",
  "newPassword": "至少 8 碼的新密碼"
}
```

### 帳號與權限管理

需管理員登入。

`GET /api/users`

回傳所有註冊帳號，僅系統管理員可使用。每筆帳號會包含：

```json
{
  "id": "user-id",
  "email": "site-manager@example.com",
  "name": "王主任",
  "memberNumber": "2600002",
  "organizationName": "測試分組1",
  "role": "member",
  "canView": true,
  "canEdit": false,
  "emailVerified": true,
  "createdProjectCount": 2,
  "lastLoginAt": "2026-05-25T10:30:00.000Z",
  "createdAt": "2026-05-24T08:00:00.000Z"
}
```

`POST /api/users`

```json
{
  "name": "王主任",
  "organizationName": "測試分組1",
  "email": "site-manager@example.com",
  "password": "至少 8 碼",
  "role": "member",
  "canView": true,
  "canEdit": false
}
```

更新權限：

`PATCH /api/users/:id`

```json
{
  "canView": true,
  "canEdit": true,
  "role": "member"
}
```

管理員帳號即使送出 `canView: false` 或 `canEdit: false`，後端仍會回傳最高權限。一般帳號可由管理員切換閱覽與編輯權限。

更新暱稱：

`PATCH /api/users/:id`

```json
{
  "name": "Renault"
}
```

管理員重設使用者密碼：

`PATCH /api/users/:id`

```json
{
  "password": "至少 8 碼的新密碼"
}
```

刪除帳號：

`DELETE /api/users/:id`

### 工地

`GET /api/projects`

`POST /api/projects`

`DELETE /api/projects/:projectId`

`GET /api/projects` 會依目前登入者與 `project_members` 權限回傳可操作工地。

### 工地成員

需具備該工地的 `owner`、`manager` 或系統管理員權限。

`GET /api/projects/:projectId/members`

`POST /api/projects/:projectId/members`

```json
{
  "email": "partner@example.com",
  "role": "manager",
  "jobTitle": "工地主任"
}
```

更新成員角色：

`PATCH /api/projects/:projectId/members/:userId`

```json
{
  "role": "editor",
  "jobTitle": "現場工程師"
}
```

移除成員：

`DELETE /api/projects/:projectId/members/:userId`

`owner` 不能被移除；若要轉移擁有權，後續應另做專門的 owner transfer 流程。

### 工地內表單資料

查詢某工地全部紀錄：

`GET /api/projects/:projectId/records`

查詢某工地特定模組：

`GET /api/projects/:projectId/records?module=defects`

新增紀錄：

`POST /api/projects/:projectId/records`

```json
{
  "module": "defects",
  "title": "3F 主臥浴室 防水",
  "status": "待改善",
  "payload": {
    "location": "3F 主臥浴室",
    "type": "防水"
  },
  "attachments": []
}
```

更新紀錄：

`PATCH /api/projects/:projectId/records/:recordId`

```json
{
  "title": "屋頂防水驗收",
  "status": "未完成",
  "payload": {
    "stage": "屋頂防水驗收",
    "items": ["防水試水完成"],
    "checkedItems": []
  },
  "attachments": []
}
```

刪除紀錄：

`DELETE /api/projects/:projectId/records/:recordId`

## 前端接 API 時的建議順序

1. 帳號註冊/登入：把本機預覽模式關閉，讓 `/api/auth/me` 成為進入系統的依據。
2. 工地主檔：`ProjectSelect` 改為完全讀寫 `/api/projects`。
3. 單一模組先接：建議先接 `defects`，因為欄位最明確。
4. 其他模組逐步改為 `project_records`。
5. 圖片附件最後接物件儲存，再把檔案 URL 寫回 `attachments`。
