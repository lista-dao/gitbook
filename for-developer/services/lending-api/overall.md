# Overall (Protocol Snapshot)

A single protocol-wide summary of Lista Lending (Moolah): aggregate deposits, borrows, and collateral, the best vault APY, the lowest market borrow rate, and the top loan/collateral tokens by size. All paths are under **Base URL** `/api/moolah`.

The response is a pre-computed snapshot served from a server-side cache and refreshed periodically by a background job, so values reflect the last sync rather than live on-chain state. Use the `updateAt` timestamp to judge freshness. Most USD amounts are returned as fixed-point decimal strings (18 decimal places) to avoid floating-point loss — but not all: the field tables below mark the ones typed `number`. Check the type per field rather than assuming strings throughout.

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
| `maxVaultApy` | string | Highest **combined** APY (base plus emission) among vaults holding assets (fixed-point, 18 decimals; e.g. `0.05` = 5%). |
| `minBorrowRate` | string | Lowest **net** borrow rate (borrow rate minus borrow-emission APY) among markets with non-zero borrows. Can be **negative** when emissions exceed the borrow rate (fixed-point, 18 decimals). |
| `loanTokens` | array | Top loan/deposit tokens by deposited USD, sorted descending (up to 10). See below. |
| `collateralTokens` | array | Top collateral tokens by available liquidity in USD, sorted descending (up to 10). See below. |
| `details` | object | Per-chain breakdown of the same aggregates, keyed by chain (`bsc`, `ethereum`). |
| `activeMarketCount` | number | Number of active markets. |
| `lpTokens` | array | StableSwap LP tokens accepted as collateral — `tokenSymbol`, `tokenAddress`, `tokenIcon`, `tvlInUSD`. |
| `smartLending` | object | Smart Lending sub-totals. |
| `bStock` | object | Tokenized-equity (bStock) sub-totals. A **breakout** of markets that are already counted in the aggregates above, not a separate bucket. See below. |
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

### `bStock` object

bStock markets are **included** in `totalBorrowed`, `totalCollateral` and the `collateralTokens` list; this object tallies the same markets again so they can be shown on their own. **Do not add `bStock.totalBorrowed` / `bStock.totalCollateral` to the protocol-wide totals** — you would double-count. `totalDeposits` is a vault-level aggregate and has no bStock counterpart. The shape is stable, and present even before the snapshot is populated.

| Field | Type | Description |
|-------|------|-------------|
| `marketCount` | number | Number of bStock markets. |
| `collateralTokenCount` | number | Number of distinct bStock collateral tokens. |
| `totalCollateral` | string | bStock collateral posted, in USD (fixed-point, 18 decimals). |
| `totalBorrowed` | string | Borrowed against bStock collateral, in USD. |
| `totalAvailable` | string | Available liquidity in bStock markets, in USD. |
| `loanTokens` | array | Loan tokens available against bStock collateral. |
| `topCollateralTokens` | array | Top bStock collateral tokens. |

When the snapshot has not yet been populated, the endpoint returns a zeroed object: all amount/rate fields as `"0"`, `loanTokens` and `collateralTokens` as empty arrays, `updateAt` as `0`, and `bStock` present with its counts at `0`, its amounts at `"0"` and its arrays empty.

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
