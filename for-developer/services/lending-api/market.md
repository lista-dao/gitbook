# 市场 API

一个借贷市场由抵押品/借款资产对、LLTV 与预言机共同定义。以下所有路径均位于 **Base URL** `/api/moolah` 之下。

---

## 1. 市场列表

### GET /api/moolah/borrow/markets

支持过滤的借款市场分页列表。

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/borrow/markets` |

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `chainId` | number / string | 否 | 按链过滤。 |
| `collateralAsset` | string | 否 | 抵押品代币地址。 |
| `loanAsset` | string | 否 | 借款代币地址。 |
| `page` | number | 否 | 页码。 |
| `pageSize` | number | 否 | 每页条数。 |
| `sortBy` | string | 否 | 例如 `totalBorrow`、`borrowApy`。 |
| `sortOrder` | string | 否 | `asc` 或 `desc`。 |

#### 响应

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `list` | array | 市场对象。 |
| `total` | number | 总条数。 |

**`list` 中的条目：**

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `marketId` | string | 市场标识符。 |
| `chainId` | number | 链 ID。 |
| `collateralAsset` | string | 抵押品代币地址。 |
| `collateralSymbol` | string | 抵押品代号。 |
| `loanAsset` | string | 借款代币地址。 |
| `loanSymbol` | string | 借款资产代号。 |
| `lltv` | string | 清算 LTV（例如 0.8）。 |
| `totalSupply` | string | 总供应量。 |
| `totalBorrow` | string | 总借款量。 |
| `supplyApy` | string | 存款 APY。 |
| `borrowApy` | string | 借款 APY。 |
| `utilization` | string | 资金利用率。 |

---

## 2. 市场详情

### GET /api/moolah/market/:marketId

单个市场的完整详情，包含预言机信息。

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/market/:marketId` |

#### 路径参数

| 参数 | 类型 | 说明 |
|-----------|------|-------------|
| `marketId` | string | 市场标识符（例如 bytes32 或地址）。 |

#### 响应

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `marketId` | string | 市场标识符。 |
| `chainId` | number | 链 ID。 |
| `collateralAsset` | string | 抵押品代币地址。 |
| `collateralSymbol` | string | 代号。 |
| `loanAsset` | string | 借款代币地址。 |
| `loanSymbol` | string | 代号。 |
| `lltv` | string | 清算 LTV。 |
| `totalSupply` | string | 总供应量。 |
| `totalBorrow` | string | 总借款量。 |
| `supplyApy` | string | 存款 APY。 |
| `borrowApy` | string | 借款 APY。 |
| `utilization` | string | 资金利用率。 |
| `collateralOracles` | array | 抵押品的预言机配置。 |
| `loanOracles` | array | 借款资产的预言机配置。 |

**预言机条目**（位于 `collateralOracles` / `loanOracles` 中）：

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `address` | string | 预言机合约地址。 |
| `url` | string | 可选的区块浏览器或文档链接。 |
| `descEn` | string | 英文描述。 |
| `descCn` | string | 中文描述。 |

对于 **PT 类（本金代币）**抵押品，条目还可能包含：

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `discountOracle` | string | 折价预言机地址。 |
| `baseTokenOracle` | string | 基础代币预言机地址。 |
| `baseToken` | string | 基础代币地址。 |
| `baseTokenSymbol` | string | 基础代币代号。 |

---

## 3. 按市场查询金库

### GET /api/moolah/market/vault/:marketId

向指定市场提供流动性的金库分页列表。

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/market/vault/:marketId` |

#### 路径参数

| 参数 | 类型 | 说明 |
|-----------|------|-------------|
| `marketId` | string | 市场标识符。 |

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `page` | number | 否 | 页码。 |
| `pageSize` | number | 否 | 每页条数。 |

#### 响应

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `list` | array | 金库条目。 |
| `total` | number | 总条数。 |

**`list` 中的条目：**

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `vaultId` | string | 金库标识符。 |
| `allocatedAmount` | string | 向该市场供应的数量。 |
| `share` | string | 在该市场供应量中的占比（例如比例值）。 |

---

## 4. 市场借款利率历史

### GET /api/moolah/market/borrowRate/:marketId

该市场的历史借款利率（或 APY）。

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/market/borrowRate/:marketId` |

#### 路径参数

| 参数 | 类型 | 说明 |
|-----------|------|-------------|
| `marketId` | string | 市场标识符。 |

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `startTime` | number / string | 否 | 起始时间戳。 |
| `endTime` | number / string | 否 | 结束时间戳。 |
| `interval` | string | 否 | 例如 `day`、`hour`。 |

#### 响应

利率数据点数组：

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `timestamp` | number | 数据点时间。 |
| `borrowRate` | string | 借款利率（每秒或年化）。 |
| `borrowApy` | string | 借款 APY。 |

---

## 5. 全部市场（链上）

### GET /api/moolah/allMarkets

返回带有**链上基础参数**的全部市场（用于构造交易参数）。不分页。

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/allMarkets` |

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `chainId` | number / string | 否 | 按链过滤。省略则返回所有链。 |

#### 响应

市场配置对象数组。每个条目通常包含：

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `marketId` | string | 市场 ID（例如 bytes32）。 |
| `chainId` | number | 链 ID。 |
| `collateralAsset` | string | 抵押品代币地址。 |
| `loanAsset` | string | 借款代币地址。 |
| `oracle` | string | 预言机合约地址。 |
| `lltv` | string | 清算 LTV。 |
| `irm` | string | 利率模型地址。 |

确切字段以合约的 `MarketParams` 或等效结构为准。

---

## 6. 市场搜索 / 过滤

### GET /api/moolah/market/search/:typeId

按类型（例如抵押品类型、分类）返回市场的过滤选项或搜索结果。

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/market/search/:typeId` |

#### 路径参数

| 参数 | 类型 | 说明 |
|-----------|------|-------------|
| `typeId` | string | 过滤类型（例如 `collateral`、`category`）。 |

#### 响应

结构因实现而异：通常是 `{ value, label }` 选项数组，或与该类型匹配的市场 ID 列表。
