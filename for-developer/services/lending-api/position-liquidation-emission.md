# Positions, Liquidation & Emission API

Read endpoints for **user positions**, **liquidatable / at-risk positions**, **liquidation history**, and **emission (reward) merkle proofs** in Lista Lending (Moolah).

These endpoints are served by the Lista API across three route namespaces:

| Namespace | Purpose |
|-----------|---------|
| `/api/moolah/*` | Moolah-market position and emission data. |
| `/api/v2/liquidations/*`, `/api/v2/liquidated`, `/api/liquidation/zone/*` | Liquidation feeds (at-risk lists, history, auction lookup). |
| `/api/v2/position/*` | Aggregated lending positions per collateral token. |

> **CDP markets are separate.** The traditional single-collateral CDP markets (keyed by `ilk`, not a Moolah `marketId`) are served by a distinct controller at `/api/cdp/market/*` and are documented on their own page (see the end of this page). They are **not** a filter on the Moolah endpoints below.

> Amounts are returned as decimal strings. Where a field name ends in `Wei` the value is the raw on-chain integer; otherwise the value has already been scaled by the token's decimals. Token addresses and oracle/IRM addresses are returned verbatim from the indexed market config.

---

## 1. Liquidatable positions (Moolah)

### GET /api/moolah/redPositions

Returns Moolah positions that are currently liquidatable for a given market — i.e. positions whose stored liquidation rate (`liqRate`) is above the live on-chain price returned by the market's oracle. Results are ordered by `liqRate` descending (most under-water first).

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/moolah/redPositions` |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Market identifier (`marketId`). Unknown markets return an empty array. |
| `start` | number | No | Offset into the result set. Defaults to `0`. |
| `count` | number | No | Page size. Defaults to `20`. |

#### Response

Array of position objects:

| Field | Type | Description |
|-------|------|-------------|
| `user` | string | Borrower address. |
| `collateral` | string | Collateral amount, scaled by the collateral token decimals. |
| `borrowed` | string | Borrowed amount, scaled by the loan token decimals. |
| `borrowShares` | string | Borrow shares (raw). |
| `totalBorrowAssets` | string | Market total borrow assets. |
| `totalBorrowShares` | string | Market total borrow shares. |
| `collateralToken` | string | Collateral token address. |
| `collateralDecimal` | number | Collateral token decimals. |
| `loanToken` | string | Loan token address. |
| `oracle` | string | Oracle contract address used for this market. |
| `lltv` | string | Liquidation LTV. |
| `collateralPrice` | string | Live oracle price used to select the position (raw, as returned by the on-chain `getPrice` call). |

The liquidation condition is, in effect, `borrowed > collateral * price * lltv`. `borrowShares` / `totalBorrowAssets` / `totalBorrowShares` let an integrator recompute the exact current debt from shares before submitting a liquidation.

---

## 2. Liquidation zone (Moolah)

A higher-level liquidation feed for Moolah markets, used to surface positions that are at risk or have already been liquidated. All paths are under `/api/liquidation/zone`.

### GET /api/liquidation/zone/list

Positions on the liquidation whitelist (eligible / flagged for liquidation).

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/liquidation/zone/list` |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number. Defaults to `1`. |
| `pageSize` | number | No | Items per page. Defaults to `20`, capped at `50`. |
| `collaterals` | string[] | No | Filter by collateral symbol(s). Max 10. |
| `loans` | string[] | No | Filter by loan symbol(s). Max 10. |
| `loanInUsd` | number | No | Minimum borrow value in USD (rounded down to the nearest 1,000). |

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total matching rows. |
| `list` | array | Position objects (see below). |

**Item in `list`:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Entry type. |
| `marketId` | string | Market identifier. |
| `user` | string | Borrower address. |
| `collateral` | string | Collateral amount. |
| `borrowed` | string | Borrowed amount. |
| `borrowShares` | string | Borrow shares. |
| `collateralToken` | string | Collateral token address. |
| `collateralDecimal` | number | Collateral token decimals. |
| `collateralSymbol` | string | Collateral symbol. |
| `collateralIcon` | string | Collateral icon URL. |
| `loanValueUsd` | string | Borrow value in USD. |
| `loanToken` | string | Loan token address. |
| `loanDecimal` | number | Loan token decimals. |
| `loanSymbol` | string | Loan symbol. |
| `oracle` | string | Market oracle address. |
| `lltv` | string | Liquidation LTV. |
| `time` | number | Entry time (unix seconds). |
| `chain` | string | Chain identifier of the market. |

### GET /api/liquidation/zone/history

Completed Moolah liquidations.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/liquidation/zone/history` |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number. Defaults to `1`. |
| `pageSize` | number | No | Items per page. Defaults to `20`, capped at `50`. |
| `collaterals` | string[] | No | Filter by collateral symbol(s). Max 10. |
| `loans` | string[] | No | Filter by loan symbol(s). Max 10. |
| `userAddress` | string | No | Filter by borrower address. |
| `loanInUsd` | number | No | Minimum borrow value in USD (rounded down to the nearest 1,000). |

#### Response

`{ total, list }`, where each item describes a settled liquidation:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Entry type. |
| `marketId` | string | Market identifier. |
| `user` | string | Borrower (liquidated) address. |
| `liquidator` | string | Liquidator address. |
| `repaidShares` | string | Borrow shares repaid by the liquidator. |
| `repaidAssets` | string | Debt assets repaid. |
| `repaidInUsd` | string | Repaid value in USD. |
| `seizedAssets` | string | Collateral seized. |
| `seizedInUsd` | string | Seized value in USD. |
| `collateralMarketPrice` | string | Collateral price at liquidation. |
| `collateralToken` / `collateralSymbol` / `collateralDecimal` / `collateralIcon` | string / number | Collateral token metadata. |
| `loan` | string | Loan amount. |
| `loanInUsd` | string | Loan value in USD. |
| `loanToken` / `loanSymbol` / `loanDecimal` | string / number | Loan token metadata. |
| `lltv` | string | Liquidation LTV. |
| `time` | number | Liquidation time (unix seconds). |
| `chain` | string | Chain identifier. |

### GET /api/liquidation/zone/closeToLiquidate

Healthy-but-at-risk positions: open positions whose safety factor (`marketLiqRate / positionLiqRate`) is below `1.5`. Ordered by safety factor ascending (closest to liquidation first).

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/liquidation/zone/closeToLiquidate` |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number. Defaults to `1`. |
| `pageSize` | number | No | Items per page. Defaults to `20`, capped at `50`. |
| `collaterals` | string \| string[] | No | Filter by collateral symbol(s). |
| `loans` | string \| string[] | No | Filter by loan symbol(s). |
| `userAddress` | string | No | Filter by borrower address. |
| `loanInUsd` | number | No | Minimum borrow value in USD. |

#### Response

`{ total, list }`, where each item includes:

| Field | Type | Description |
|-------|------|-------------|
| `marketId` | string | Market identifier. |
| `user` | string | Borrower address. |
| `collateral` | string | Collateral amount. |
| `borrowed` | string | Borrowed amount. |
| `collateralToken` / `collateralSymbol` / `collateralIcon` | string | Collateral token metadata. |
| `collateralPrice` | string | Collateral price. |
| `loanToken` / `loanSymbol` / `loanIcon` | string | Loan token metadata. |
| `loanPrice` | string | Loan price. |
| `lltv` | string | Liquidation LTV. |
| `safeFactor` | string | Safety factor (`< 1.5`; smaller is closer to liquidation). |
| `loanInUsd` | string | Borrow value in USD. |
| `time` | number | Position update time. |
| `chain` | string | Chain identifier. |

---

## 3. Liquidation feeds (legacy CDP collaterals)

These `/api/v2/liquidations/*` and `/api/v2/liquidated` endpoints serve the **CDP (single-collateral) borrow product**, not Moolah markets. They read from the borrower index and key results by collateral token address. Use the Moolah endpoints above for Moolah-market liquidations.

### GET /api/v2/liquidations/red

Positions that are currently liquidatable (current price has crossed the position's liquidation price).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start` | number | No | Offset (snapped to a multiple of 10). |
| `count` | number | No | Page size (snapped to a multiple of 20; min 20, max 100). |

Response: `{ users: [...] }`, each entry containing `userAddress`, `tokenName`, `collateralCurrency`, `collateral`, `liquidationPrice`, `liquidationCost`, `rangeFromLiquidation`.

### GET /api/v2/liquidations/orange

Positions approaching the liquidation threshold (within the danger band, but not yet liquidatable). Same parameters and response shape as `/red`; `rangeFromLiquidation` reflects the remaining buffer to liquidation.

### GET /api/v2/liquidations/auctionUser

Look up the borrower(s) and clipper (auction contract) for a given liquidation auction.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `auctionId` | number | No | Auction identifier. |
| `token` | string | No | Collateral token address. |

Response: `{ users: [{ userAddress, clipperAddress }] }`.

### GET /api/v2/liquidated

Recently liquidated CDP positions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start` | number | No | Offset. Defaults to `0`. |
| `count` | number | No | Page size. Defaults to and capped at `20`. |

Related sub-paths on the same controller: `GET /api/v2/liquidated/:user` (liquidations for one address), `GET /api/v2/liquidated/:user/latest?collateral=` (volume-weighted average liquidation price for an address + collateral), and `GET /api/v2/liquidated/lending/history` (Moolah lending liquidation history, paginated by `page` / `pageSize` with `collaterals` / `loans` / `userAddress` / `loanInUsd` filters).

---

## 4. Aggregated lending positions

### GET /api/v2/position/tokenLendingUserPositions

Returns, for a whitelisted collateral token, each address's total collateral supplied across all Moolah markets that use that collateral. Used for token-holder / position snapshots. The response is keyset-paginated by address.

| | |
|--|--|
| **Method** | `GET` |
| **Path** | `/api/v2/position/tokenLendingUserPositions` |

#### Query parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lastAddress` | string | Yes | Return addresses strictly greater than this (keyset cursor). Use the empty/zero address for the first page. |
| `collateral` | string | Yes | Collateral token address. Must be a whitelisted token, otherwise the request is rejected. |
| `limit` | number | Yes | Page size, clamped to min 20 / max 500. |

#### Response

Array, ordered by `address` ascending:

| Field | Type | Description |
|-------|------|-------------|
| `address` | string | Holder address. |
| `amount` | string | Total collateral supplied by that address across markets using `collateral`. |

To page, pass the last `address` of the previous response as `lastAddress` on the next call.

> A sibling endpoint `GET /api/v2/position/tokenUserPositions` (same parameters) returns the equivalent aggregate for the legacy CDP borrower index rather than Moolah positions.

---

## 5. Emission (rewards) — merkle proofs

Lista Lending distributes emission rewards via a **weekly merkle-root** model: an off-chain job publishes a merkle root per week, and each eligible user fetches their leaf (amount + merkle proof) from the API and claims on-chain. These endpoints therefore return a **proof to claim**, not a pre-credited balance.

> **Authentication (wallet signature required).** The proof endpoints require the caller to prove control of the address. Each request carries `address`, `signature`, and `message`. The `message` must be an exact **two-line** body, validated by a strict regex: an ISO-8601 UTC timestamp (e.g. `2026-06-30T12:00:00Z`) on the first line, then the literal second line `Thank you for your support of listaDAO.` — and the timestamp must be no older than 7 days. Verification is performed two ways depending on `type`:
> - `type=safe` — the signature is validated against the address as an ERC-1271 contract wallet (Safe), via `isValidSignature`.
> - otherwise — the signature is recovered as a standard EOA wallet signature and must match `address`.
>
> An invalid signature returns an "invalid signature" error; an expired message returns a "token expired" error. No server-side secret or key is involved — this is a standard wallet-signature challenge.

### GET /api/moolah/emission/userProof

Returns the LISTA-emission merkle proof for the latest active weekly root.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | Yes | Claiming address. |
| `signature` | string | Yes | Wallet signature over `message`. |
| `message` | string | Yes | Signed message: an ISO-8601 UTC timestamp line, then the literal line `Thank you for your support of listaDAO.` (strict regex; timestamp ≤ 7 days old). |
| `type` | string | No | `safe` for ERC-1271 (Safe) wallets; omit/other for EOA. |

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `rootId` | string | Week identifier of the root the proof belongs to. |
| `amount` | string | Claimable amount (scaled). |
| `amountWei` | string | Claimable amount (raw integer). |
| `proof` | string[] | Merkle proof nodes. |
| `currentAmount` | string | Amount attributable to the current week. |

When the user has no leaf for the latest root, an empty proof is returned (`rootId: ""`, `amount: "0"`, `amountWei: "0"`, `proof: ""`).

### GET /api/moolah/emission/userMultiProof

Returns per-token emission proofs (the multi-token reward stream), each entry pairing a claimable merkle proof with an estimated-reward breakdown.

Parameters: same auth parameters as `/userProof` (`address`, `signature`, `message`, `type`).

#### Response

Array, one entry per reward token:

| Field | Type | Description |
|-------|------|-------------|
| `token` | string | Reward token address. |
| `tokenSymbol` | string | Reward token symbol. |
| `tokenIcon` | string | Reward token icon URL. |
| `amount` | string | Claimable amount (scaled); `0` if only an estimate exists. |
| `amountWei` | string | Claimable amount (raw); `0` if estimate-only. |
| `proof` | string[] | Merkle proof nodes; empty if estimate-only. |
| `currentAmount` | string | Amount for the current period. |
| `estRewards` | object | Map of `symbol → estimated USD value`. |
| `estRewardDetails` | array | Per-symbol `{ symbol, estRewards, icon, amount }`. |

Tokens with only an accruing estimate (no finalized leaf yet) appear with empty `proof` / zero `amount`.

### GET /api/moolah/emission/userRewardHistory

Paginated history of an address's finalized per-token emission rewards.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | Yes | Claiming address. |
| `signature` | string | Yes | Wallet signature over `message`. |
| `message` | string | Yes | Signed message: an ISO-8601 UTC timestamp line, then the literal line `Thank you for your support of listaDAO.` (strict regex; timestamp ≤ 7 days old). |
| `type` | string | No | `safe` for ERC-1271 (Safe) wallets; omit/other for EOA. |
| `page` | number | No | Page number. Defaults to `1`. |
| `pageSize` | number | No | Items per page. Defaults to `10`, capped at `50`. |

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total history rows. |
| `list` | array | History entries (see below). |

**Item in `list`:**

| Field | Type | Description |
|-------|------|-------------|
| `token` | string | Reward token address. |
| `tokenSymbol` | string | Reward token symbol. |
| `tokenIcon` | string | Reward token icon URL. |
| `amount` | string | Reward amount (scaled). |
| `amountWei` | string | Reward amount (raw). |
| `currentAmount` | string | Amount attributable to that week. |
| `weeks` | string | Week identifier. |

---

## 6. CDP markets (separate controller)

Traditional single-collateral CDP markets are keyed by an `ilk` (collateral type) rather than a Moolah `marketId`, and live in their own namespace at `/api/cdp/market/*` (`/search`, `/list`, `/info`, `/borrowRate/history`, `/userBorrow/history`). They are documented separately — do not query them through the Moolah position/liquidation endpoints above.

---

## Related pages

- [Market API](market.md) — markets, oracles, borrow-rate history, on-chain market config.
- [Vault](vault.md) — vault list, detail, allocation.
- [Position Data Maintenance](../position-data-maintenance.md) — how positions and liquidation rates are indexed off-chain.
- [Liquidation Logic (Service)](../liquidation-logic.md) — how at-risk and liquidatable positions are determined.
