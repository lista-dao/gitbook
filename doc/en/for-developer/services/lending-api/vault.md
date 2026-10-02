# Vault API

A vault is an aggregate contract where suppliers deposit a single loan asset; a curator allocates that liquidity across multiple lending [markets](market.md). The Vault API exposes the vault list, per-vault detail, historical deposit/APY snapshots, and the per-market allocation breakdown.

All paths are under **Base URL** `/api/moolah`.

> **Chain selector.** Endpoints that span chains take a **string** `chain` parameter — `bsc`, `bscTest`, or `ethereum` — **not** a numeric chain ID. `/vault/list` accepts a comma-separated list (e.g. `chain=bsc,ethereum`); when omitted it defaults to the live network. Detail and history endpoints resolve the chain from the vault `address` and take no `chain` parameter.

> **List conventions.** Paginated list endpoints sort with the pair `sort` (a field key from the whitelist below) + `order` (`asc` | `desc`, default `desc`). `pageSize` defaults to `10` and is capped at `50`; `page` is 1-based. An unrecognized `sort` falls back to the endpoint default.

---

## 1. Vault list

### GET /api/moolah/vault/list

Paginated list of vaults with filtering and sorting.

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chain` | string | No | `bsc` \| `bscTest` \| `ethereum`. Comma-separated for multiple (e.g. `bsc,ethereum`). Defaults to the live network. |
| `page` | number | No | 1-based page number. Default `1`. |
| `pageSize` | number | No | Items per page. Default `10`, max `50` (values above 50 are clamped). |
| `assets` | string[] | No | Filter by deposit-asset **symbol**. Must arrive as an array: repeat the key (`assets=USD1&assets=WBNB`), or use the bracket form for one value (`assets[]=USD1`). A single bare `assets=USD1` is unsupported — the query builder throws, so a cold cache returns HTTP `500`; a warm cache (see [Conventions](conventions.md)) can mask this by returning a stale cached response instead. |
| `curators` | string[] | No | Filter by curator **name** (e.g. `Lista DAO`), matched exactly — an address matches nothing. **Send it repeated** (`?curators=A&curators=B`): a single un-repeated value arrives as a string and the query builder fails on it — unsupported, returning HTTP `500` on a cold cache (a warm cache can mask this instead). |
| `keyword` | string | No | Free-text search over vault name/keywords. Max 50 chars; ignored if empty. |
| `sort` | string | No | Sort field key — one of `deposits`, `apy`, `utilization`. Unknown values fall back to `deposits`. |
| `order` | string | No | `asc` or `desc`. Default `desc`. |
| `zone` | number | No | Zone (segment) filter. Default `0`. |

> Results are grouped by a Lista-assigned display order before the requested `sort` / `order` is applied.

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total matching vaults (for pagination). |
| `list` | array | Vault summary objects. |

**Item in `list`:**

| Field | Type | Description |
|-------|------|-------------|
| `address` | string | Vault contract address (**lower-cased**). |
| `emissionEnabled` | number | `1` when reward emissions are active for this vault, `0` when not. Serialized as an integer, not a JSON boolean. |
| `emissionDetail` | object | Reward breakdown keyed by token symbol — `{ [symbol]: { apy, total, icon } }`, or `{}` when there is none. Note `/vault/allocation` returns `emissionDetail` as an **array**, not an object keyed by symbol. |
| `displayDecimal` | number | Decimals to use when displaying amounts. Serialized as a JSON number. |
| `utilization` | string | Fraction of deposits currently lent out, clamped to `[0, 1]` (18-decimal string). |
| `collaterals` | array | Collateral assets reachable through this vault's markets (`{ id, name, icon, loanSymbol, allocation }`). |
| `apy`, `emissionApy`, `deposits`, `depositsUsd`, `zone`, `chain` | string / number | Headline figures, self-describing. `chain` is `bsc` \| `ethereum` \| `bscTest`. |
| `asset`, `assetSymbol`, `name`, `icon`, `assetIcon`, `curator`, `curatorIcon` | string | Deposit-asset address/symbol plus display copy and assets. |

---

## 2. Vault detail

### GET /api/moolah/vault/info

Full details for a single vault, including its curator metadata and the collateral markets it allocates to.

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | Yes | Vault contract address. The chain is resolved from the vault record. |

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `emissionEnabled` | number | `1` when reward emissions are active, `0` when not. Serialized as an integer, not a JSON boolean. |
| `emissionDetail` | object | Reward breakdown keyed by token symbol — `{ [symbol]: { apy, total, icon } }`, or `{}` when there is none. |
| `assetPrice` | string | USD price of the deposit asset, **8-decimal string**. |
| `displayDecimal` | number | Decimals to use when displaying amounts. Serialized as a JSON number. |
| `liquidity` | string | Idle (un-allocated) liquidity in the vault. |
| `address`, `asset`, `assetSymbol`, `deposits`, `apy`, `emissionApy` | string | Vault and deposit-asset identity plus headline figures. |
| `name`, `icon`, `assetIcon`, `description`, `descriptionZh`, `curator`, `curatorIcon`, `curatorDesc`, `curatorDescZh` | string | Display copy and assets; the `*Zh` fields are the Chinese variants. |
| `utilization` | string | Fraction of deposits currently lent out (**18-decimal string**). Unlike `/vault/list`'s `utilization`, this one is not clamped to `[0, 1]` server-side — treat a value outside that range as a signal to re-check the vault, not a parsing error. |
| `collaterals` | array | Markets the vault supplies to — each `{ id, collateral, name, icon }` where `id` is the market ID and `collateral` the collateral token address. |
| `curatorX`, `curatorUrl`, `styleType` | string / number | Curator X handle and website, and a UI style hint (defaults to `1`). |
| `createAt`, `zone`, `chain`, `status` | string / number | Creation timestamp, zone, chain, and the vault status code. |

> An unknown `address` returns an empty object `{}`.

---

## 3. Vault deposit / APY history

### GET /api/moolah/vault/deposit/history
### GET /api/moolah/vault/apy/history

Daily snapshots of a vault's total deposits and APY over a time range. Both endpoints share the same handler and return the same shape; `/vault/apy/history` is an alias of `/vault/deposit/history`.

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | Yes | Vault contract address. |
| `startTime` | number | No\* | Range start, UNIX timestamp in **seconds** (UTC day boundary). |
| `endTime` | number | No\* | Range end, UNIX timestamp in **seconds** (UTC day boundary). |

> \* Syntactically optional, but the two behave differently when omitted, and neither raises an error. Omitting `startTime` (or both) returns an **empty array**. Omitting `endTime` returns the **entire history from `startTime` onward** — the bound is compared as a string, and the placeholder it degrades to sorts above every real date. Pass both explicitly.

#### Response

Array of daily snapshot objects, ordered ascending by date:

| Field | Type | Description |
|-------|------|-------------|
| `chartTime` | number | Start-of-day UNIX timestamp (seconds). |
| `apy` | string | Base supply APY for that day. |
| `emissionApy` | string | Reward/emission APY for that day. |
| `totalAssets` | string | Total assets in the vault that day (token units). |
| `totalAssetsUsd` | string | Total assets valued in USD that day. |

---

## 4. Vault allocation

### GET /api/moolah/vault/allocation

> The response also includes a synthetic **"Idle Market"** row representing un-allocated liquidity. It ignores the `keyword` and `zone` filters, and `collateralSymbol`, `collateralIcon`, `icon`, `liquidity`, `utilization` and `smartCollateralConfig` are all `null` on it. A strictly-typed client will fail to parse the response unless those fields are modelled as nullable.

Paginated breakdown of how a vault's liquidity is allocated across its lending markets.

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | Yes | Vault contract address. |
| `page` | number | No | 1-based page number. Default `1`. |
| `pageSize` | number | No | Items per page. Default `10`, max `50`. |
| `sort` | string | No | Sort field key — one of `allocation`, `totalSupply`, `liquidity`, `utilization`, `cap`, `borrowRate`. Default `totalSupply`. |
| `order` | string | No | `asc` or `desc`. Default `desc`. |
| `keyword` | string | No | Free-text search over the allocated market's collateral name/keywords. |
| `zone` | string | No | Comma-separated zone (segment) filter applied to the underlying markets. |

> Rows are pre-ordered by an internal market `priority` first, then by the requested `sort`/`order`. An unknown vault `address` returns `{ total: 0, list: [] }`.

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total allocated markets (for pagination). |
| `list` | array | Allocation rows. |

**Item in `list`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Market identifier the liquidity is allocated to. |
| `name`, `collateralSymbol`, `loanSymbol` | string | Market display name and both token symbols. |
| `icon`, `collateralIcon`, `loanIcon` | string | Display assets. |
| `allocation` | string | Amount of vault liquidity allocated to this market. |
| `totalSupply` | string | Vault-supplied amount tracked for this market. |
| `cap` | string | Supply cap the vault has set for this market. |
| `liquidity` | string | Market liquidity available to borrow (18-decimal string). |
| `price` | string | USD price of the loan asset (8-decimal string). |
| `supplyApy` | string | Supply APY for this market. |
| `zone` | number | Zone (segment) of the market. |
| `smartCollateralConfig` | object | Smart-collateral configuration for the market, if any. |
| `utilization` | string | Market utilization (borrowed / supplied). |
| `borrowRate` | string | Current borrow rate for the market. |
| `emissionDetail` | array | Reward breakdown for this market. An **array** here, unlike the object keyed by symbol on `/vault/list`. |
| `rewards` | array | Reward token entries attached to the market. |

---

## Notes

- **Amounts are strings.** Token-denominated and APY/USD values are returned as decimal strings to preserve precision; use the `displayDecimal` hint for presentation.
- **Economic values come from the indexer and a short-lived cache, not from a live chain read.** APY, utilization, deposits, caps, and emission figures reflect the current protocol state and are governance/manager-adjustable on-chain — treat them as snapshots, not fixed terms.
- For the per-market interest-rate, LLTV, and oracle details behind an allocation, see the [Market API](market.md). For protocol-wide totals, see [Overall](overall.md).
