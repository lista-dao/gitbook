# 合約地址 → GitBook 自動同步：SSOT 規格與維護 SOP

> 給合約團隊 + Docs/PM 對齊用的內部文件。**不會發佈到 GitBook**（未列入 `SUMMARY.md`）。
> 目標：合約團隊只在「一個地方」維護地址，GitBook 的 `for-developer/**/smart-contract*.md` 自動跟著更新，不再手抄。

---

## 0. TL;DR

- **唯一真實來源 (SSOT)** = 一個 Notion **資料庫**「Lista Contracts — GitBook SSOT」。
- 合約團隊**每次部署**就在這個 DB 新增/更新一列；**GitBook 不要手改**（手改會被下次同步覆蓋）。
- 系統每週（或部署後即時）把 DB 同步成各 GitBook 合約頁，**開一個 PR** 給 Docs/PM review 後 merge。
- 沿用現有機制與 secret（`NOTION_TOKEN`），不新增基礎設施。

---

## 1. 背景：現在的問題

`for-developer/` 底下有 14 個合約地址頁（BSC core / brokers / smart-lending / oracles / credit、Ethereum、RWA、CDP、各產品…），目前**全靠人手從 Notion 抄到 GitBook**。結果已經對不上，例如（2026-06-23 實測）Notion 有、GitBook 缺：

| 合約 | 地址 | 狀態 |
| --- | --- | --- |
| RewardsRouter (bStock emission) | `0xC3e73f8e7010E5FBD083AB4C5b29476A3fdF5eC5` | Notion 有、GitBook 缺 |
| CollateralYieldVault | `0x4837fB5c9C84524CC0c93f066c1Ac708a758E5FD` | Notion 有、GitBook 缺 |
| RewardHarvester | `0xA3363084BD341e6092b941052A399eDB7fCb684E` | Notion 有、GitBook 缺 |

> 這套 SOP 上線後，上述這種落差會在下一次同步自動補上。

---

## 2. 架構（沿用 audit / oracle 已驗證的模式）

```
Notion「Lista Contracts — GitBook SSOT」(DB)         ← 合約團隊唯一維護點
        │
        ▼  utils/sync-contracts.mjs（讀 DB → 產生各合約頁）
        │
        ▼  .github/workflows/contracts-watch.yml（排程在 main / 或部署後即時觸發）
        │
        ▼  自動開 PR 到 en 分支（Docs/PM review）
        │
        ▼  merge 後觸發既有的 RAG 向量化 + 多語翻譯
```

與現有 `oracle-watch` / `audit-watch` 完全同構，差別只在「來源是 DB」與「產出走 PR 而非直接 commit」。

---

## 3. SSOT 結構規格（Notion 資料庫 schema）

新建 Notion 資料庫，欄位如下。**欄位名稱與型別請勿任意更動**（同步腳本靠它們解析）：

| 欄位 (Property) | 型別 | 必填 | 說明 |
| --- | --- | --- | --- |
| **Display Name** | Title | ✅ | 顯示在文件上的合約名稱，例：`MoolahVault(WBNB)`、`PTLinearDiscountOracle (PT-USDe-07May2026)`。同一頁內須唯一且穩定。 |
| **Address** | Text | ✅ | `0x…`（40 hex，建議 checksum 大小寫）。一格一個地址。 |
| **Chain** | Select | ✅ | `BSC` / `Ethereum`（決定 explorer 連結；之後可擴充）。 |
| **Doc Page** | Select | ✅ | 要同步到哪一頁，見 §5 對照表（例：`bsc-core`、`ethereum`、`rwa`）。 |
| **Section** | Text | ⬜ | 頁內次分組標題，例：`Vaults`、`Providers`、`Stock Oracle`。空白＝主表。 |
| **Quote / Note** | Text | ⬜ | 備註欄，例：oracle 的 quote asset（`USD1` / `USDT`）、或任何說明。 |
| **Publish** | Checkbox | ✅ | 是否同步到 GitBook。內部 / 測試 / impl 合約**不要打勾**。 |
| **Status** | Select | ✅ | `Active` / `Deprecated`。下架請改這個，**不要刪列**（見 §4.3）。 |
| **Order** | Number | ⬜ | 頁內排序（小→大）。空白則依建立時間。 |

> 為何用「資料庫」而不是像 oracle 那樣用「一頁表格」？因為欄位型別會**強制結構**，地址永遠在 Address 欄、分頁永遠在 Doc Page 欄——人無法不小心把結構改壞（這正是目前手寫表格 drift 的根因）。

---

## 4. 維護規則（合約團隊的「契約」）

### 4.1 唯一寫入點
合約地址**只在這個 DB 改**。GitBook 的 `smart-contract*.md` 視為唯讀鏡像；任何手動編輯會在下次同步被覆蓋。

### 4.2 新部署
部署完成後，在 DB **新增一列**，至少填：`Display Name`、`Address`、`Chain`、`Doc Page`，`Publish` 預設打勾，`Status=Active`。

### 4.3 換版 / 淘汰（重要）
**不要刪列。** 舊合約請：把 `Status` 改成 `Deprecated`，或取消 `Publish`。
理由：刪列會讓地址「憑空消失」，也讓同步腳本無法區分「刻意下架」與「誤刪」。保留歷史才可追溯。

### 4.4 命名穩定
`Display Name` 是 GitBook 端的識別鍵。命名定了就別亂改；真要改名，改 DB 這一個地方即可，同步會處理。

### 4.5 不要放這裡的東西
內部工具合約、測試網地址、proxy 的 implementation（除非文件要列）→ `Publish` 不打勾，或根本不建列。測試網另開 DB 或用 `Chain` 區分。

---

## 5. Doc Page 值 ↔ GitBook 檔案對照

| `Doc Page` 值 | GitBook 檔案 | 頁內可用 `Section` |
| --- | --- | --- |
| `bsc-core` | `for-developer/lista-lending/smart-contract-bsc-core.md` | `Vaults`、`Providers` |
| `bsc-brokers` | `for-developer/lista-lending/smart-contract-bsc-brokers.md` | — |
| `bsc-smart-lending` | `for-developer/lista-lending/smart-contract-bsc-smart-lending.md` | 依現有分組 |
| `bsc-oracles` | `for-developer/lista-lending/smart-contract-bsc-oracles.md` | `Stock Oracle`、`PT-*` 各到期日 |
| `bsc-credit` | `for-developer/lista-lending/smart-contract-bsc-credit.md` | — |
| `ethereum` | `for-developer/lista-lending/smart-contract-ethereum.md` | — |
| `rwa` | `for-developer/rwa/smart-contract.md` | `slisXAUE` |
| `cdp` | `for-developer/collateral-debt-position/smart-contract.md` | （legacy 卡片式） |
| `clisbnb` | `for-developer/clisbnb/smart-contract.md` | — |
| `liquid-staking` | `for-developer/liquid-staking-slisbnb/smart-contract.md` | — |
| `credit-loans` | `for-developer/credit-loans/smart-contract.md` | — |
| `lista-governance` | `for-developer/lista-governance/smart-contract.md` | — |
| `lista-rights` | `for-developer/lista-rights/smart-contract.md` | — |
| `lisaster` | `for-developer/lisaster/smart-contract.md` | — |

> 之後新增分頁，只要在這張表＋ Notion `Doc Page` 選項各加一筆即可。

---

## 6. 觸發與發布流程

兩種觸發（可並存）：

1. **排程**：每週一同步（接在 audit 06:00 / oracle 06:30 之後，例如 07:00 UTC）。
2. **部署後即時**（建議，進階）：合約 repo 的部署 CI 跑完後，發 `repository_dispatch` 到 `gitbook` repo，幾分鐘內就更新。

**發布走 PR（不直接 commit）**：因為合約地址是高風險內容，同步結果開 PR 到 `en`，由 Docs/PM review 後 merge。PR 內容包含「本次新增 / 變更 / 下架」的合約摘要（沿用 oracle 腳本產 summary 的做法）。merge 後自動觸發 RAG + 翻譯。

---

## 7. 安全機制（腳本保證）

沿用 `sync-multi-oracle.mjs` 已有的防呆，移植到合約同步：

- **格式驗證**：每列必須有合法 `0x` 地址、`Chain`、`Doc Page`，否則該列**報錯不寫**，不會產出半殘的表。
- **不靜默刪除**：若 GitBook 端某合約在 DB 找不到（且非 `Deprecated`），於 PR 中**標示出來請人確認**，不會直接刪。
- **變更摘要**：PR body 逐項列出地址新增 / 變更 / 下架，方便 review。
- **空值不覆蓋**：DB 某格空白時，不會用空白蓋掉既有地址。

---

## 8. 權限 / Secret

- 同步用既有的 **`NOTION_TOKEN`**（oracle 同步已在用），**不需新增 secret**。
- 只要把該 Notion integration **分享給這個新 DB**（Notion 頁面右上 … → Connections → 加入 integration）。

---

## 9. 上線步驟

1. **建 DB**：依 §3 建立「Lista Contracts — GitBook SSOT」，把 integration 分享給它。
2. **一次性 backfill**：把現有 6 個 BSC/ETH 頁 + Notion 兩頁的合約一次匯入 DB（可寫一次性腳本，從現有 GitBook 表格 + Notion 頁解析灌入，避免人工搬運）。
3. **補 drift**：順手把 §1 那 3 個（RewardsRouter / CollateralYieldVault / RewardHarvester）建進 DB。
4. **寫腳本**：`utils/sync-contracts.mjs`（複用 oracle 腳本骨架）。
5. **加 workflow**：`.github/workflows/contracts-watch.yml`（放 `main`，排程 + `workflow_dispatch`）。
6. **試跑**：先 `workflow_dispatch` 手動跑一次，檢查產出的 PR diff。
7. **轉交維護**：把本 SOP 給合約團隊，之後地址只進 DB。

---

## 10. 權責 (RACI 簡版)

| 事項 | 合約團隊 | Docs / PM | 自動化 |
| --- | --- | --- | --- |
| 維護 DB 地址（唯一寫入點） | **R/A** | — | — |
| 遵守結構契約（§3/§4） | **R** | C | 驗證 |
| 同步 + 開 PR + 變更摘要 | — | — | **R** |
| Review / merge PR | C | **R/A** | — |
| 維護腳本 / workflow | C | **R/A** | — |

---

## 11. FAQ

- **Q：我手動改了 GitBook 的地址會怎樣？** → 下次同步會被 DB 覆蓋。請改 DB。
- **Q：同一合約多鏈部署？** → 一鏈一列，用 `Chain` + `Doc Page` 區分。
- **Q：proxy / implementation 要列嗎？** → 文件通常只列 proxy；implementation 不打 `Publish`。
- **Q：可以不用 Notion，直接讀合約 repo 的部署檔嗎？** → 可以（Foundry `broadcast/*.json` 或 `deployments.json`），但「友善名稱 → 分頁」的對應仍需人維護；先用 DB 起步最快，未來可加這條來源。
- **Q：oracle 那頁也要併進來嗎？** → 不用，`multi-oracle.md` 已有自己的同步；本 SOP 只管 `smart-contract*.md`。
