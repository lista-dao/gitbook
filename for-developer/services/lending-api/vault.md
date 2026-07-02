# Vault API

A vault is an aggregate contract where suppliers deposit a single loan asset; a curator allocates that liquidity across multiple lending [markets](market.md). The Vault API exposes the vault list, per-vault detail, historical deposit/APY snapshots, and the per-market allocation breakdown.

All paths are under **Base URL** `/api/moolah`.

> **Chain selector.** Endpoints that span chains take a **string** `chain` parameter — `bsc`, `bscTest`, or `ethereum` — **not** a numeric chain ID. `/vault/list` accepts a comma-separated list (e.g. `chain=bsc,ethereum`); when omitted it defaults to the live network. Detail and history endpoints resolve the chain from the vault `address` and take no `chain` parameter.

> **List conventions.** Paginated list endpoints sort with the pair `sort` (a field key from the whitelist below) + `order` (`asc` | `desc`, default `desc`). `pageSize` defaults to `10` and is capped at `50`; `page` is 1-based. An unrecognized `sort` falls back to the endpoint default.

---

## 1. Vault list

### GET /api/moolah/vault/list

Paginated list of vaults with filtering and sorting.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/vault/list` |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chain` | string | No | `bsc` \| `bscTest` \| `ethereum`. Comma-separated for multiple (e.g. `bsc,ethereum`). Defaults to the live network. |
| `page` | number | No | 1-based page number. Default `1`. |
| `pageSize` | number | No | Items per page. Default `10`, max `50` (values above 50 are clamped). |
| `assets` | string[] | No | Filter by deposit-asset **symbol** (matched against the vault's asset symbol, e.g. `assets=USD1&assets=WBNB`). |
| `curators` | string[] | No | Filter by curator address. |
| `keyword` | string | No | Free-text search over vault name/keywords. Max 50 chars; ignored if empty. |
| `sort` | string | No | Sort field key — one of `deposits`, `apy`, `utilization`. Unknown values fall back to `deposits`. |
| `order` | string | No | `asc` or `desc`. Default `desc`. |
| `zone` | number | No | Zone (segment) filter. Default `0`. |

> Results are always pre-ordered by an internal `priority` first, then by the requested `sort`/`order`.

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total matching vaults (for pagination). |
| `list` | array | Vault summary objects. |

**Item in `list`:**

| Field | Type | Description |
|-------|------|-------------|
| `address` | string | Vault contract address (lower-cased). |
| `name` | string | Vault display name. |
| `icon` | string | Vault icon URL. |
| `apy` | string | Current supply APY. |
| `emissionApy` | string | Additional APY from token emissions/rewards. |
| `emissionEnabled` | boolean | Whether reward emissions are active for this vault. |
| `emissionDetail` | array | Reward breakdown (token + rate metadata) derived from the current reward config. |
| `deposits` | string | Total assets deposited (token units). |
| `depositsUsd` | string | Total deposits valued in USD. |
| `asset` | string | Deposit (loan) asset token address. |
| `assetSymbol` | string | Deposit asset symbol (e.g. `USD1`, `WBNB`). |
| `assetIcon` | string | Deposit asset icon URL. |
| `displayDecimal` | string | Decimals to use when displaying amounts. |
| `curator` | string | Curator address. |
| `curatorIcon` | string | Curator icon URL. |
| `collaterals` | array | Collateral assets reachable through this vault's markets (`{ id, name, icon }`). |
| `zone` | number | Zone (segment) the vault belongs to. |
| `chain` | string | Chain the vault is deployed on (`bsc` \| `ethereum` \| `bscTest`). |
| `utilization` | string | Fraction of deposits currently lent out, clamped to `[0, 1]` (18-decimal string). |

---

## 2. Vault detail

### GET /api/moolah/vault/info

Full details for a single vault, including its curator metadata and the collateral markets it allocates to.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/vault/info` |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | Yes | Vault contract address. The chain is resolved from the vault record. |

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `address` | string | Vault contract address. |
| `name` | string | Vault display name. |
| `icon` | string | Vault icon URL. |
| `description` | string | Vault description (English). |
| `descriptionZh` | string | Vault description (Chinese). |
| `deposits` | string | Total assets deposited (token units). |
| `apy` | string | Current supply APY. |
| `liquidity` | string | Idle (un-allocated) liquidity in the vault. |
| `emissionApy` | string | Additional APY from token emissions/rewards. |
| `emissionEnabled` | boolean | Whether reward emissions are active. |
| `emissionDetail` | array | Reward breakdown derived from the current reward config. |
| `asset` | string | Deposit (loan) asset token address. |
| `assetSymbol` | string | Deposit asset symbol. |
| `assetIcon` | string | Deposit asset icon URL. |
| `assetPrice` | string | Current USD price of the deposit asset (8-decimal string). |
| `displayDecimal` | string | Decimals to use when displaying amounts. |
| `curator` | string | Curator address. |
| `curatorIcon` | string | Curator icon URL. |
| `curatorDesc` | string | Curator description (English). |
| `curatorDescZh` | string | Curator description (Chinese). |
| `curatorX` | string | Curator X (Twitter) handle/URL. |
| `curatorUrl` | string | Curator website URL. |
| `createAt` | number | Vault creation timestamp. |
| `utilization` | string | Fraction of deposits currently lent out (18-decimal string). |
| `zone` | number | Zone (segment) the vault belongs to. |
| `chain` | string | Chain the vault is deployed on. |
| `status` | number | Vault status code. |
| `collaterals` | array | Markets the vault supplies to — each `{ id, collateral, name, icon }` where `id` is the market ID and `collateral` the collateral token address. |
| `styleType` | number | UI style hint. Defaults to `1`. |

> An unknown `address` returns an empty object `{}`.

---

## 3. Vault deposit / APY history

### GET /api/moolah/vault/deposit/history
### GET /api/moolah/vault/apy/history

Daily snapshots of a vault's total deposits and APY over a time range. Both endpoints share the same handler and return the same shape; `/vault/apy/history` is an alias of `/vault/deposit/history`.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/vault/deposit/history` or `/api/moolah/vault/apy/history` |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | Yes | Vault contract address. |
| `startTime` | number | No | Range start, UNIX timestamp in **seconds** (UTC day boundary). |
| `endTime` | number | No | Range end, UNIX timestamp in **seconds** (UTC day boundary). |

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

Paginated breakdown of how a vault's liquidity is allocated across its lending markets.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/vault/allocation` |

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
| `name` | string | Market display name. |
| `collateralSymbol` | string | Collateral token symbol. |
| `collateralIcon` | string | Collateral token icon URL. |
| `loanSymbol` | string | Loan token symbol. |
| `loanIcon` | string | Loan token icon URL. |
| `icon` | string | Market icon URL. |
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
| `rewards` | array | Reward token entries attached to the market. |

---

## Notes

- **Amounts are strings.** Token-denominated and APY/USD values are returned as decimal strings to preserve precision; use the `displayDecimal` hint for presentation.
- **Economic values are live, on-chain-derived.** APY, utilization, deposits, caps, and emission figures reflect the current protocol state and are governance/manager-adjustable on-chain — treat them as snapshots, not fixed terms.
- For the per-market interest-rate, LLTV, and oracle details behind an allocation, see the [Market API](market.md). For protocol-wide totals, see [Overall](overall.md).
