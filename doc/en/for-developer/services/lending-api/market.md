# Market API

A lending market is defined by a collateral/loan asset pair, LLTV, and oracle. All paths are under **Base URL** `/api/moolah`.

---

## 1. Market list

### GET /api/moolah/borrow/markets

Paginated list of borrow markets with filters.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/borrow/markets` |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chainId` | number / string | No | Filter by chain. |
| `collateralAsset` | string | No | Collateral token address. |
| `loanAsset` | string | No | Loan token address. |
| `page` | number | No | Page number. |
| `pageSize` | number | No | Items per page. |
| `sortBy` | string | No | e.g. `totalBorrow`, `borrowApy`. |
| `sortOrder` | string | No | `asc` or `desc`. |

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `list` | array | Market objects. |
| `total` | number | Total count. |

**Item in `list`:**

| Field | Type | Description |
|-------|------|-------------|
| `marketId` | string | Market identifier. |
| `chainId` | number | Chain ID. |
| `collateralAsset` | string | Collateral token address. |
| `collateralSymbol` | string | Collateral symbol. |
| `loanAsset` | string | Loan token address. |
| `loanSymbol` | string | Loan symbol. |
| `lltv` | string | Liquidation LTV (e.g. 0.8). |
| `totalSupply` | string | Total supplied. |
| `totalBorrow` | string | Total borrowed. |
| `supplyApy` | string | Supply APY. |
| `borrowApy` | string | Borrow APY. |
| `utilization` | string | Utilization ratio. |

---

## 2. Market detail

### GET /api/moolah/market/:marketId

Full details for one market, including oracles.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/market/:marketId` |

#### Path parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `marketId` | string | Market identifier (e.g. bytes32 or address). |

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `marketId` | string | Market identifier. |
| `chainId` | number | Chain ID. |
| `collateralAsset` | string | Collateral token address. |
| `collateralSymbol` | string | Symbol. |
| `loanAsset` | string | Loan token address. |
| `loanSymbol` | string | Symbol. |
| `lltv` | string | Liquidation LTV. |
| `totalSupply` | string | Total supplied. |
| `totalBorrow` | string | Total borrowed. |
| `supplyApy` | string | Supply APY. |
| `borrowApy` | string | Borrow APY. |
| `utilization` | string | Utilization. |
| `collateralOracles` | array | Oracle config(s) for collateral. |
| `loanOracles` | array | Oracle config(s) for loan asset. |

**Oracle item** (in `collateralOracles` / `loanOracles`):

| Field | Type | Description |
|-------|------|-------------|
| `address` | string | Oracle contract address. |
| `url` | string | Optional explorer or doc URL. |
| `descEn` | string | English description. |
| `descCn` | string | Chinese description. |

For **PT-style (principal token)** collateral, items may also include:

| Field | Type | Description |
|-------|------|-------------|
| `discountOracle` | string | Discount oracle address. |
| `baseTokenOracle` | string | Base token oracle address. |
| `baseToken` | string | Base token address. |
| `baseTokenSymbol` | string | Base token symbol. |

---

## 3. Vaults by market

### GET /api/moolah/market/vault/:marketId

Paginated list of vaults that supply liquidity to the given market.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/market/vault/:marketId` |

#### Path parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `marketId` | string | Market identifier. |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number. |
| `pageSize` | number | No | Items per page. |

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `list` | array | Vault entries. |
| `total` | number | Total count. |

**Item in `list`:**

| Field | Type | Description |
|-------|------|-------------|
| `vaultId` | string | Vault identifier. |
| `allocatedAmount` | string | Amount supplied to this market. |
| `share` | string | Share of market supply (e.g. proportion). |

---

## 4. Market borrow rate history

### GET /api/moolah/market/borrowRate/:marketId

Historical borrow rate (or APY) for the market.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/market/borrowRate/:marketId` |

#### Path parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `marketId` | string | Market identifier. |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startTime` | number / string | No | Start timestamp. |
| `endTime` | number / string | No | End timestamp. |
| `interval` | string | No | e.g. `day`, `hour`. |

#### Response

Array of rate points:

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | number | Point time. |
| `borrowRate` | string | Borrow rate (per second or annual). |
| `borrowApy` | string | Borrow APY. |

---

## 5. All markets (on-chain)

### GET /api/moolah/allMarkets

Returns all markets with **on-chain base parameters** (for building transaction params). No pagination.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/allMarkets` |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chainId` | number / string | No | Filter by chain. Omit for all chains. |

#### Response

Array of market config objects. Each item typically includes:

| Field | Type | Description |
|-------|------|-------------|
| `marketId` | string | Market id (e.g. bytes32). |
| `chainId` | number | Chain ID. |
| `collateralAsset` | string | Collateral token address. |
| `loanAsset` | string | Loan token address. |
| `oracle` | string | Oracle contract address. |
| `lltv` | string | Liquidation LTV. |
| `irm` | string | Interest rate model address. |

Exact fields follow the contract’s `MarketParams` or equivalent.

---

## 6. Market search / filters

### GET /api/moolah/market/search/:typeId

Returns filter options or search results for markets by type (e.g. collateral type, category).

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/market/search/:typeId` |

#### Path parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `typeId` | string | Filter type (e.g. `collateral`, `category`). |

#### Response

Shape is implementation-specific: often an array of options `{ value, label }` or a list of market IDs matching the type.
