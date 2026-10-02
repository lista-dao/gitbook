# 市场 API

一个借贷市场由抵押品/贷款资产对、LLTV、利率模型（IRM）和预言机定义。这些端点公开市场列表、每个市场的详细信息、为市场提供资金的金库、历史借贷/供应系列，以及用于构建交易的原始链上市场参数。

所有路径都在 **Base URL** `/api/moolah` 下。列表和详细响应来自短期服务器端缓存，因此值反映最后一次同步而不是实时链上状态。除非另有说明，USD 和资产金额以定点小数字符串（18 位小数）返回。`GET /allMarkets` 是个例外——它始终返回原始链上基本单位，尽管没有字段名以 `Wei` 结尾。它也没有 **小数字段**，不像清算数据流，因此请从每个代币合约中读取 `decimals()` 而不是假设为 18。在 Ethereum 上，USDT 和 USDC 使用 6 位小数，因此将它们视为 18 位小数值会错误地缩放 `1e12`。它们的 BSC 对应物使用 18 位小数。

参见 [Conventions](conventions.md) 了解链选择器、分页和排序——注意参数对是 `sort` + `order`，而不是 `sortBy`/`sortOrder`。

---

## 1. 市场列表

### GET /api/moolah/borrow/markets

带有排序和过滤的借贷市场分页列表。

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|-----------|------|----------|-------------|
| `page` | number | 否 | 页码（从 1 开始）。默认为 `1`。 |
| `pageSize` | number | 否 | 每页项目数。默认为 `10`，上限为 `50`。 |
| `sort` | string | 否 | 排序键：`rate`、`liquidity`、`lltv`、`loan`、`collateral` 或 `termType`。未识别的值回退到净借贷利率——与 `sort=rate` 相同的排序。注意 `rate` 按 **净** 借贷利率排序（总额减去借贷发放 APY），而响应返回总 `rate`，`liquidity` 按 USD 值排序。结果首先按 Lista 分配的显示顺序分组，然后在每个组内应用 `sort` / `order`。 |
| `order` | string | 否 | 排序方向：`asc` 或 `desc`（不区分大小写）。省略或未识别时默认为 `desc`。 |
| `keyword` | string | 否 | 在贷款/抵押品符号上的自由文本搜索。最大长度 50。 |
| `loans` | string[] | 否 | 按贷款代币符号过滤。对于多个值重复参数（例如 `loans=USDT&loans=USDC`）。 |
| `collaterals` | string[] | 否 | 按抵押品代币符号过滤。可重复。 |
| `zone` | string | 否 | 逗号分隔的区域 id。默认为 `0`，这是一个 **过滤器，不是“全部”**——默认响应排除 bStock (`5`) 和智能抵押品 (`3`) 市场。明确传递您想要的区域。区域 `10` 是空闲标记，总是被排除。 |
| `termType` | number | 否 | **精确匹配** 市场的期限类型——`1` 表示固定期限，`0` 表示永久。它与 `zone` 进行 `AND` 运算而不是扩展：固定期限市场几乎完全位于 `zone = 0`，因此排除 `0` 的 `zone` 返回其中的任何一个。未验证，因此非数字值会被强制转换为 `0` 并静默返回永久市场。未设置表示没有期限过滤器。`GET /borrow/marketList?biztype=fixedTerm` 是一个单独的固定期限数据流。 |
| `chain` | string | 否 | 网络键（`bsc`、`ethereum`、`bscTest`）。默认为实时网络——生产中的 `bsc`。未验证：未识别的键返回空结果，而不是 `400`。 |

> **重复数组参数；不要发送单个裸值。** 未重复的数组值作为字符串到达，查询构建器会抛出——不支持，并且在冷缓存上请求失败并返回 HTTP `500`，而不是返回空列表。温缓存（参见 [Conventions](conventions.md)）可以掩盖这一点，并无论过滤器如何返回陈旧的缓存响应，因此在一次测试中没有 `500` 并不意味着裸形式是安全的。这适用于 `?loans=` / `?collaterals=` 这里，以及 `/vault/list` 上的 `?assets=` / `?curators=`。使用重复形式（`?loans=USD1&loans=USDT`），或单个值的括号形式（`?loans[]=USD1`）。(`/api/liquidation/zone/list` 和 `/history` 有不同的失败模式：裸值被字符逐个扩展到 `IN (…)` 列表中——`?loans=USD1` 匹配贷款代币为 `U` 的行。`/closeToLiquidate` 正确规范化单个裸值。)

#### 响应

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `total` | number | 匹配过滤器的总数（分页前）。 |
| `list` | array | 当前页的市场对象。 |

**`list` 中的项目：**

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `lltv` | string | 清算贷款价值比，作为 **小数分数**（例如 `0.86`）。注意 `GET /allMarkets` 返回相同字段缩放到 1e18。 |
| `liquidity` | string | 以贷款代币单位表示的可用流动性（小数调整）。 |
| `smartCollateralConfig` | object | 当市场使用智能抵押品时的配置；当不使用时为空对象 `{}`（从不为 `null`）。 |
| `id`, `loan`, `collateral`, `rate`, `supplyApy`, `liquidityUsd`, `zone`, `chain` | string / number | 标识符和主要数据，自描述。 |
| `loanIcon`, `icon` | string | 显示资产。 |
| `vaults`, `rewards` | array | 为该市场提供资金的金库（`{ name, address, icon }`）及其奖励代币条目。 |

---

## 2. 市场详情

### GET /api/moolah/market/:marketId

一个市场的完整详细信息，包括策展人元数据和预言机配置。

#### 路径参数

| 参数 | 类型 | 描述 |
|-----------|------|-------------|
| `marketId` | string | 市场标识符（bytes32）。 |

#### 响应

返回市场对象。当 id 未知时，响应完全省略 `data` 键而不是返回空对象，因此请防御性地读取它——在这种情况下 `res.data.marketId` 会抛出。

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `performanceFeeRate` | number | 市场表现费率，**1e18 缩放**——10% 到达时为 `100000000000000000`，而不是 `0.1`。 |
| `loanTokenPrice` | number | 贷款代币价格，作为 JSON 浮点数——与此页面上的大多数金额字段不同，它们是小数字符串。 |
| `smartCollateralConfig` | object | 当市场使用智能抵押品时的配置；当不使用时为空对象 `{}`（从不为 `null`）。 |
| `marketId`, `loanToken`, `collateralToken`, `oracle` | string | 地址和市场 id。 |
| `borrowRate`, `supplyApy`, `zone`, `chain` | string / number | 主要数据，自描述。 |
| `description`, `descriptionZh`, `curator`, `curatorIcon`, `loanTokenName`, `loanTokenIcon`, `collateralTokenName`, `collateralTokenIcon` | string | 显示文案和资产；`descriptionZh` 是中文变体。 |
| `rewards`, `collateralOracles`, `loanOracles` | array | 奖励代币条目，以及解决每个部分价格的预言机配置。 |

响应还包含已弃用的价格逻辑字段（`collateralPriceLogic`, `collateralPriceLogicCn`, `loanPriceLogic`, `loanPriceLogicCn`）；优先使用 `collateralOracles` / `loanOracles` 获取预言机信息，并将遗留字段视为软弃用。

---

## 3. 按市场划分的金库

### GET /api/moolah/market/vault/:marketId

为给定市场提供流动性的金库的分页列表。

#### 路径参数

| 参数 | 类型 | 描述 |
|-----------|------|-------------|
| `marketId` | string | 市场标识符。 |

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|-----------|------|----------|-------------|
| `page` | number | 否 | 页码。默认为 `1`。 |
| `pageSize` | number | 否 | 每页项目数。默认为 `10`，上限为 `20`。 |
| `order` | string | 否 | 排序方向：`asc` 或 `desc`。默认为 `desc`。结果始终按每个金库对市场的供应排序（`totalSupply`）。 |

#### 响应

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `total` | number | 返回的条目数。 |
| `list` | array | 金库条目。 |

**`list` 中的项目：**

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `address` | string | 金库合约地址。 |
| `name` | string | 金库名称。 |
| `icon` | string | 金库图标 URL。 |
| `curator` | string | 策展人名称。 |
| `curatorIcon` | string | 策展人图标 URL。 |
| `totalSupply` | string | 此金库为市场提供的金额。 |
| `supplyShare` | string | 此金库在市场总供应中的份额（比例）。 |
| `collateralPrice` | string | 市场的抵押品代币价格。 |

---

## 4. 市场借贷利率历史

### GET /api/moolah/market/borrowRate/:marketId

市场的历史借贷利率和供应 APY 系列。点按天分桶。

#### 路径参数

| 参数 | 类型 | 描述 |
|-----------|------|-------------|
| `marketId` | string | 市场标识符。 |

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|-----------|------|----------|-------------|
| `startTime` | number | 否 | 开始时间，Unix 秒。默认为一周前。 |
| `endTime` | number | 否 | 结束时间，Unix 秒。默认为现在。 |

#### 响应

利率点数组：

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `rate` | string | 点的借贷利率。 |
| `supplyApy` | string | 点的供应 APY。 |
| `chartTime` | number | 点时间，Unix 秒。 |

---

## 5. 总借贷历史（协议范围）

### GET /api/moolah/market/totalBorrow/:marketId

历史 **协议范围** 总借贷（以 USD 计），按天分桶。

> **注意：** 此端点返回 **协议范围** 总借贷系列。`:marketId` 路径段接受路由兼容性，但不筛选结果——对于每个市场的历史，请使用 `GET /api/moolah/market/borrowRate/:marketId`。

#### 路径参数

| 参数 | 类型 | 描述 |
|-----------|------|-------------|
| `marketId` | string | 市场标识符。 |

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|-----------|------|----------|-------------|
| `startTime` | number | 否 | 开始时间，Unix 秒。默认为一周前。 |
| `endTime` | number | 否 | 结束时间，Unix 秒。默认为现在。 |

#### 响应

点数组：

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `totalBorrow` | string | 点的协议范围总借贷（以 USD 计）。 |
| `chartTime` | number | 点时间，Unix 秒。 |

---

## 6. 所有市场（链上参数）

### GET /api/moolah/allMarkets

返回活跃的、可清算的市场及其原始链上参数——构建 Moolah 交易（`MarketParams` 等效）和直接读取总数所需的值。一个小型服务器端拒绝列表会拒绝特定市场，因此不要将其视为可证明的详尽列表。无分页和 **无查询参数**。

#### 响应

市场参数对象数组：

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `lltv` | string | 清算 LTV **缩放到 1e18** 这里——列表和详细端点返回相同字段作为小数分数。 |
| `lastUpdate` | number | 最后一次链上累积时间戳。 |
| `id`, `loanToken`, `collateralToken`, `oracle`, `irm` | string | 市场 id 和五个 `MarketParams` 字段中的四个（第五个，`lltv`，在上面的行中）。 |
| `totalSupplyAssets`, `totalSupplyShares`, `totalBorrowAssets`, `totalBorrowShares`, `fee` | string | `Market` 结构的会计字段，直接来自链。 |
| `chain`, `zone` | string / number | 网络键和市场区域。 |

五个市场参数字段（`loanToken`, `collateralToken`, `oracle`, `irm`, `lltv`）是不可变的；将它们与链上 Moolah 合约配对以构建供应/借贷/提取调用。参见 [Smart Contract](../../lista-lending/smart-contract.md) 了解合约参考。

---

## 7. 用户供应 APY

### GET /api/moolah/supply/apy

用户当前持有抵押品的市场的每个市场供应 APY。抵押品余额为零或状态不活跃的市场被省略。

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|-----------|------|----------|-------------|
| `userAddress` | string | 是 | 用户地址。 |

#### 响应

每个市场条目数组：

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `address` | string | **市场 id (bytes32)，尽管字段名如此**——不是账户地址。 |
| `asset`, `apy`, `amount`, `usdValue` | string | 抵押品代币、市场的供应 APY、用户的抵押品数量及其 USD 值。 |

---

## 8. 市场搜索过滤器

### GET /api/moolah/market/search/:typeId

返回市场中可用的不同贷款或抵押品代币——用于填充 [`/borrow/markets`](#1-market-list) 的过滤器下拉菜单。

#### 路径参数

| 参数 | 类型 | 描述 |
|-----------|------|-------------|
| `typeId` | string | 必须是 `loan` 或 `collateral`。任何其他值返回 HTTP `400`，带有信封代码 `-1`。 |

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|-----------|------|----------|-------------|
| `chain` | string | 否 | 网络键（`bsc`、`ethereum`、`bscTest`）。默认为实时网络——生产中的 `bsc`。接受逗号分隔的值，但请注意，逗号分隔的 `chain` 会强制 `isLista` 为 `false`。 |
| `zone` | string | 否 | 逗号分隔的区域 id。 |

#### 响应

代币选项数组：

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `name` | string | 显示名称——**`WBNB` 显示为 `BNB`**，因此不要将其与您发送回的符号匹配。 |
| `value` | string | 作为过滤器值传回的代币符号。 |
| `isLista` | boolean | 当代币是 Lista DAO 策展金库的资产时为 `true`（仅贷款类型）。 |
| `icon` | string | 代币图标 URL。 |

---

## 另见

- [Overall](overall.md) — 协议范围快照。
- [Vault](vault.md) — 金库列表和详细端点。
- [Position, Liquidation, Emission](position-liquidation-emission.md) — 用户头寸和可清算账户。
- [Integration Patterns](../../lista-lending/integration-patterns.md) — 端到端集成流程。