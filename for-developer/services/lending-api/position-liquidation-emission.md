# Position, Liquidation, Emission & CDP

APIs for **user position**, **liquidation**, **emission (rewards)**, and **CDP-style markets**. Paths and response schemas are implementation-specific; this page summarises typical usage and points to the underlying data/design docs.

**Base URL:** `/api/moolah`

---

## User position

APIs that return a user’s positions across markets (collateral, borrowed amount, health factor, liquidation price).

**Typical paths:**

- `GET /api/moolah/position/list` — list positions for a user (query: `userAddress`, `chainId`, `page`, `pageSize`).
- `GET /api/moolah/position/detail` — single position (query: `userAddress`, `marketId`, optional `chainId`).
- `GET /api/moolah/user/:userAddress/positions` — alternative: path param for user, query for chain/page.

**Typical response fields per position:**

| Field | Type | Description |
|-------|------|-------------|
| `userAddress` | string | Wallet address. |
| `marketId` | string | Market identifier. |
| `chainId` | number | Chain ID. |
| `collateralAmount` | string | Supplied collateral. |
| `borrowedAmount` | string | Actual borrowed amount. |
| `liquidationPrice` / `liquidationPriceRatio` | string | Price (or ratio) at which position becomes liquidatable. |
| `healthFactor` | string | Health factor (if provided). |

Data source and formulas are described in [Position data maintenance](../position-data-maintenance.md).

---

## Liquidation

Endpoints for liquidatable positions or liquidation history.

**Typical paths:**

- `GET /api/moolah/liquidation/liquidatable` — list positions that can be liquidated (query: `chainId`, `marketId`, `page`, `pageSize`).
- `GET /api/moolah/liquidation/history` — past liquidations (query: `userAddress`, `marketId`, `chainId`, `startTime`, `endTime`, pagination).

**Typical response fields (liquidatable list):**

| Field | Type | Description |
|-------|------|-------------|
| `userAddress` | string | Borrower. |
| `marketId` | string | Market. |
| `borrowedAmount` | string | Debt. |
| `collateralAmount` | string | Collateral. |
| `liquidationPrice` | string | Trigger price. |
| `currentPrice` | string | Current oracle price. |

How risk and liquidation are determined: [Liquidation logic](../liquidation-logic.md).

---

## Emission (rewards)

Endpoints for reward rates, claimable amounts, and distribution config.

**Typical paths:**

- `GET /api/moolah/emission/rates` — reward rates per vault/market.
- `GET /api/moolah/emission/claimable` — claimable rewards for a user (query: `userAddress`, `chainId`).
- `GET /api/moolah/rewards/config` — distribution config (if exposed).

**Typical response fields (claimable):**

| Field | Type | Description |
|-------|------|-------------|
| `userAddress` | string | Wallet. |
| `vaultId` / `marketId` | string | Scope of rewards. |
| `claimableAmount` | string | Claimable reward amount. |
| `asset` / `token` | string | Reward token address. |

Rewards are derived from the position table and reward distributor contracts; see [Position data maintenance](../position-data-maintenance.md).

---

## CDP market (traditional collateralized debt)

CDP-style markets (single-collateral borrow against a stablecoin) may be exposed as:

- A **market type** or **filter** in [Market list](market.md) (e.g. `type=cdp` or `market/search/cdp`).
- Same [Market detail](market.md) path with a `marketId` that refers to a CDP market.

Contract layout can differ from standard Moolah markets; use [Market detail](market.md) and [All markets (on-chain)](market.md#5-all-markets-on-chain) to get exact on-chain config.
