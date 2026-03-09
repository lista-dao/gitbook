# Overall (Protocol Snapshot)

## GET /api/moolah/overall

Returns a protocol-level data snapshot (e.g. TVL, total supplied, total borrowed across chains).

**Method:** `GET`  
**Path:** `/api/moolah/overall`

---

### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chainId` | number / string | No | Filter by chain (e.g. 56 = BSC, 1 = Ethereum). Omit for all chains. |

---

### Response

Object with protocol-wide metrics. Typical fields:

| Field | Type | Description |
|-------|------|-------------|
| `totalSupplyUsd` | string | Total supplied value in USD (all vaults/markets). |
| `totalBorrowUsd` | string | Total borrowed value in USD. |
| `tvlUsd` | string | Total value locked in USD. |
| `chainList` | array | List of chain IDs with data. |
| `updatedAt` | number / string | Timestamp of snapshot. |

Additional keys (e.g. per-chain breakdown, vault count, market count) depend on the deployed API.
