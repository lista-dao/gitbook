# Positions, Liquidation & Emission API

读取端点以获取 **用户头寸**、**可清算/风险头寸**、**清算历史** 和 **发放（奖励）Merkle证明** 在 Lista Lending (Moolah) 中。

这些端点告诉您 *什么* 是可清算的；有关 *如何* 在链上执行清算，请参阅 [Liquidator Integration](../../lista-lending/liquidator-integration.md)。

这些端点由 Lista API 提供服务，跨这些路由命名空间：

| 命名空间 | 目的 |
|-----------|---------|
| `/api/moolah/*` | Moolah 市场头寸和发放数据。 |
| `/api/liquidation/zone/*`, `/api/v2/liquidated/lending/history` | 清算信息流（风险列表、历史）。 |

> **CDP 市场是独立的。** 传统的单抵押 CDP 市场（以 `ilk` 为键，而不是 Moolah 的 `marketId`）由一个独立的控制器提供服务，并记录在 [CDP API](../../collateral-debt-position/api.md) 中。它们 **不是** Moolah 端点下方的过滤器。

> 金额以十进制字符串返回。`Wei` 后缀表示原始链上整数，但缩放 **不** 可靠地通过字段名称信号传达——每个端点下方声明其金额字段中的哪些是原始的。代币地址和预言机/IRM 地址从索引的市场配置中按原样返回。

---

## 1. 可清算头寸 (Moolah)

### GET /api/moolah/redPositions

返回当前可清算的 Moolah 市场头寸，即其存储的清算率 (`liqRate`) 高于市场预言机返回的实时链上价格的头寸。结果按 `liqRate` 降序排列（最先处于水下）。

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|-----------|------|----------|-------------|
| `id` | string | 是 | 市场标识符 (`marketId`)。未知市场返回空数组。 |
| `start` | number | 否 | 结果集的偏移量。默认为 `0`。 |
| `count` | number | 否 | 页面大小。默认为 `20`。 |

#### 响应

头寸对象数组：

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `collateral`, `borrowed`, `borrowShares`, `totalBorrowAssets`, `totalBorrowShares` | string | 头寸和市场总计，全部为 **原始链上整数** — 参见表格下方的说明。 |
| `collateralPrice` | string | 用于选择头寸的实时预言机价格 — 原始，按链上 `getPrice` 调用返回。 |
| `lltv` | string | 清算贷款价值比 (LTV) 作为 **十进制分数**（例如 `0.86`）— 注意这与 `/api/moolah/allMarkets` 不同，后者返回的比例为 1e18。 |
| `collateralDecimal` | number | 抵押代币小数位数 — 纯计数，不缩放。 |
| `user`, `collateralToken`, `loanToken`, `oracle` | string | 借款人、两个代币地址和市场的预言机。 |

> **此端点的金额字段是原始的。** 此处的金额字段是 **原始链上整数** — `collateral`, `borrowed`, `borrowShares`, `totalBorrowAssets`, `totalBorrowShares` 和 `collateralPrice` — 即使它们的名称没有以 `Wei` 结尾。（`lltv` 是十进制分数，`collateralDecimal` 是纯计数，如表所示。）

根据此处返回的字段（原始整数，`lltv` 为十进制分数），选择条件为 `borrowed × 1e36 > collateral × collateralPrice × lltv`。`collateralPrice` 承载 Moolah 的预言机价格比例，因此 `1e36` 除数不是可选的。`borrowShares` / `totalBorrowAssets` / `totalBorrowShares` 允许集成商在提交清算之前重新计算股份的确切当前债务。

---

## 2. 清算区 (Moolah)

三个相关的信息流位于 `/api/liquidation/zone` 下：`/list` 是每个市场的借款人白名单及头寸快照，`/closeToLiquidate` 是风险信息流，`/history` 是已结算的清算。

### GET /api/liquidation/zone/list

返回 `PublicLiquidator` 的每个市场 **借款人** 白名单的内容，按插入顺序排列。这与 Moolah 的 `liquidationWhitelist` 结构不同，后者列出了合格的 *清算人*。要监控接近阈值的头寸，请使用 [`/closeToLiquidate`](#get-apiliquidationzoneclosetoliquidate)。此端点 **不** 应用其自身的资格或可清算性谓词，超出以下可选过滤器 — 将其视为候选信息流，并在采取行动之前在链上确认每个头寸的健康状况。

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|-----------|------|----------|-------------|
| `page` | number | 否 | 页码。默认为 `1`。 |
| `pageSize` | number | 否 | 每页项目数。默认为 `20`，上限为 `50`。 |
| `collaterals` | string[] | 否 | 按抵押品符号过滤。最多 10 个。 |
| `loans` | string[] | 否 | 按贷款符号过滤。最多 10 个。 |
| `loanInUsd` | number | 否 | 以美元为单位的最低借款价值（向下舍入到最接近的 1,000）。 |

> **将数组过滤器作为重复参数发送** — `?collaterals=BTCB&collaterals=WBNB`，或单值的括号形式 `?collaterals[]=BTCB`。单个未重复的 `?collaterals=BTCB` 作为纯 **字符串** 到达，并 **逐字符** 展开到 `IN (…)` 列表中，因此它默默地匹配代币 `B`、`T`、`C` — 错误的结果集，而不是空的，也不是错误。`/list` 和 `/history` 还拒绝超过 10 个值；该检查是基于长度的，因此一个未重复的值长度超过 10 个字符也会被拒绝。

#### 响应

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `total` | number | 匹配的总行数。 |
| `list` | array | 头寸对象（见下文）。 |

**`list` 中的项目：**

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `collateralUiMultiplier` | string | 抵押金额的显示乘数 — 参见 [Conventions](conventions.md#display-multiplier)。 |
| `lltv` | string | 清算贷款价值比 (LTV) 作为 **十进制分数**（例如 `0.86`）— 注意这与 `/api/moolah/allMarkets` 不同，后者返回的比例为 1e18。 |
| `time` | number | 进入时间，**unix 秒**。 |
| `collateral`, `borrowed`, `borrowShares`, `loanValueUsd` | string | 头寸金额及其美元借款价值。 |
| `collateralDecimal`, `loanDecimal` | number | 代币小数位数 — 纯计数。 |
| `type`, `marketId`, `user`, `chain` | string | 进入类型、市场、借款人和市场的链。 |
| `collateralToken`, `collateralSymbol`, `loanToken`, `loanSymbol`, `oracle`, `collateralIcon` | string | 代币地址和符号、预言机和抵押品图标。 |

### GET /api/liquidation/zone/history

已完成的 Moolah 清算。

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|-----------|------|----------|-------------|
| `page` | number | 否 | 页码。默认为 `1`。 |
| `pageSize` | number | 否 | 每页项目数。默认为 `20`，上限为 `50`。 |
| `collaterals` | string[] | 否 | 按抵押品符号过滤。最多 10 个。 |
| `loans` | string[] | 否 | 按贷款符号过滤。最多 10 个。 |
| `userAddress` | string | 否 | 按借款人地址过滤。 |
| `loanInUsd` | number | 否 | 以美元为单位的最低借款价值（向下舍入到最接近的 1,000）。 |

#### 响应

`{ total, list }`，其中每个项目描述一个已结算的清算：

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `repaidShares` | string | 清算人偿还的借款股份，作为 **原始** 整数 — 与同一行上的 `repaidAssets` 和 `seizedAssets` 不同，它们是十进制缩放的。 |
| `repaidAssets`, `seizedAssets`, `repaidInUsd`, `seizedInUsd`, `collateralMarketPrice` | string | 偿还的债务和扣押的抵押品，它们的美元价值，以及清算时的抵押品价格。 |
| `type`, `marketId`, `user`, `liquidator` | string | 进入类型、市场、被清算的借款人和清算人。 |
| `collateralToken` / `collateralSymbol` / `collateralDecimal` / `collateralIcon` | string / number | 抵押代币元数据。 |
| `collateralUiMultiplier` | string | 抵押金额的显示乘数 — 参见 [Conventions](conventions.md#display-multiplier)。 |
| `loan` | string | 贷款金额。 |
| `loanInUsd` | string | 贷款的美元价值。 |
| `loanToken` / `loanSymbol` / `loanDecimal` | string / number | 贷款代币元数据。 |
| `lltv` | string | 清算贷款价值比 (LTV) 作为 **十进制分数**（例如 `0.86`）— 注意这与 `/api/moolah/allMarkets` 不同，后者返回的比例为 1e18。 |
| `time` | number | 索引器记录清算的 Unix 秒 — **不是** 链上区块时间，可能会滞后。`/api/v2/liquidated/lending/history` 返回链上事件时间。 |
| `chain` | string | 链标识符。 |

### GET /api/liquidation/zone/closeToLiquidate

安全系数 (`marketLiqRate / positionLiqRate`) 低于 `1.5` 的开放头寸。没有 **下限** — 安全系数低于 `1` 意味着头寸已经可以清算，因此此信息流与 `/api/moolah/redPositions` 重叠，而不是严格的“有风险但健康”。按安全系数升序排列（最接近清算的优先），然后按头寸更新时间降序排列。

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|-----------|------|----------|-------------|
| `page` | number | 否 | 页码。默认为 `1`。 |
| `pageSize` | number | 否 | 每页项目数。默认为 `20`，上限为 `50`。 |
| `collaterals` | string \| string[] | 否 | 按抵押品符号过滤。 |
| `loans` | string \| string[] | 否 | 按贷款符号过滤。 |
| `userAddress` | string | 否 | 按借款人地址过滤。 |
| `loanInUsd` | number | 否 | 以美元为单位的最低借款价值。 |

> 与 `/list` 和 `/history` 不同，此端点会规范化单个未重复的值，因此 `?collaterals=BTCB` 和重复形式都有效，并且没有 10 值限制。

#### 响应

`{ total, list }`，其中每个项目包括：

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `marketId`, `user` | string | 市场和借款人。 |
| `collateral`, `borrowed` | string | 头寸金额。 |
| `collateralToken` / `collateralSymbol` / `collateralIcon` | string | 抵押代币元数据。 |
| `collateralUiMultiplier` | string | 抵押金额的显示乘数 — 参见 [Conventions](conventions.md#display-multiplier)。 |
| `collateralPrice`, `loanPrice` | string | 两个部分的价格。 |
| `loanToken` / `loanSymbol` / `loanIcon` | string | 贷款代币元数据。 |
| `lltv` | string | 清算贷款价值比 (LTV) 作为 **十进制分数**（例如 `0.86`）— 注意这与 `/api/moolah/allMarkets` 不同，后者返回的比例为 1e18。 |
| `safeFactor` | string | 安全系数 (`< 1.5`; 越小越接近清算)。 |
| `loanInUsd` | string | 以美元为单位的借款价值。 |
| `time` | number | 头寸更新时间。 |
| `chain` | string | 链标识符。 |

---

## 3. 借贷清算历史（链上事件时间）

### GET /api/v2/liquidated/lending/history

Moolah 借贷清算按链上事件时间键入，作为 `/zone/history` 的索引器时间戳的替代。过滤器：`collaterals`, `loans`, `userAddress`, `loanInUsd`。

需要知道的三件事：结果尽管名称不同，但被严格限制在 **最近 30 天**；`pageSize` 被向下调整为 10 的倍数，最低为 10，最高为 50；项目形状与 `/zone/history` 不同 — 它添加了 `tx` 并使用链上事件时间，但省略了 `liquidator`, `repaidInUsd`, `seizedInUsd`, `collateralMarketPrice`, `loan`, `loanInUsd`, 代币地址和小数位。其 `type` 始终为字面 `"lending"`。

> 地址由索引器存储为小写。`/zone/history` 为您小写过滤器；`/closeToLiquidate` 原样传递 — 发送小写以确保安全。

---

## 4. 发放（奖励）— Merkle 证明

Lista Lending 通过 **每周 Merkle 根** 模型分发发放奖励：一个链下作业每周发布一个 Merkle 根，每个合格用户从 API 获取其叶子（金额 + Merkle 证明）并在链上认领。因此，这些端点返回的是 **认领证明**，而不是预先记入的余额。

> **身份验证（需要钱包签名）。** 这些端点是签名门控的；消息格式、`type=safe` ERC-1271 路径和错误名称在 [Conventions](conventions.md#signature-gated-endpoints) 中。
>
> **将组装的 URL 视为凭证。** `address`, `signature`, 和 `message` 是查询参数，签名消息在没有 nonce 和端点绑定的情况下有效期为 7 天 — 因此 URL 的任何副本在剩余窗口期内授予对该地址奖励数据的读取访问权限。不要记录这些 URL，不要将它们放入错误报告中，也不要通过第三方服务传递它们；每个会话签署一条新消息并保持生命周期短。

### GET /api/moolah/emission/userProof

返回最新活动周根的 LISTA 发放 Merkle 证明。

> **`amount` 是累积的，而不是余额。** Merkle 叶子编码了地址迄今为止赚取的所有内容，分发者减去它已经支付的部分。要显示现在实际可认领的内容，从 `amountWei` 中减去地址的链上已认领总额 — 此端点背后的单代币 LISTA 分发者的 `claimed(user)`，或 `/userMultiProof` 背后的多代币分发者的 `claimed(user, token)` — 将 `amount` 视为可认领的数字会因整个认领历史而过报。

| 参数 | 类型 | 必需 | 描述 |
|-----------|------|----------|-------------|
| `address` | string | 是 | 认领地址。 |
| `signature` | string | 是 | 钱包签名，覆盖 `message`。 |
| `message` | string | 是 | 签名消息：ISO-8601 UTC 时间戳行，然后是字面行 `Thank you for your support of listaDAO.`（严格正则表达式；时间戳 ≤ 7 天）。 |
| `type` | string | 否 | `safe` 用于 ERC-1271（Safe）钱包；省略/其他用于 EOA。 |

#### 响应

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `rootId` | string | 证明所属根的周标识符。 |
| `amount` | string | **累积**至今赚取的金额，编码在叶子中（缩放）。 |
| `amountWei` | string | 相同数字，原始整数。 |
| `proof` | string[] | Merkle 证明节点。 |
| `currentAmount` | string | 当前周可归因的金额。 |

当用户没有最新根的叶子时，返回空证明：`{ rootId: "", amount: "0", amountWei: "0", proof: "" }`。与填充形状的两个区别 — `currentAmount` 完全 **缺失**，`proof` 是一个空的 **字符串** 而不是表中列出的 `string[]`。

### GET /api/moolah/emission/userMultiProof

返回每个代币的发放证明（多代币奖励流），每个条目将可认领的 Merkle 证明与估计奖励细分配对。

参数：与 `/userProof` 相同的认证参数（`address`, `signature`, `message`, `type`）。

#### 响应

数组，每个奖励代币一个条目：

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `token`, `tokenSymbol`, `tokenIcon` | string | 奖励代币地址、符号和图标。 |
| `amount` | string | **累积**至今赚取的金额（缩放）；如果仅存在估计，则为 `0`。 |
| `amountWei` | string | 相同数字，原始；如果仅存在估计，则为 `0`。 |
| `proof` | string[] | Merkle 证明节点；如果仅存在估计，则为空。 |
| `currentAmount` | string | 当前期间的金额。 |
| `estRewards` | object | `symbol → 估计美元价值` 的映射。 |
| `estRewardDetails` | array | 每个符号 `{ symbol, estRewards, icon, amount }`。 |

仅有累积估计（尚无最终叶子）的代币以空 `proof` / 零 `amount` 出现。

### GET /api/moolah/emission/userRewardHistory

分页显示一个地址的已完成的每个代币发放奖励历史。

| 参数 | 类型 | 必需 | 描述 |
|-----------|------|----------|-------------|
| `address` | string | 是 | 认领地址。 |
| `signature` | string | 是 | 钱包签名，覆盖 `message`。 |
| `message` | string | 是 | 签名消息：ISO-8601 UTC 时间戳行，然后是字面行 `Thank you for your support of listaDAO.`（严格正则表达式；时间戳 ≤ 7 天）。 |
| `type` | string | 否 | `safe` 用于 ERC-1271（Safe）钱包；省略/其他用于 EOA。 |
| `page` | number | 否 | 页码。默认为 `1`。 |
| `pageSize` | number | 否 | 每页项目数。默认为 `10`，上限为 `50`。 |

#### 响应

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `total` | number | 总历史行数。 |
| `list` | array | 历史条目（见下文）。 |

**`list` 中的项目：**

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `token`, `tokenSymbol`, `tokenIcon` | string | 奖励代币地址、符号和图标。 |
| `amount` | string | 奖励金额（缩放）。 |
| `amountWei` | string | 奖励金额（原始）。 |
| `currentAmount` | string | 可归因于该周的金额。 |
| `weeks` | string | 周标识符。 |

---

## 相关页面

- [Market API](market.md) — 市场、预言机、借款利率历史、链上市场配置。
- [Vault](vault.md) — 保险库列表、详情、分配。
- [Liquidation (Service)](../liquidation-logic.md) — 如何确定有风险和可清算的头寸。