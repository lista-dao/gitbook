# Vault API

Vault 是一个聚合合约，供应商在其中存入单一贷款资产；策展人将该流动性分配到多个借贷[市场](market.md)。Vault API 提供 vault 列表、每个 vault 的详细信息、历史存款/APY 快照以及每个市场的分配细分。

所有路径都在 **Base URL** `/api/moolah` 下。

> **链选择器。** 跨链的端点采用 **string** `chain` 参数 — `bsc`、`bscTest` 或 `ethereum` — **而不是** 数字链 ID。`/vault/list` 接受逗号分隔的列表（例如 `chain=bsc,ethereum`）；省略时默认为实时网络。详细信息和历史端点从 vault `address` 解析链，不需要 `chain` 参数。

> **列表约定。** 分页列表端点使用 `sort`（以下白名单中的字段键）+ `order`（`asc` | `desc`，默认 `desc`）进行排序。`pageSize` 默认为 `10`，最大为 `50`；`page` 从 1 开始。未识别的 `sort` 将回退到端点默认值。

---

## 1. Vault 列表

### GET /api/moolah/vault/list

具有过滤和排序功能的 vault 分页列表。

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|-----------|------|----------|-------------|
| `chain` | string | 否 | `bsc` \| `bscTest` \| `ethereum`。多个用逗号分隔（例如 `bsc,ethereum`）。默认为实时网络。 |
| `page` | number | 否 | 从 1 开始的页码。默认 `1`。 |
| `pageSize` | number | 否 | 每页项目数。默认 `10`，最大 `50`（超过 50 的值将被限制）。 |
| `assets` | string[] | 否 | 按存款资产 **symbol** 过滤。必须作为数组到达：重复键（`assets=USD1&assets=WBNB`），或对一个值使用括号形式（`assets[]=USD1`）。不支持单个裸 `assets=USD1` — 查询构建器会抛出错误，因此冷缓存返回 HTTP `500`；热缓存（见[约定](conventions.md)）可以通过返回陈旧的缓存响应来掩盖这一点。 |
| `curators` | string[] | 否 | 按策展人 **name** 过滤（例如 `Lista DAO`），精确匹配 — 地址不匹配任何内容。**重复发送**（`?curators=A&curators=B`）：单个未重复的值作为字符串到达，查询构建器对此失败 — 不支持，在冷缓存上返回 HTTP `500`（热缓存可以代替掩盖这一点）。 |
| `keyword` | string | 否 | 对 vault 名称/关键字的自由文本搜索。最大 50 个字符；如果为空则忽略。 |
| `sort` | string | 否 | 排序字段键 — `deposits`、`apy`、`utilization` 之一。未知值回退到 `deposits`。 |
| `order` | string | 否 | `asc` 或 `desc`。默认 `desc`。 |
| `zone` | number | 否 | 区域（段）过滤器。默认 `0`。|

> 结果在应用请求的 `sort` / `order` 之前按 Lista 分配的显示顺序分组。

#### 响应

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `total` | number | 匹配的 vault 总数（用于分页）。 |
| `list` | array | Vault 摘要对象。 |

**`list` 中的项目：**

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `address` | string | Vault 合约地址（**小写**）。 |
| `emissionEnabled` | number | 当此 vault 的奖励发放激活时为 `1`，否则为 `0`。序列化为整数，而不是 JSON 布尔值。 |
| `emissionDetail` | object | 按代币符号键控的奖励细分 — `{ [symbol]: { apy, total, icon } }`，或 `{}` 当没有时。注意 `/vault/allocation` 返回 `emissionDetail` 作为 **数组**，而不是按符号键控的对象。 |
| `displayDecimal` | number | 显示金额时使用的小数位数。序列化为 JSON 数字。 |
| `utilization` | string | 当前借出的存款比例，限制在 `[0, 1]`（18 位小数字符串）。 |
| `collaterals` | array | 通过此 vault 的市场可达的抵押资产（`{ id, name, icon, loanSymbol, allocation }`）。 |
| `apy`, `emissionApy`, `deposits`, `depositsUsd`, `zone`, `chain` | string / number | 主要数据，自描述。`chain` 是 `bsc` \| `ethereum` \| `bscTest`。 |
| `asset`, `assetSymbol`, `name`, `icon`, `assetIcon`, `curator`, `curatorIcon` | string | 存款资产地址/符号加显示副本和资产。 |

---

## 2. Vault 详情

### GET /api/moolah/vault/info

单个 vault 的完整详细信息，包括其策展人元数据及其分配到的抵押市场。

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|-----------|------|----------|-------------|
| `address` | string | 是 | Vault 合约地址。链从 vault 记录中解析。 |

#### 响应

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `emissionEnabled` | number | 当奖励发放激活时为 `1`，否则为 `0`。序列化为整数，而不是 JSON 布尔值。 |
| `emissionDetail` | object | 按代币符号键控的奖励细分 — `{ [symbol]: { apy, total, icon } }`，或 `{}` 当没有时。 |
| `assetPrice` | string | 存款资产的 USD 价格，**8 位小数字符串**。 |
| `displayDecimal` | number | 显示金额时使用的小数位数。序列化为 JSON 数字。 |
| `liquidity` | string | Vault 中的闲置（未分配）流动性。 |
| `address`, `asset`, `assetSymbol`, `deposits`, `apy`, `emissionApy` | string | Vault 和存款资产身份加上主要数据。 |
| `name`, `icon`, `assetIcon`, `description`, `descriptionZh`, `curator`, `curatorIcon`, `curatorDesc`, `curatorDescZh` | string | 显示副本和资产；`*Zh` 字段是中文变体。 |
| `utilization` | string | 当前借出的存款比例（**18 位小数字符串**）。与 `/vault/list` 的 `utilization` 不同，此处未在服务器端限制为 `[0, 1]` — 将超出该范围的值视为重新检查 vault 的信号，而不是解析错误。 |
| `collaterals` | array | Vault 供应到的市场 — 每个 `{ id, collateral, name, icon }`，其中 `id` 是市场 ID，`collateral` 是抵押代币地址。 |
| `curatorX`, `curatorUrl`, `styleType` | string / number | 策展人 X 句柄和网站，以及 UI 样式提示（默认为 `1`）。 |
| `createAt`, `zone`, `chain`, `status` | string / number | 创建时间戳、区域、链和 vault 状态代码。 |

> 未知的 `address` 返回空对象 `{}`。

---

## 3. Vault 存款 / APY 历史

### GET /api/moolah/vault/deposit/history
### GET /api/moolah/vault/apy/history

Vault 的总存款和 APY 在一段时间范围内的每日快照。两个端点共享相同的处理程序并返回相同的形状；`/vault/apy/history` 是 `/vault/deposit/history` 的别名。

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|-----------|------|----------|-------------|
| `address` | string | 是 | Vault 合约地址。 |
| `startTime` | number | 否\* | 范围开始，UNIX 时间戳（**秒**）（UTC 日边界）。 |
| `endTime` | number | 否\* | 范围结束，UNIX 时间戳（**秒**）（UTC 日边界）。 |

> \* 语法上可选，但省略时两者行为不同，且都不会引发错误。省略 `startTime`（或两者）返回一个**空数组**。省略 `endTime` 返回从 `startTime` 开始的**整个历史记录** — 边界作为字符串进行比较，并且它降级到的占位符排序在每个实际日期之上。请明确传递两者。

#### 响应

按日期升序排列的每日快照对象数组：

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `chartTime` | number | 当天开始的 UNIX 时间戳（秒）。 |
| `apy` | string | 当天的基础供应 APY。 |
| `emissionApy` | string | 当天的奖励/发放 APY。 |
| `totalAssets` | string | 当天 vault 中的总资产（代币单位）。 |
| `totalAssetsUsd` | string | 当天以 USD 计价的总资产。 |

---

## 4. Vault 分配

### GET /api/moolah/vault/allocation

> 响应还包括一个合成的 **"Idle Market"** 行，表示未分配的流动性。它忽略 `keyword` 和 `zone` 过滤器，`collateralSymbol`、`collateralIcon`、`icon`、`liquidity`、`utilization` 和 `smartCollateralConfig` 在其上均为 `null`。严格类型的客户端将无法解析响应，除非这些字段被建模为可为空。

Vault 的流动性在其借贷市场中的分配细分的分页。

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|-----------|------|----------|-------------|
| `address` | string | 是 | Vault 合约地址。 |
| `page` | number | 否 | 从 1 开始的页码。默认 `1`。 |
| `pageSize` | number | 否 | 每页项目数。默认 `10`，最大 `50`。 |
| `sort` | string | 否 | 排序字段键 — `allocation`、`totalSupply`、`liquidity`、`utilization`、`cap`、`borrowRate` 之一。默认 `totalSupply`。 |
| `order` | string | 否 | `asc` 或 `desc`。默认 `desc`。 |
| `keyword` | string | 否 | 对分配市场的抵押名称/关键字的自由文本搜索。 |
| `zone` | string | 否 | 应用于基础市场的逗号分隔的区域（段）过滤器。 |

> 行首先按内部市场 `priority` 预排序，然后按请求的 `sort`/`order` 排序。未知的 vault `address` 返回 `{ total: 0, list: [] }`。

#### 响应

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `total` | number | 分配的市场总数（用于分页）。 |
| `list` | array | 分配行。 |

**`list` 中的项目：**

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `id` | string | 流动性分配到的市场标识符。 |
| `name`, `collateralSymbol`, `loanSymbol` | string | 市场显示名称和两个代币符号。 |
| `icon`, `collateralIcon`, `loanIcon` | string | 显示资产。 |
| `allocation` | string | 分配给此市场的 vault 流动性金额。 |
| `totalSupply` | string | 为此市场跟踪的 vault 供应金额。 |
| `cap` | string | Vault 为此市场设置的供应上限。 |
| `liquidity` | string | 市场可借用的流动性（18 位小数字符串）。 |
| `price` | string | 贷款资产的 USD 价格（8 位小数字符串）。 |
| `supplyApy` | string | 此市场的供应 APY。 |
| `zone` | number | 市场的区域（段）。 |
| `smartCollateralConfig` | object | 市场的智能抵押配置（如果有）。 |
| `utilization` | string | 市场利用率（借用/供应）。 |
| `borrowRate` | string | 市场的当前借款利率。 |
| `emissionDetail` | array | 此市场的奖励细分。在这里是 **数组**，与 `/vault/list` 上按符号键控的对象不同。 |
| `rewards` | array | 附加到市场的奖励代币条目。 |

---

## 注意事项

- **金额是字符串。** 代币计价和 APY/USD 值以小数字符串返回以保持精度；使用 `displayDecimal` 提示进行展示。
- **经济值来自索引器和短期缓存，而不是实时链读取。** APY、利用率、存款、上限和发放数字反映当前协议状态，并且可以在链上由治理/管理者调整 — 将它们视为快照，而不是固定条款。
- 有关分配背后的每个市场利率、LLTV 和预言机详细信息，请参见 [Market API](market.md)。有关协议范围内的总数，请参见 [Overall](overall.md)。