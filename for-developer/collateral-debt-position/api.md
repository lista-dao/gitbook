# CDP API

**lisUSD CDP** 的读取端点，每个仓位由单一抵押品类型（`ilk`）支持。它们以 `ilk`（抵押品类型）和抵押代币地址为键，而不是 Moolah 的 `marketId`。

> CDP 正在逐步关闭 — 请参阅 [Mechanics](mechanics.md)。这些数据流服务于现有仓位。对于 Moolah 市场，请使用 [Positions, Liquidation & Emission](../services/lending-api/position-liquidation-emission.md)。

基础 URL、响应封装和链选择器遵循与 API 其余部分相同的约定 — 请参阅 [Conventions](../services/lending-api/conventions.md)。这些 CDP 数据流的分页是其自己的方案，`start`/`count`（在下面的每个端点中记录），**不是** conventions.md 为 Moolah 市场端点记录的 `page`/`pageSize` 方案。

## 清算数据流

这些 `/api/v2/liquidations/*` 和 `/api/v2/liquidated` 端点服务于 **CDP（单一抵押品）借款产品**，而不是 Moolah 市场。它们从借款人索引中读取，并通过抵押代币地址对结果进行键控。对于 Moolah 市场清算，请使用 [Positions, Liquidation & Emission](../services/lending-api/position-liquidation-emission.md)。

### GET /api/v2/liquidations/red

当前可清算的仓位（当前价格已超过仓位的清算价格）。

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `start` | number | 否 | 偏移量，向下取整为 10 的倍数，并限制在 `0`。省略它（或发送无效数据）默认为 `0`，而不是错误。 |
| `count` | number | 否 | 页面大小，向下取整为 20 的倍数，然后限制在 `[20, 100]`。省略它默认为 `20`。 |

响应 `data`: `{ users: [...] }`，每个条目包含 `userAddress`、`tokenName`、`collateralCurrency`、`collateral`、`liquidationPrice`、`liquidationCost`、`rangeFromLiquidation`。在此端点上，`rangeFromLiquidation` 始终为 `0`（这些仓位已经可清算），`liquidationCost` 是一个高精度的小数字符串，最多有 20 位小数 — 使用大数库解析它，而不是 `parseFloat`。

### GET /api/v2/liquidations/orange

接近清算阈值的仓位（在危险带内，但尚不可清算）。与 `/red` 相同的参数和响应结构，但**排序不同**：`/red` 按清算价格降序排序，`/orange` 按 `rangeFromLiquidation` 升序排序。这里 `rangeFromLiquidation` 反映了距离清算的剩余缓冲。

### GET /api/v2/liquidations/auctionUser

查找给定清算拍卖的借款人和 clipper（拍卖合约）。

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `auctionId` | number | 否\* | 拍卖标识符。 |
| `token` | string | 否\* | 抵押代币地址。 |

> \* 两者都无条件绑定为相等过滤器。省略任一返回一个空的 `users` 数组，而不是未过滤的列表。

响应 `data`: `{ users: [{ userAddress, clipperAddress }] }`。

### GET /api/v2/liquidated

最近被清算的 CDP 仓位。

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `start` | number | 否 | 偏移量。默认为 `0`。 |
| `count` | number | 否 | 页面大小。默认为并限制在 `20`。 |

### GET /api/v2/liquidated/:user

一个地址的清算。`GET /api/v2/liquidated/:user/latest?collateral=` 返回一个地址和抵押品的加权平均清算价格。

> 地址由索引器存储为小写，并且 `/liquidated/:user` 原样传递值 — 请发送小写。

## 市场数据流

`/api/cdp/market/*` 服务于 CDP 市场本身。`/info`、`/borrowRate/history` 和 `/userBorrow/history` 每个都需要一个 `ilk`。`/list` 是一个按抵押品**符号**过滤的分页列表，返回每行的 `ilk`；`/search` 需要一个 `typeId=collateral`。