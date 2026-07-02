# Overall (Protocol Snapshot)

A single protocol-wide summary of Lista Lending (Moolah): aggregate deposits, borrows, and collateral, the best vault APY, the lowest market borrow rate, and the top loan/collateral tokens by size. All paths are under **Base URL** `/api/moolah`.

The response is a pre-computed snapshot served from a server-side cache and refreshed periodically by a background job, so values reflect the last sync rather than live on-chain state. Use the `updateAt` timestamp to judge freshness. USD amounts are returned as fixed-point decimal strings (18 decimal places) to avoid floating-point loss.

---

## GET /api/moolah/overall

Returns the protocol snapshot. This endpoint takes **no query parameters**.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/overall` |
| **Query parameters** | None |

### Response

| Field | Type | Description |
|-------|------|-------------|
| `totalBorrowed` | string | Total borrowed across all markets, in USD (fixed-point, 18 decimals). |
| `totalCollateral` | string | Total collateral posted across all markets, in USD (fixed-point, 18 decimals). |
| `totalDeposits` | string | Total assets deposited across all vaults, in USD (fixed-point, 18 decimals). |
| `maxVaultApy` | string | Highest APY among active vaults (fixed-point, 18 decimals; e.g. `0.05` = 5%). |
| `minBorrowRate` | string | Lowest borrow rate among active markets (fixed-point, 18 decimals). |
| `loanTokens` | array | Top loan/deposit tokens by deposited USD, sorted descending (up to 10). See below. |
| `collateralTokens` | array | Top collateral tokens by available liquidity in USD, sorted descending (up to 10). See below. |
| `updateAt` | number | Unix timestamp (seconds) of the snapshot. |

**Item in `loanTokens`:**

| Field | Type | Description |
|-------|------|-------------|
| `tokenAddress` | string | Token contract address (lowercase). |
| `tokenSymbol` | string | Token symbol. |
| `tokenIcon` | string | Icon URL. |
| `amountInUSD` | number | Deposited amount for this token, in USD. |

**Item in `collateralTokens`:**

| Field | Type | Description |
|-------|------|-------------|
| `tokenAddress` | string | Token contract address (lowercase). |
| `tokenSymbol` | string | Token symbol. |
| `tokenIcon` | string | Icon URL. |
| `liquidityInUSD` | number | Available loan-side liquidity in markets using this collateral, in USD. |

When the snapshot has not yet been populated, the endpoint returns a zeroed object: all amount/rate fields as `"0"`, `loanTokens` and `collateralTokens` as empty arrays, and `updateAt` as `0`.

### Example

```bash
curl https://<api-host>/api/moolah/overall
```

```json
{
  "totalBorrowed": "12345678.900000000000000000",
  "totalCollateral": "23456789.000000000000000000",
  "totalDeposits": "34567890.100000000000000000",
  "maxVaultApy": "0.084000000000000000",
  "minBorrowRate": "0.021000000000000000",
  "loanTokens": [
    {
      "tokenAddress": "0x...",
      "tokenSymbol": "USD1",
      "tokenIcon": "https://...",
      "amountInUSD": 20000000.0
    }
  ],
  "collateralTokens": [
    {
      "tokenSymbol": "BTCB",
      "tokenAddress": "0x...",
      "tokenIcon": "https://...",
      "liquidityInUSD": 8000000.0
    }
  ],
  "updateAt": 1730000000
}
```

> Values above are illustrative. Token addresses are returned by the API; do not hard-code them.

---

## Related

- [Vault API](vault.md) — per-vault list, detail, APY/deposit history, allocation.
- [Market API](market.md) — per-market data, borrow rates, search.
- [Position, Liquidation, Emission](position-liquidation-emission.md) — user-level data.
