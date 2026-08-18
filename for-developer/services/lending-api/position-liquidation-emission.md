# 仓位、清算、排放与 CDP

面向**用户仓位**、**清算**、**排放（奖励）**与 **CDP 类市场**的 API。具体路径与响应结构因实现而异；本页概述典型用法，并指向底层的数据/设计文档。

**Base URL：** `/api/moolah`

---

## 用户仓位

返回用户在各市场中仓位（抵押品、借款金额、健康因子、清算价格）的 API。

**典型路径：**

- `GET /api/moolah/position/list` — 列出某用户的仓位（查询参数：`userAddress`、`chainId`、`page`、`pageSize`）。
- `GET /api/moolah/position/detail` — 单个仓位（查询参数：`userAddress`、`marketId`，可选 `chainId`）。
- `GET /api/moolah/user/:userAddress/positions` — 另一种形式：用户以路径参数传入，链/分页以查询参数传入。

**每个仓位的典型响应字段：**

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `userAddress` | string | 钱包地址。 |
| `marketId` | string | 市场标识符。 |
| `chainId` | number | 链 ID。 |
| `collateralAmount` | string | 已提供的抵押品。 |
| `borrowedAmount` | string | 实际借款金额。 |
| `liquidationPrice` / `liquidationPriceRatio` | string | 使仓位变为可清算的价格（或价格比）。 |
| `healthFactor` | string | 健康因子（若提供）。 |

数据来源与计算公式请参见[仓位数据维护](../position-data-maintenance.md)。

---

## 清算

用于查询可清算仓位或清算历史的端点。

**典型路径：**

- `GET /api/moolah/liquidation/liquidatable` — 列出可被清算的仓位（查询参数：`chainId`、`marketId`、`page`、`pageSize`）。
- `GET /api/moolah/liquidation/history` — 历史清算记录（查询参数：`userAddress`、`marketId`、`chainId`、`startTime`、`endTime`，以及分页参数）。

**典型响应字段（可清算列表）：**

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `userAddress` | string | 借款人。 |
| `marketId` | string | 市场。 |
| `borrowedAmount` | string | 债务。 |
| `collateralAmount` | string | 抵押品。 |
| `liquidationPrice` | string | 触发价格。 |
| `currentPrice` | string | 当前预言机价格。 |

风险与清算的判定方式：请参见[清算逻辑](../liquidation-logic.md)。

---

## 排放（奖励）

用于查询奖励速率、可领取数量与分配配置的端点。

**典型路径：**

- `GET /api/moolah/emission/rates` — 各金库/市场的奖励速率。
- `GET /api/moolah/emission/claimable` — 某用户可领取的奖励（查询参数：`userAddress`、`chainId`）。
- `GET /api/moolah/rewards/config` — 分配配置（若对外暴露）。

**典型响应字段（可领取奖励）：**

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `userAddress` | string | 钱包。 |
| `vaultId` / `marketId` | string | 奖励的作用范围。 |
| `claimableAmount` | string | 可领取的奖励数量。 |
| `asset` / `token` | string | 奖励代币地址。 |

奖励由仓位表与奖励分发合约推导得出；请参见[仓位数据维护](../position-data-maintenance.md)。

---

## CDP 市场（传统抵押债务）

CDP 类市场（以单一抵押品借出稳定币）可能以如下方式对外暴露：

- 作为[市场列表](market.md)中的一种**市场类型**或**过滤条件**（例如 `type=cdp` 或 `market/search/cdp`）。
- 使用相同的[市场详情](market.md)路径，并传入指向 CDP 市场的 `marketId`。

其合约结构可能与标准 Moolah 市场不同；请使用[市场详情](market.md)与[全部市场（链上）](market.md#5-all-markets-on-chain)获取准确的链上配置。
