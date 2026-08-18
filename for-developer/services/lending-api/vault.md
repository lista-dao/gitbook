# 金库 API

金库是 LP 存入资产的聚合合约；其流动性会被分配到多个借贷市场。以下所有路径均位于 **Base URL** `/api/moolah` 之下。

---

## 1. 金库列表

### GET /api/moolah/vault/list

支持过滤与排序的金库分页列表。

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/vault/list` |

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `chainId` | number / string | 否 | 按链过滤（例如 56、1）。 |
| `page` | number | 否 | 页码（从 1 开始）。默认值：1。 |
| `pageSize` | number | 否 | 每页条数。默认值：10 或 20。 |
| `sortBy` | string | 否 | 排序字段（例如 `totalAssets`、`apy`、`createdAt`）。 |
| `sortOrder` | string | 否 | `asc` 或 `desc`。 |

#### 响应

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `list` | array | 金库对象列表。 |
| `total` | number | 总条数（用于分页）。 |

**`list` 中的条目：**

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `vaultId` | string | 金库标识符（例如合约地址）。 |
| `chainId` | number | 链 ID。 |
| `asset` | string | 存款资产地址或代号。 |
| `assetSymbol` | string | 代号（例如 WBNB、USD1）。 |
| `totalAssets` | string | 金库内总资产（可读格式）。 |
| `totalAssetsUsd` | string | 以 USD 计的总价值。 |
| `apy` | string | 当前存款 APY。 |
| `marketCount` | number | 该金库分配流动性的市场数量。 |

---

## 2. 金库详情

### GET /api/moolah/vault/info

单个金库的完整详情。

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/vault/info` |

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `vaultId` | string | 是 | 金库标识符（例如合约地址）。 |
| `chainId` | number / string | 否 | 链 ID（若该金库存在于多条链上则为必填）。 |

#### 响应

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `vaultId` | string | 金库标识符。 |
| `chainId` | number | 链 ID。 |
| `asset` | string | 存款资产地址。 |
| `assetSymbol` | string | 代号。 |
| `totalAssets` | string | 总资产。 |
| `totalAssetsUsd` | string | 以 USD 计的总价值。 |
| `apy` | string | 当前存款 APY。 |
| `marketIds` | array | 该金库供应流动性的市场 ID 列表。 |
| `allocationSummary` | object / array | 各市场的分配情况（金额或比例）。 |

---

## 3. 金库存款 / APY 历史

### GET /api/moolah/vault/deposit/history  
### GET /api/moolah/vault/apy/history

两者均返回某金库在指定时间区间内存款规模与 APY 的每日快照。响应结构相同。

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/vault/deposit/history` 或 `/api/moolah/vault/apy/history` |

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `vaultId` | string | 是 | 金库标识符。 |
| `chainId` | number / string | 否 | 链 ID。 |
| `startTime` | number / string | 否 | 起始时间戳（秒或毫秒）。 |
| `endTime` | number / string | 否 | 结束时间戳。 |

#### 响应

每日快照对象数组：

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `date` | string | 日期（例如 YYYY-MM-DD）。 |
| `timestamp` | number | 当日起始时间戳。 |
| `totalDeposit` | string | 该日金库内的总存款。 |
| `totalDepositUsd` | string | 以 USD 计的价值。 |
| `apy` | string | 该日的 APY。 |

---

## 4. 金库分配

### GET /api/moolah/vault/allocation

金库流动性在各市场间分配情况的分页列表。

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/vault/allocation` |

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `vaultId` | string | 是 | 金库标识符。 |
| `chainId` | number / string | 否 | 链 ID。 |
| `page` | number | 否 | 页码。 |
| `pageSize` | number | 否 | 每页条数。 |

#### 响应

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `list` | array | 分配记录行。 |
| `total` | number | 总条数。 |

**`list` 中的条目：**

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `marketId` | string | 市场标识符。 |
| `allocatedAssets` | string | 分配到该市场的数量。 |
| `proportion` | string | 占比（例如 0.5 = 50%）。 |
| `apy` | string | 该市场的存款 APY。 |
