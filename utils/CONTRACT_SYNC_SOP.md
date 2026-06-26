# 合约地址 → GitBook 自动同步：SSOT 规格与维护 SOP

> 给合约团队 + Docs/PM 对齐用的内部文件。**不会发布到 GitBook**（未列入 `SUMMARY.md`）。
> 目标：合约团队只在「一个地方」维护地址，GitBook 的 `for-developer/**/smart-contract*.md` 自动跟着更新，不再手抄。

---

## 0. TL;DR

- **唯一真实来源 (SSOT)** = 一个 Notion **数据库**「Lista Contracts — GitBook SSOT」。
- 合约团队**每次部署**就在这个 DB 新增/更新一行；**GitBook 不要手改**（手改会被下次同步覆盖）。
- 系统每周（或部署后即时）把 DB 同步成各 GitBook 合约页，**开一个 PR** 给 Docs/PM review 后 merge。
- 沿用现有机制与 secret（`NOTION_TOKEN`），不新增基础设施。

---

## 1. 背景：现在的问题

`for-developer/` 底下有 14 个合约地址页（BSC core / brokers / smart-lending / oracles / credit、Ethereum、RWA、CDP、各产品…），目前**全靠人手从 Notion 抄到 GitBook**。结果已经对不上，例如（2026-06-23 实测）Notion 有、GitBook 缺：

| 合约 | 地址 | 状态 |
| --- | --- | --- |
| RewardsRouter (bStock emission) | `0xC3e73f8e7010E5FBD083AB4C5b29476A3fdF5eC5` | Notion 有、GitBook 缺 |
| CollateralYieldVault | `0x4837fB5c9C84524CC0c93f066c1Ac708a758E5FD` | Notion 有、GitBook 缺 |
| RewardHarvester | `0xA3363084BD341e6092b941052A399eDB7fCb684E` | Notion 有、GitBook 缺 |

> 这套 SOP 上线后，上述这种落差会在下一次同步自动补上。

---

## 2. 架构（沿用 audit / oracle 已验证的模式）

```
Notion「Lista Contracts — GitBook SSOT」(DB)         ← 合约团队唯一维护点
        │
        ▼  utils/sync-contracts.mjs（读 DB → 产生各合约页）
        │
        ▼  .github/workflows/contracts-watch.yml（排程在 main / 或部署后即时触发）
        │
        ▼  自动开 PR 到 en 分支（Docs/PM review）
        │
        ▼  merge 后触发既有的 RAG 向量化 + 多语翻译
```

与现有 `oracle-watch` / `audit-watch` 完全同构，差别只在「来源是 DB」与「产出走 PR 而非直接 commit」。

---

## 3. SSOT 结构规格（Notion 数据库 schema）

新建 Notion 数据库，栏位如下。**栏位名称与型别请勿任意更动**（同步脚本靠它们解析）：

| 栏位 (Property) | 型别 | 必填 | 说明 |
| --- | --- | --- | --- |
| **Display Name** | Title | ✅ | 显示在文件上的合约名称，例：`MoolahVault(WBNB)`、`PTLinearDiscountOracle (PT-USDe-07May2026)`。同一页内须唯一且稳定。 |
| **Address** | Text | ✅ | `0x…`（40 hex，建议 checksum 大小写）。一格一个地址。 |
| **Chain** | Select | ✅ | `BSC` / `Ethereum`（决定 explorer 连结；之后可扩充）。 |
| **Doc Page** | Select | ✅ | 要同步到哪一页，见 §5 对照表（例：`bsc-core`、`ethereum`、`rwa`）。 |
| **Section** | Text | ⬜ | 页内次分组标题，例：`Vaults`、`Providers`、`Stock Oracle`。空白＝主表。 |
| **Quote / Note** | Text | ⬜ | 备注栏，例：oracle 的 quote asset（`USD1` / `USDT`）、或任何说明。 |
| **Publish** | Checkbox | ✅ | 是否同步到 GitBook。内部 / 测试 / impl 合约**不要打勾**。 |
| **Status** | Select | ✅ | `Active` / `Deprecated`。下架请改这个，**不要删行**（见 §4.3）。 |
| **Order** | Number | ⬜ | 页内排序（小→大）。空白则依建立时间。 |

> 为何用「数据库」而不是像 oracle 那样用「一页表格」？因为栏位型别会**强制结构**，地址永远在 Address 栏、分页永远在 Doc Page 栏——人无法不小心把结构改坏（这正是目前手写表格 drift 的根因）。

---

## 4. 维护规则（合约团队的「契约」）

### 4.1 唯一写入点
合约地址**只在这个 DB 改**。GitBook 的 `smart-contract*.md` 视为只读镜像；任何手动编辑会在下次同步被覆盖。

### 4.2 新部署
部署完成后，在 DB **新增一行**，至少填：`Display Name`、`Address`、`Chain`、`Doc Page`，`Publish` 默认打勾，`Status=Active`。

### 4.3 换版 / 淘汰（重要）
**不要删行。** 老合约请：把 `Status` 改成 `Deprecated`，或取消 `Publish`。
理由：删行会让地址「凭空消失」，也让同步脚本无法区分「刻意下架」与「误删」。保留历史才可追溯。

### 4.4 命名稳定
`Display Name` 是 GitBook 端的识别键。命名定了就别乱改；真要改名，改 DB 这一个地方即可，同步会处理。

### 4.5 不要放这里的东西
内部工具合约、测试网地址、proxy 的 implementation（除非文件要列）→ `Publish` 不打勾，或根本不建行。测试网另开 DB 或用 `Chain` 区分。

---

## 5. Doc Page 值 ↔ GitBook 文件对照

| `Doc Page` 值 | GitBook 文件 | 页内可用 `Section` |
| --- | --- | --- |
| `bsc-core` | `for-developer/lista-lending/smart-contract-bsc-core.md` | `Vaults`、`Providers` |
| `bsc-brokers` | `for-developer/lista-lending/smart-contract-bsc-brokers.md` | — |
| `bsc-smart-lending` | `for-developer/lista-lending/smart-contract-bsc-smart-lending.md` | 依现有分组 |
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

> 之后新增分页，只要在这张表＋ Notion `Doc Page` 选项各加一笔即可。

---

## 6. 触发与发布流程

两种触发（可并存）：

1. **排程**：每周一同步（接在 audit 06:00 / oracle 06:30 之后，例如 07:00 UTC）。
2. **部署后即时**（建议，进阶）：合约 repo 的部署 CI 跑完后，发 `repository_dispatch` 到 `gitbook` repo，几分钟内就更新。

**发布走 PR（不直接 commit）**：因为合约地址是高风险内容，同步结果开 PR 到 `en`，由 Docs/PM review 后 merge。PR 内容包含「本次新增 / 变更 / 下架」的合约摘要（沿用 oracle 脚本产 summary 的做法）。merge 后自动触发 RAG + 翻译。

---

## 7. 安全机制（脚本保证）

沿用 `sync-multi-oracle.mjs` 已有的防呆，移植到合约同步：

- **格式验证**：每行必须有合法 `0x` 地址、`Chain`、`Doc Page`，否则该行**报错不写**，不会产出半残的表。
- **不静默删除**：若 GitBook 端某合约在 DB 找不到（且非 `Deprecated`），于 PR 中**标示出来请人确认**，不会直接删。
- **变更摘要**：PR body 逐项列出地址新增 / 变更 / 下架，方便 review。
- **空值不覆盖**：DB 某格空白时，不会用空白盖掉既有地址。

---

## 8. 权限 / Secret

- 同步用既有的 **`NOTION_TOKEN`**（oracle 同步已在用），**不需新增 secret**。
- 只要把该 Notion integration **分享给这个新 DB**（Notion 页面右上 … → Connections → 加入 integration）。

---

## 9. 上线步骤

1. **建 DB**：依 §3 建立「Lista Contracts — GitBook SSOT」，把 integration 分享给它。
2. **一次性 backfill**：把现有 6 个 BSC/ETH 页 + Notion 两页的合约一次汇入 DB（可写一次性脚本，从现有 GitBook 表格 + Notion 页解析灌入，避免人工搬运）。
3. **补 drift**：顺手把 §1 那 3 个（RewardsRouter / CollateralYieldVault / RewardHarvester）建进 DB。
4. **写脚本**：`utils/sync-contracts.mjs`（复用 oracle 脚本骨架）。
5. **加 workflow**：`.github/workflows/contracts-watch.yml`（放 `main`，排程 + `workflow_dispatch`）。
6. **试跑**：先 `workflow_dispatch` 手动跑一次，检查产出的 PR diff。
7. **转交维护**：把本 SOP 给合约团队，之后地址只进 DB。

---

## 10. 权责 (RACI 简版)

| 事项 | 合约团队 | Docs / PM | 自动化 |
| --- | --- | --- | --- |
| 维护 DB 地址（唯一写入点） | **R/A** | — | — |
| 遵守结构契约（§3/§4） | **R** | C | 验证 |
| 同步 + 开 PR + 变更摘要 | — | — | **R** |
| Review / merge PR | C | **R/A** | — |
| 维护脚本 / workflow | C | **R/A** | — |

---

## 11. FAQ

- **Q：我手动改了 GitBook 的地址会怎样？** → 下次同步会被 DB 覆盖。请改 DB。
- **Q：同一合约多链部署？** → 一链一行，用 `Chain` + `Doc Page` 区分。
- **Q：proxy / implementation 要列吗？** → 文件通常只列 proxy；implementation 不打 `Publish`。
- **Q：可以不用 Notion，直接读合约 repo 的部署文件吗？** → 可以（Foundry `broadcast/*.json` 或 `deployments.json`），但「友善名称 → 分页」的对应仍需人维护；先用 DB 起步最快，未来可加这条来源。
- **Q：oracle 那页也要并进来吗？** → 不用，`multi-oracle.md` 已有自己的同步；本 SOP 只管 `smart-contract*.md`。