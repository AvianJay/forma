# Forma · Components V2 連結生成器

以 React、TypeScript、Cloudflare Workers 與 D1 建立的繁體中文 Discord 連結設計器。視覺化編輯或匯入 Component Embed JSON，產生公開短連結；使用私人管理連結修改或刪除。不需要 Discord bot、Webhook 或登入。

## 本機啟動

需要 Node.js 22.12+（已使用 Node.js 24.2 測試）與 npm。

```sh
npm ci
npm run db:local
npm run dev
```

開啟 http://127.0.0.1:5173。D1 資料保存於 `.wrangler/state`，本機操作不會修改雲端資料庫。所有套件已透過 `package-lock.json` 鎖定。

## 功能

- 文字與 Markdown、Section 搭配縮圖或連結按鈕、媒體相簿、分隔線、按鈕列、Container 色彩與 Spoiler。
- 元件複製、刪除、上下排序、即時 Discord 模擬預覽、手機編輯／預覽頁籤。
- JSON 即時驗證、匯入／匯出。草稿保存在目前瀏覽器；未完成的 JSON 會保留，重新載入後可繼續修正。
- 10 字元隨機短碼、永久有效（直到刪除）、公開展示頁、獨立的私人管理連結。
- 首頁本身也有 Components V2 與 Open Graph 預覽，直接把首頁網址貼到 Discord 就能介紹網站。
- 縮圖、相簿和 Open Graph 封面內的 Discord CDN 網址會自動變成：

```text
https://dccdngen.avianjay.sbs/https://cdn.discordapp.com/attachments/…?ex=…&is=…&hm=…
```

以 hostname 精確辨識 `cdn.discordapp.com`、`media.discordapp.net`、`cdn.discordapp.net`、`cdn.discord.com`、`images-ext-N.discordapp.net`。保留原始查詢參數且不重複加入前綴。一般媒體網址及按鈕目的網址維持原樣。轉換後仍受媒體網址 2,048 字元上限約束。Worker 不代理抓取媒體，該前綴服務的可用性與 Discord 存取能力需由部署者確認。

## 部署到 Cloudflare

```sh
npx wrangler login
npx wrangler d1 create cv2gen
```

本倉庫已設定正式站使用的 D1 ID。若部署到自己的 Cloudflare 帳戶，將建立結果的 `database_id` 填入 `wrangler.jsonc` 的 `d1_databases[0].database_id`，並調整 Worker 名稱。確認 `ratelimits[0].namespace_id` 未被帳戶內其他無關專案使用（共用 ID 會共用計數）。再執行：

```sh
npm run db:remote
npm run deploy
```

目前 Worker 名稱為 `forma`，正式站為 https://cv2.avianjay.sbs/ 。部署者亦可使用 `forma.<你的帳戶子網域>.workers.dev`。自訂網域在 Cloudflare 管理，不由這份設定覆寫。若使用 CI，讓 Wrangler 從執行環境取得 `CLOUDFLARE_API_TOKEN` 與 `CLOUDFLARE_ACCOUNT_ID`，不要把密鑰寫進程式碼或輸出到日誌。

建議先套用 migration，再發布 Worker。若只透過 Workers Builds 綁定空的 D1 並部署，首次存取時會在確定缺少 `links` 表後，以同一份初始 SQL 安全建立資料表並重試；既有表與資料不會被覆寫。初始 migration 使用 `IF NOT EXISTS`，之後補跑 `npm run db:remote` 亦不會衝突。其他資料庫錯誤不會觸發建表；後續結構變更仍須加入新的 migration。

前端資產經 Static Assets 提供，`/`、`/index.html`、`/api/*` 與 `/s/*` 明確先經 Worker。首頁保留完整編輯器資產，並在回傳的 HTML 中加入 CV2 與 Open Graph；不需 JavaScript、User-Agent 判斷或 D1 即可供 Discord 讀取。如需測試正式產物，可執行 `npm run build` 後使用 `npm run preview`。

## HTTP API

所有 API 與公開短連結頁面回傳 `Cache-Control: no-store`。寫入只接受同源瀏覽器請求（無 Origin 的 API client 亦可），並以 Workers Rate Limiting binding 限制每 IP 每 60 秒 10 次操作；Cloudflare 計數為每位置的最佳努力限流，並非全球嚴格配額。公開讀取不套用寫入限流。

| 方法與路徑 | 說明 |
|---|---|
| `POST /api/links` | 建立，回傳 `id`、`url`、`manageUrl`、`createdAt` |
| `GET /api/links/:id` | 公開讀取 `id`、`design`、`createdAt`、`updatedAt` |
| `PUT /api/links/:id` | 以 `Authorization: Bearer <管理密鑰>` 完整更新 |
| `DELETE /api/links/:id` | 驗證管理密鑰後刪除，回傳 204 |
| `GET /s/:id` | 伺服器渲染展示頁、Discord JSON 與 Open Graph |

建立與更新 body（`Content-Type: application/json`）：

```json
{
  "schemaVersion": 1,
  "title": "我的分享",
  "description": "一個新的開始",
  "image": "",
  "component": {
    "type": 17,
    "accent_color": 12513892,
    "components": [
      { "type": 10, "content": "## Hello Discord\n歡迎來到我的頁面！" }
    ]
  }
}
```

JSON 編輯器與匯出檔案只包含 `{ "component": … }`，不含網站預覽 metadata。錯誤回應為 `{ "error": "說明", "issues": [{ "path": "欄位路徑", "message": "原因" }] }`，`issues` 僅驗證失敗時提供。常見狀態：400 格式錯誤、401 管理密鑰無效、403 跨站寫入、404 不存在、405 方法不支援、413 超過 64 KiB、429 限流（附 `Retry-After: 60`）、500 服務錯誤。缺少 D1 或限流 binding 時回傳 503 及固定的 `code`（`database_binding_missing` 或 `rate_limiter_binding_missing`），方便管理者辨識設定問題；不會略過授權或限流。

私人管理連結格式為 `/manage/:id#token=…`。256-bit 密鑰只在建立時回傳；D1 僅存 SHA-256 雜湊。URL fragment 不會送至伺服器，管理操作改用 Authorization header。公開 API、HTML 與日誌均不含密鑰。持有管理連結就能修改／刪除；遺失後沒有找回機制。管理模式的未發布修改不寫入本機草稿，离開頁面時會提示。

## Discord 相容性

依據 Discord `anthony/embed-unfurl-components` 分支，查核日 **2026-09-18**，commit **20b7c0d2a7c30fd455d3e8f6e58c8ab42eeb2849**：

- [Component Embeds 規格](https://github.com/discord/discord-api-docs/blob/20b7c0d2a7c30fd455d3e8f6e58c8ab42eeb2849/developers/link-previews/component-embeds.mdx)
- [元件欄位與巢狀規則](https://github.com/discord/discord-api-docs/blob/20b7c0d2a7c30fd455d3e8f6e58c8ab42eeb2849/developers/components/reference.mdx)

HTML 內直接輸出 `<script id="discord:component-embed" type="application/json">`；不使用需要額外抓取的 linked JSON，也不把其 3,000-byte 限制誤套用到 inline payload。本站另限制完整請求 64 KiB、單段文字 4,000 字元。最多 40 個元件包括根 Container、Action Row、按鈕、Section 及其 accessory，不把 gallery item 當元件計算。

只支援連結預覽的唯讀子集；按鈕必須為 `style: 5`，拒絕 `id`、`custom_id`、`sku_id` 等欄位。檔案、選單、巢狀 Container 不合法。前後端共用嚴格驗證。Markdown 不執行 HTML，JSON script 與 meta 內容經安全跳脫。Spoiler 使用可鍵盤操作的隱藏內容；影片不自動播放。瀏覽器預覽不是 Discord 官方 renderer，部分排版、emoji 與 Markdown 可能有差異。

對短連結的更新會立即反映在網站。Discord 自己的快取無法由本站強制更新，也不保證既有訊息立即刷新。實際 Discord 展開仍取決於這項新規格的支援狀態。

部署後驗收：

1. 在公開 HTTPS 網站建立一個連結，以 `Discordbot/2.0` User-Agent 請求，確認 200、JSON script 與 Open Graph tags。
2. 以關閉 JavaScript 的瀏覽器檢查展示頁仍有完整內容。
3. 確認 Cloudflare WAF／Bot Challenge 未阻擋公開短連結與媒體。Discord 整體抓取（含媒體）需於文件所述 10 秒內完成。
4. 將公開短連結貼到 Discord，確認元件外觀、媒體與按鈕，再測試管理頁更新及刪除。

## 驗證

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run check` 執行型別檢查、單元／D1 整合測試與正式建置。API 測試使用 Miniflare 真正的本機 D1；透過當前套件提供的 `convertV4MiniflareOptions` 相容函式建立測試環境。瀏覽器測試自動準備本機 D1 並啟動網站（已有本機服務時會重用），覆蓋編輯、JSON、CDN 轉換、草稿、發布、無 JavaScript 展示、複製、管理下載、更新、刪除與手機頁籤。測試不記錄含管理密鑰的 trace、影片或截圖。

## 主要程式

- `src/shared`：共用資料驗證、Discord CDN 正規化、預覽 renderer 與樣式。
- `src/client`：視覺／JSON 編輯器、發布與管理 UI。
- `src/worker`：API、D1、管理授權與公開 HTML。
- `migrations`、`tests`：資料庫版本與測試。

第一版無登入、檔案上傳、自訂短碼、到期時間或訪問統計。無遠端媒體代理、站點爬蟲或自動發送 Discord 訊息。
