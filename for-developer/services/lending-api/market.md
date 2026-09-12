# Market API

A lending market is defined by a collateral/loan asset pair, an LLTV, an interest rate model (IRM), and an oracle. These endpoints expose market listings, per-market detail, the vaults that fund a market, historical borrow/supply series, and the raw on-chain market parameters used to build transactions.

All paths are under **Base URL** `/api/moolah`. List and detail responses are served from a short-lived server-side cache, so values reflect the last sync rather than live on-chain state. USD and asset amounts are returned as fixed-point decimal strings (18 decimal places) unless noted. `GET /allMarkets` is the exception — it returns raw on-chain base units throughout, despite no field name ending in `Wei`. It also carries **no decimals fields**, unlike the liquidation feeds, so read `decimals()` from each token contract rather than assuming 18. This bites on Ethereum, where USDT and USDC are 6-decimal: defaulting to 18 puts them out by 1e12. Their BSC counterparts are 18-decimal, so the same assumption happens to work there — which is exactly why it goes unnoticed until an Ethereum market is read.

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
| `sort` | string | No | Sort key: `rate`, `liquidity`, `lltv`, `loan`, `collateral`, or `termType`. Unrecognized values fall back to the net borrow rate — the same ordering as `sort=rate`. Note `rate` orders by the **net** borrow rate (gross minus borrow-emission APY) while the response returns the gross `rate`, and `liquidity` orders by the USD value. Results are grouped by a Lista-assigned display order first, with `sort` / `order` applied within each group. |
| `order` | string | No | Sort direction: `asc` or `desc` (case-insensitive). Defaults to `desc` when omitted or unrecognised. |
| `keyword` | string | No | Free-text search over loan/collateral symbols. Max length 50. |
| `loans` | string[] | No | Filter by loan token symbol(s). Repeat the param for multiple values (e.g. `loans=USDT&loans=USDC`). |
| `collaterals` | string[] | No | Filter by collateral token symbol(s). Repeatable. |
| `zone` | string | No | Comma-separated zone id(s). Defaults to `0`, which is a **filter, not "all"** — the default response excludes bStock (`5`) and smart-collateral (`3`) markets. Pass the zones you want explicitly. Zone `10` is the idle marker and is always excluded. |
| `termType` | number | No | **Exact match** on the market's term type — `1` for fixed-term, `0` for perpetual. It is `AND`-ed with `zone` rather than widening it: fixed-term markets sit almost entirely at `zone = 0`, so a `zone` that excludes `0` returns none of them. Unvalidated, so a non-numeric value coerces to `0` and silently returns perpetual markets. Unset means no term filter. `GET /borrow/marketList?biztype=fixedTerm` is a separate fixed-term feed. |
| `chain` | string | No | Network key (`bsc`, `ethereum`, `bscTest`). Defaults to the live network — `bsc` in production. Not validated: an unrecognised key returns an empty result, not a `400`. |

> **Repeat array parameters; do not send a single bare value.** An un-repeated array value arrives as a string and the query builder throws, so the request fails with HTTP `500` rather than returning an empty list — `?loans=` / `?collaterals=` here, and `?assets=` / `?curators=` on `/vault/list`. Use the repeated form (`?loans=USD1&loans=USDT`), or the bracket form for a single value (`?loans[]=USD1`). (`/api/liquidation/zone/list` and `/history` behave differently: they match nothing instead of failing. `/closeToLiquidate` accepts a single bare value.)

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total count matching the filters (before pagination). |
| `list` | array | Market objects for the current page. |

**Item in `list`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Market identifier (bytes32). |
| `lltv` | string | Liquidation loan-to-value as a **decimal fraction** (e.g. `0.86`). Note `GET /allMarkets` returns the same field scaled to 1e18. |
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
| `smartCollateralConfig` | object | Smart-collateral configuration when the market uses one; an empty object `{}` when it does not (never `null`). |

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

Returns the market object. When the id is unknown the response omits the `data` key altogether rather than returning an empty object, so read it defensively — `res.data.marketId` throws in that case.

| Field | Type | Description |
|-------|------|-------------|
| `marketId` | string | Market identifier. |
| `description` | string | English market description. |
| `descriptionZh` | string | Chinese market description. |
| `curator` | string | Curator name. |
| `curatorIcon` | string | Curator icon URL. |
| `performanceFeeRate` | number | Market performance fee rate, **1e18-scaled** — 10% arrives as `100000000000000000`, not `0.1`. |
| `borrowRate` | number | Current borrow rate. |
| `supplyApy` | string | Supply APY. |
| `loanToken` | string | Loan token address. |
| `loanTokenName` | string | Loan token name/symbol. |
| `loanTokenIcon` | string | Loan token icon URL. |
| `loanTokenPrice` | number | Loan token price, as a JSON float — unlike most amount fields on this page, which are decimal strings. |
| `collateralToken` | string | Collateral token address. |
| `collateralTokenName` | string | Collateral token name/symbol. |
| `collateralTokenIcon` | string | Collateral token icon URL. |
| `oracle` | string | Oracle contract address. |
| `zone` | number | Market zone. |
| `chain` | string | Network key. |
| `rewards` | array | Reward token configuration entries. |
| `collateralOracles` | array | Oracle config(s) resolving the collateral price. |
| `loanOracles` | array | Oracle config(s) resolving the loan price. |
| `smartCollateralConfig` | object | Smart-collateral configuration when the market uses one; an empty object `{}` when it does not (never `null`). |

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

> **Note:** this endpoint returns a **protocol-wide** total-borrow series. The `:marketId` path segment is accepted for route compatibility but does not filter the result — for per-market history use `GET /api/moolah/market/borrowRate/:marketId`.

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

Returns active, liquidatable markets with their raw on-chain parameters. A small server-side denylist withholds specific markets, so do not treat this as a provably exhaustive list — the values needed to build Moolah transactions (`MarketParams`-equivalent) and to read totals directly. No pagination and **no query parameters**.

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
| `typeId` | string | Must be `loan` or `collateral`. Any other value returns HTTP `400` with envelope code `-1`. |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chain` | string | No | Network key (`bsc`, `ethereum`, `bscTest`). Defaults to the live network — `bsc` in production. Comma-separated values accepted, but note a comma-separated `chain` forces `isLista` to `false` for every row. |
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
