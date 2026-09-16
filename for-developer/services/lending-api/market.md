# Market API

A lending market is defined by a collateral/loan asset pair, an LLTV, an interest rate model (IRM), and an oracle. These endpoints expose market listings, per-market detail, the vaults that fund a market, historical borrow/supply series, and the raw on-chain market parameters used to build transactions.

All paths are under **Base URL** `/api/moolah`. List and detail responses are served from a short-lived server-side cache, so values reflect the last sync rather than live on-chain state. USD and asset amounts are returned as fixed-point decimal strings (18 decimal places) unless noted. `GET /allMarkets` is the exception — it returns raw on-chain base units throughout, despite no field name ending in `Wei`. It also carries **no decimals fields**, unlike the liquidation feeds, so read `decimals()` from each token contract rather than assuming 18. On Ethereum, USDT and USDC use 6 decimals, so treating them as 18-decimal values scales them incorrectly by `1e12`. Their BSC counterparts use 18 decimals.

See [Conventions](conventions.md) for the chain selector, pagination and sorting — note the parameter pair is `sort` + `order`, not `sortBy`/`sortOrder`.

---

## 1. Market list

### GET /api/moolah/borrow/markets

Paginated list of borrow markets with sorting and filtering.

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

> **Repeat array parameters; do not send a single bare value.** An un-repeated array value arrives as a string and the query builder throws — unsupported, and on a cold cache the request fails with HTTP `500` rather than returning an empty list. A warm cache (see [Conventions](conventions.md)) can instead mask this and return a stale cached response regardless of the filter, so the absence of a `500` in one test does not mean the bare form is safe. This applies to `?loans=` / `?collaterals=` here, and `?assets=` / `?curators=` on `/vault/list`. Use the repeated form (`?loans=USD1&loans=USDT`), or the bracket form for a single value (`?loans[]=USD1`). (`/api/liquidation/zone/list` and `/history` have a different failure mode: a bare value is spread character by character into the `IN (…)` list — `?loans=USD1` matches rows whose loan token is `U`. `/closeToLiquidate` normalises a single bare value correctly.)

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total count matching the filters (before pagination). |
| `list` | array | Market objects for the current page. |

**Item in `list`:**

| Field | Type | Description |
|-------|------|-------------|
| `lltv` | string | Liquidation loan-to-value as a **decimal fraction** (e.g. `0.86`). Note `GET /allMarkets` returns the same field scaled to 1e18. |
| `liquidity` | string | Available liquidity in loan-token units (decimal-adjusted). |
| `smartCollateralConfig` | object | Smart-collateral configuration when the market uses one; an empty object `{}` when it does not (never `null`). |
| `id`, `loan`, `collateral`, `rate`, `supplyApy`, `liquidityUsd`, `zone`, `chain` | string / number | Identifier and headline figures, self-describing. |
| `loanIcon`, `icon` | string | Display assets. |
| `vaults`, `rewards` | array | Vaults supplying this market (`{ name, address, icon }`) and its reward-token entries. |

---

## 2. Market detail

### GET /api/moolah/market/:marketId

Full details for one market, including curator metadata and oracle configuration.

#### Path parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `marketId` | string | Market identifier (bytes32). |

#### Response

Returns the market object. When the id is unknown the response omits the `data` key altogether rather than returning an empty object, so read it defensively — `res.data.marketId` throws in that case.

| Field | Type | Description |
|-------|------|-------------|
| `performanceFeeRate` | number | Market performance fee rate, **1e18-scaled** — 10% arrives as `100000000000000000`, not `0.1`. |
| `loanTokenPrice` | number | Loan token price, as a JSON float — unlike most amount fields on this page, which are decimal strings. |
| `smartCollateralConfig` | object | Smart-collateral configuration when the market uses one; an empty object `{}` when it does not (never `null`). |
| `marketId`, `loanToken`, `collateralToken`, `oracle` | string | Addresses and the market id. |
| `borrowRate`, `supplyApy`, `zone`, `chain` | string / number | Headline figures, self-describing. |
| `description`, `descriptionZh`, `curator`, `curatorIcon`, `loanTokenName`, `loanTokenIcon`, `collateralTokenName`, `collateralTokenIcon` | string | Display copy and assets; `descriptionZh` is the Chinese variant. |
| `rewards`, `collateralOracles`, `loanOracles` | array | Reward-token entries, and the oracle config(s) resolving each leg's price. |

The response also carries deprecated price-logic fields (`collateralPriceLogic`, `collateralPriceLogicCn`, `loanPriceLogic`, `loanPriceLogicCn`); prefer `collateralOracles` / `loanOracles` for oracle information and treat the legacy fields as soft-deprecated.

---

## 3. Vaults by market

### GET /api/moolah/market/vault/:marketId

Paginated list of vaults that supply liquidity to the given market.

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

Returns active, liquidatable markets with their raw on-chain parameters — the values needed to build Moolah transactions (`MarketParams`-equivalent) and to read totals directly. A small server-side denylist withholds specific markets, so do not treat this as a provably exhaustive list. No pagination and **no query parameters**.

#### Response

Array of market parameter objects:

| Field | Type | Description |
|-------|------|-------------|
| `lltv` | string | Liquidation LTV **scaled to 1e18** here — the list and detail endpoints return the same field as a decimal fraction. |
| `lastUpdate` | number | Last on-chain accrual timestamp. |
| `id`, `loanToken`, `collateralToken`, `oracle`, `irm` | string | The market id and the five `MarketParams` addresses. |
| `totalSupplyAssets`, `totalSupplyShares`, `totalBorrowAssets`, `totalBorrowShares`, `fee` | string | The `Market` struct's accounting fields, verbatim from chain. |
| `chain`, `zone` | string / number | Network key and market zone. |

The five market-parameter fields (`loanToken`, `collateralToken`, `oracle`, `irm`, `lltv`) are immutable; pair them with the on-chain Moolah contract to construct supply/borrow/withdraw calls. See [Smart Contract](../../lista-lending/smart-contract.md) for the contract reference.

---

## 7. User supply APY

### GET /api/moolah/supply/apy

Per-market supply APY for the markets where a given user currently holds collateral. Markets with a zero collateral balance or inactive status are omitted.

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAddress` | string | Yes | The user's address. |

#### Response

Array of per-market entries:

| Field | Type | Description |
|-------|------|-------------|
| `address` | string | **A market id (bytes32), despite the field name** — not an account address. |
| `asset`, `apy`, `amount`, `usdValue` | string | Collateral token, the market's supply APY, and the user's collateral amount and its USD value. |

---

## 8. Market search filters

### GET /api/moolah/market/search/:typeId

Returns the distinct loan or collateral tokens available across markets — used to populate filter dropdowns for [`/borrow/markets`](#1-market-list).

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
| `name` | string | Display name — **`WBNB` is surfaced as `BNB`**, so do not match it against the symbol you send back. |
| `value` | string | The token symbol to pass back as a filter value. |
| `isLista` | boolean | `true` when the token is the asset of a Lista DAO-curated vault (loan type only). |
| `icon` | string | Token icon URL. |

---

## See also

- [Overall](overall.md) — protocol-wide snapshot.
- [Vault](vault.md) — vault listing and detail endpoints.
- [Position, Liquidation, Emission](position-liquidation-emission.md) — user positions and liquidatable accounts.
- [Integration Patterns](../../lista-lending/integration-patterns.md) — end-to-end integration flows.
