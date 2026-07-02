# Market API

A lending market is defined by a collateral/loan asset pair, an LLTV, an interest rate model (IRM), and an oracle. These endpoints expose market listings, per-market detail, the vaults that fund a market, historical borrow/supply series, and the raw on-chain market parameters used to build transactions.

All paths are under **Base URL** `/api/moolah`. List and detail responses are served from a short-lived server-side cache, so values reflect the last sync rather than live on-chain state. USD and asset amounts are returned as fixed-point decimal strings (18 decimal places) unless noted.

The `chain` query parameter is a **string network key** (`bsc`, `ethereum`, `bscTest`), not a numeric chain ID. When omitted it defaults to the live network (`bsc` in production). List sorting uses the pair `sort` (a field key) + `order` (`asc` | `desc`), not `sortBy`/`sortOrder`.

---

## 1. Market list

### GET /api/moolah/borrow/markets

Paginated list of borrow markets with sorting and filtering.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/borrow/markets` |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (1-based). Defaults to `1`. |
| `pageSize` | number | No | Items per page. Defaults to `10`, capped at `50`. |
| `sort` | string | No | Sort key: `rate`, `liquidity`, `lltv`, `loan`, or `collateral`. Unrecognized values fall back to borrow rate. |
| `order` | string | **Yes** | Sort direction: `asc` or `desc` (case-insensitive). Required for this endpoint — always send it, even when relying on the default `sort`. |
| `keyword` | string | No | Free-text search over loan/collateral symbols. Max length 50. |
| `loans` | string[] | No | Filter by loan token symbol(s). Repeat the param for multiple values (e.g. `loans=USDT&loans=USDC`). |
| `collaterals` | string[] | No | Filter by collateral token symbol(s). Repeatable. |
| `zone` | string | No | Comma-separated zone id(s). Defaults to `0`. |
| `chain` | string | No | Network key (`bsc`, `ethereum`, `bscTest`). Defaults to `bsc`. |

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total count matching the filters (before pagination). |
| `list` | array | Market objects for the current page. |

**Item in `list`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Market identifier (bytes32). |
| `lltv` | string | Liquidation loan-to-value. |
| `liquidity` | string | Available liquidity in loan-token units (decimal-adjusted). |
| `liquidityUsd` | string | Available liquidity in USD. |
| `loan` | string | Loan token name/symbol. |
| `loanIcon` | string | Loan token icon URL. |
| `collateral` | string | Collateral token name/symbol. |
| `rate` | string | Borrow rate. |
| `supplyApy` | string | Supply APY. |
| `vaults` | array | Vaults supplying this market, each `{ name, address, icon }`. |
| `icon` | string | Market icon URL. |
| `zone` | number | Market zone. |
| `chain` | string | Network key. |
| `rewards` | array | Reward token configuration entries. |
| `smartCollateralConfig` | object \| null | Smart-collateral configuration when the market uses one. |

---

## 2. Market detail

### GET /api/moolah/market/:marketId

Full details for one market, including curator metadata and oracle configuration.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/market/:marketId` |

#### Path parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `marketId` | string | Market identifier (bytes32). |

#### Response

Returns the market object, or empty when the id is unknown.

| Field | Type | Description |
|-------|------|-------------|
| `marketId` | string | Market identifier. |
| `description` | string | English market description. |
| `descriptionZh` | string | Chinese market description. |
| `curator` | string | Curator name. |
| `curatorIcon` | string | Curator icon URL. |
| `performanceFeeRate` | number | Market performance fee rate. |
| `borrowRate` | number | Current borrow rate. |
| `supplyApy` | string | Supply APY. |
| `loanToken` | string | Loan token address. |
| `loanTokenName` | string | Loan token name/symbol. |
| `loanTokenIcon` | string | Loan token icon URL. |
| `loanTokenPrice` | string | Loan token price. |
| `collateralToken` | string | Collateral token address. |
| `collateralTokenName` | string | Collateral token name/symbol. |
| `collateralTokenIcon` | string | Collateral token icon URL. |
| `oracle` | string | Oracle contract address. |
| `zone` | number | Market zone. |
| `chain` | string | Network key. |
| `rewards` | array | Reward token configuration entries. |
| `collateralOracles` | array | Oracle config(s) resolving the collateral price. |
| `loanOracles` | array | Oracle config(s) resolving the loan price. |
| `smartCollateralConfig` | object \| null | Smart-collateral configuration when present. |

The response also carries deprecated price-logic fields (`collateralPriceLogic`, `collateralPriceLogicCn`, `loanPriceLogic`, `loanPriceLogicCn`); prefer `collateralOracles` / `loanOracles` for oracle information and treat the legacy fields as soft-deprecated.

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
| `page` | number | No | Page number. Defaults to `1`. |
| `pageSize` | number | No | Items per page. Defaults to `10`, capped at `20`. |
| `order` | string | No | Sort direction: `asc` or `desc`. Defaults to `desc`. Results are always ordered by each vault's supply to the market (`totalSupply`). |

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Number of entries returned. |
| `list` | array | Vault entries. |

**Item in `list`:**

| Field | Type | Description |
|-------|------|-------------|
| `address` | string | Vault contract address. |
| `name` | string | Vault name. |
| `icon` | string | Vault icon URL. |
| `curator` | string | Curator name. |
| `curatorIcon` | string | Curator icon URL. |
| `totalSupply` | string | Amount this vault supplies to the market. |
| `supplyShare` | string | This vault's share of the market's total supply (proportion). |
| `collateralPrice` | string | Collateral token price for the market. |

---

## 4. Market borrow rate history

### GET /api/moolah/market/borrowRate/:marketId

Historical borrow rate and supply APY series for a market. Points are bucketed by day.

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
| `startTime` | number | No | Start time, Unix seconds. Defaults to one week ago. |
| `endTime` | number | No | End time, Unix seconds. Defaults to now. |

#### Response

Array of rate points:

| Field | Type | Description |
|-------|------|-------------|
| `rate` | string | Borrow rate at the point. |
| `supplyApy` | string | Supply APY at the point. |
| `chartTime` | number | Point time, Unix seconds. |

---

## 5. Total-borrow history (protocol-wide)

### GET /api/moolah/market/totalBorrow/:marketId

Historical **protocol-wide** total borrowed (in USD), bucketed by day.

> **Note:** despite the `:marketId` path segment, the current implementation does **not** filter by market — it sums `borrow_usd` across all markets per day, and `:marketId` only varies the response cache key. Every `marketId` therefore returns the same protocol-wide series.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/market/totalBorrow/:marketId` |

#### Path parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `marketId` | string | Market identifier. |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startTime` | number | No | Start time, Unix seconds. Defaults to one week ago. |
| `endTime` | number | No | End time, Unix seconds. Defaults to now. |

#### Response

Array of points:

| Field | Type | Description |
|-------|------|-------------|
| `totalBorrow` | string | Protocol-wide total borrowed in USD at the point. |
| `chartTime` | number | Point time, Unix seconds. |

---

## 6. All markets (on-chain parameters)

### GET /api/moolah/allMarkets

Returns every active, liquidatable market with its raw on-chain parameters — the values needed to build Moolah transactions (`MarketParams`-equivalent) and to read totals directly. No pagination and **no query parameters**.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/allMarkets` |

#### Response

Array of market parameter objects:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Market id (bytes32). |
| `loanToken` | string | Loan token address. |
| `collateralToken` | string | Collateral token address. |
| `oracle` | string | Oracle contract address. |
| `irm` | string | Interest rate model contract address. |
| `lltv` | string | Liquidation LTV, scaled to 1e18. |
| `totalSupplyAssets` | string | Total supplied assets (on-chain). |
| `totalSupplyShares` | string | Total supply shares (on-chain). |
| `totalBorrowAssets` | string | Total borrowed assets (on-chain). |
| `totalBorrowShares` | string | Total borrow shares (on-chain). |
| `fee` | string | Market fee (on-chain). |
| `lastUpdate` | number | Last on-chain accrual timestamp. |
| `chain` | string | Network key. |
| `zone` | number | Market zone. |

The first five fields (`loanToken`, `collateralToken`, `oracle`, `irm`, `lltv`) are the immutable market parameters; pair them with the on-chain Moolah contract to construct supply/borrow/withdraw calls. See [Smart Contract](../../lista-lending/smart-contract.md) for the contract reference.

---

## 7. User supply APY

### GET /api/moolah/supply/apy

Per-market supply APY for the markets where a given user currently holds collateral. Markets with a zero collateral balance or inactive status are omitted.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/supply/apy` |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAddress` | string | Yes | The user's address. |

#### Response

Array of per-market entries:

| Field | Type | Description |
|-------|------|-------------|
| `address` | string | Market id (bytes32). |
| `asset` | string | Collateral token address. |
| `apy` | string | Supply APY for the market. |
| `amount` | string | User's collateral amount in the market. |
| `usdValue` | string | User's collateral value in USD. |

---

## 8. Market search filters

### GET /api/moolah/market/search/:typeId

Returns the distinct loan or collateral tokens available across markets — used to populate filter dropdowns for [`/borrow/markets`](#1-market-list).

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/market/search/:typeId` |

#### Path parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `typeId` | string | Must be `loan` or `collateral`. Any other value returns `400`. |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chain` | string | No | Network key (`bsc`, `ethereum`, `bscTest`). Defaults to `bsc`. Comma-separated values accepted. |
| `zone` | string | No | Comma-separated zone id(s). |

#### Response

Array of token options:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name (`WBNB` is surfaced as `BNB`). |
| `value` | string | Token symbol to pass back as a filter value. |
| `icon` | string | Token icon URL. |
| `isLista` | boolean | `true` when the token is the asset of a Lista DAO-curated vault (loan type only). |

---

## See also

- [Overall](overall.md) — protocol-wide snapshot.
- [Vault](vault.md) — vault listing and detail endpoints.
- [Position, Liquidation, Emission](position-liquidation-emission.md) — user positions and liquidatable accounts.
- [Lista Lending Smart Contract](../../lista-lending/smart-contract.md) — on-chain Moolah reference.
- [Integration Patterns](../../lista-lending/integration-patterns.md) — end-to-end integration flows.
