# Vault API

Vaults are aggregate contracts where LPs deposit assets; liquidity is allocated across multiple lending markets. All paths are under **Base URL** `/api/moolah`.

---

## 1. Vault list

### GET /api/moolah/vault/list

Paginated list of vaults with filters and sorting.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/vault/list` |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chainId` | number / string | No | Filter by chain (e.g. 56, 1). |
| `page` | number | No | Page number (1-based). Default: 1. |
| `pageSize` | number | No | Items per page. Default: 10 or 20. |
| `sortBy` | string | No | Sort field (e.g. `totalAssets`, `apy`, `createdAt`). |
| `sortOrder` | string | No | `asc` or `desc`. |

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `list` | array | List of vault objects. |
| `total` | number | Total count (for pagination). |

**Item in `list`:**

| Field | Type | Description |
|-------|------|-------------|
| `vaultId` | string | Vault identifier (e.g. contract address). |
| `chainId` | number | Chain ID. |
| `asset` | string | Deposit asset address or symbol. |
| `assetSymbol` | string | Symbol (e.g. WBNB, USD1). |
| `totalAssets` | string | Total assets in vault (human-readable). |
| `totalAssetsUsd` | string | Total value in USD. |
| `apy` | string | Current supply APY. |
| `marketCount` | number | Number of markets the vault allocates to. |

---

## 2. Vault detail

### GET /api/moolah/vault/info

Full details for a single vault.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/vault/info` |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `vaultId` | string | Yes | Vault identifier (e.g. contract address). |
| `chainId` | number / string | No | Chain ID (required if vault exists on multiple chains). |

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `vaultId` | string | Vault identifier. |
| `chainId` | number | Chain ID. |
| `asset` | string | Deposit asset address. |
| `assetSymbol` | string | Symbol. |
| `totalAssets` | string | Total assets. |
| `totalAssetsUsd` | string | Total value in USD. |
| `apy` | string | Current supply APY. |
| `marketIds` | array | List of market IDs this vault supplies to. |
| `allocationSummary` | object / array | Per-market allocation (amount or proportion). |

---

## 3. Vault deposit / APY history

### GET /api/moolah/vault/deposit/history  
### GET /api/moolah/vault/apy/history

Both return daily snapshots of deposit size and APY for a vault over a time range. Response shape is the same.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/vault/deposit/history` or `/api/moolah/vault/apy/history` |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `vaultId` | string | Yes | Vault identifier. |
| `chainId` | number / string | No | Chain ID. |
| `startTime` | number / string | No | Start timestamp (seconds or ms). |
| `endTime` | number / string | No | End timestamp. |

#### Response

Array of daily snapshot objects:

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | Date (e.g. YYYY-MM-DD). |
| `timestamp` | number | Start-of-day timestamp. |
| `totalDeposit` | string | Total deposit in vault at that day. |
| `totalDepositUsd` | string | Value in USD. |
| `apy` | string | APY on that day. |

---

## 4. Vault allocation

### GET /api/moolah/vault/allocation

Paginated list of how a vault’s liquidity is allocated across markets.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/vault/allocation` |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `vaultId` | string | Yes | Vault identifier. |
| `chainId` | number / string | No | Chain ID. |
| `page` | number | No | Page number. |
| `pageSize` | number | No | Items per page. |

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `list` | array | Allocation rows. |
| `total` | number | Total count. |

**Item in `list`:**

| Field | Type | Description |
|-------|------|-------------|
| `marketId` | string | Market identifier. |
| `allocatedAssets` | string | Amount allocated to this market. |
| `proportion` | string | Proportion (e.g. 0.5 = 50%). |
| `apy` | string | Supply APY for this market. |
