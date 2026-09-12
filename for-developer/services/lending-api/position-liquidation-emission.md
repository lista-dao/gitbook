# Positions, Liquidation & Emission API

Read endpoints for **user positions**, **liquidatable / at-risk positions**, **liquidation history**, and **emission (reward) merkle proofs** in Lista Lending (Moolah).

These endpoints tell you *what* is liquidatable; for *how* to execute a liquidation on-chain see [Liquidator Integration](../../lista-lending/liquidator-integration.md).

These endpoints are served by the Lista API across these route namespaces:

| Namespace | Purpose |
|-----------|---------|
| `/api/moolah/*` | Moolah-market position and emission data. |
| `/api/v2/liquidations/*`, `/api/v2/liquidated`, `/api/liquidation/zone/*` | Liquidation feeds (at-risk lists, history, auction lookup). |

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
| `collateral` | string | Collateral amount as the **raw on-chain integer**. |
| `borrowed` | string | Borrowed amount as the **raw on-chain integer**. |
| `borrowShares` | string | Borrow shares (raw). |
| `totalBorrowAssets` | string | Market total borrow assets. |
| `totalBorrowShares` | string | Market total borrow shares. |
| `collateralToken` | string | Collateral token address. |
| `collateralDecimal` | number | Collateral token decimals. |
| `loanToken` | string | Loan token address. |
| `oracle` | string | Oracle contract address used for this market. |
| `lltv` | string | Liquidation LTV as a **decimal fraction** (e.g. `0.86`) — note this differs from `/api/moolah/allMarkets`, which returns it scaled to 1e18. |
| `collateralPrice` | string | Live oracle price used to select the position (raw, as returned by the on-chain `getPrice` call). |

> **This endpoint is the exception to the page convention above.** The amount fields here are **raw on-chain integers** — `collateral`, `borrowed`, `borrowShares`, `totalBorrowAssets`, `totalBorrowShares` and `collateralPrice` — even though none of their names end in `Wei`. (`lltv` is a decimal fraction and `collateralDecimal` is a plain count, as the table says.)


In terms of the fields returned here (raw integers, with `lltv` a decimal fraction) the selection condition is `borrowed × 1e36 > collateral × collateralPrice × lltv`. `collateralPrice` carries Moolah's oracle price scale, so the `1e36` divisor is not optional. `borrowShares` / `totalBorrowAssets` / `totalBorrowShares` let an integrator recompute the exact current debt from shares before submitting a liquidation.

---

## 2. Liquidation zone (Moolah)

Three related feeds under `/api/liquidation/zone`: `/list` is the per-market borrower whitelist with position snapshots, `/closeToLiquidate` is the at-risk feed, and `/history` is settled liquidations.

### GET /api/liquidation/zone/list

Returns the contents of the liquidation whitelist, ordered by insertion. To monitor positions approaching the threshold, use [`/closeToLiquidate`](#get-apiliquidationzoneclosetoliquidate). This endpoint applies **no** eligibility or liquidatability predicate of its own beyond the optional filters below — treat it as a candidate feed and confirm each position's health on-chain before acting on it.

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

> **Send array filters as repeated parameters** — `?collaterals=BTCB&collaterals=WBNB`, or the bracket form `?collaterals[]=BTCB` for a single value. A single un-repeated `?collaterals=BTCB` arrives as a plain **string** and is spread **character by character** into the `IN (…)` list, so it silently matches the tokens `B`, `T`, `C` — a wrong result set, not an empty one and not an error. `/list` and `/history` additionally reject more than 10 values; that check is on length, so one un-repeated value longer than 10 characters is rejected too.

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
| `collateralUiMultiplier` | string | Display multiplier for the collateral amount; `"1"` for everything except bStock collateral, which is reported in underlying units. Multiply before display. |
| `collateralSymbol` | string | Collateral symbol. |
| `collateralIcon` | string | Collateral icon URL. |
| `loanValueUsd` | string | Borrow value in USD. |
| `loanToken` | string | Loan token address. |
| `loanDecimal` | number | Loan token decimals. |
| `loanSymbol` | string | Loan symbol. |
| `oracle` | string | Market oracle address. |
| `lltv` | string | Liquidation LTV as a **decimal fraction** (e.g. `0.86`) — note this differs from `/api/moolah/allMarkets`, which returns it scaled to 1e18. |
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
| `collateralUiMultiplier` | string | Display multiplier for the collateral amount; `"1"` for everything except bStock collateral, which is reported in underlying units. Multiply before display. |
| `loan` | string | Loan amount. |
| `loanInUsd` | string | Loan value in USD. |
| `loanToken` / `loanSymbol` / `loanDecimal` | string / number | Loan token metadata. |
| `lltv` | string | Liquidation LTV as a **decimal fraction** (e.g. `0.86`) — note this differs from `/api/moolah/allMarkets`, which returns it scaled to 1e18. |
| `time` | number | Unix seconds when the indexer recorded the liquidation — **not** the on-chain block time, and it can lag. `/api/v2/liquidated/lending/history` returns the on-chain event time instead. |
| `chain` | string | Chain identifier. |

### GET /api/liquidation/zone/closeToLiquidate

Open positions whose safety factor (`marketLiqRate / positionLiqRate`) is below `1.5`. There is **no lower bound** — a safety factor under `1` means the position is already liquidatable, so this feed overlaps `/api/moolah/redPositions` rather than being strictly "at risk but healthy". Ordered by safety factor ascending (closest to liquidation first), then by position update time descending.

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

> Unlike `/list` and `/history`, this endpoint normalises a single un-repeated value, so both `?collaterals=BTCB` and the repeated form work, and there is no 10-value limit.

#### Response

`{ total, list }`, where each item includes:

| Field | Type | Description |
|-------|------|-------------|
| `marketId` | string | Market identifier. |
| `user` | string | Borrower address. |
| `collateral` | string | Collateral amount. |
| `borrowed` | string | Borrowed amount. |
| `collateralToken` / `collateralSymbol` / `collateralIcon` | string | Collateral token metadata. |
| `collateralUiMultiplier` | string | Display multiplier for the collateral amount; `"1"` for everything except bStock collateral, which is reported in underlying units. Multiply before display. |
| `collateralPrice` | string | Collateral price. |
| `loanToken` / `loanSymbol` / `loanIcon` | string | Loan token metadata. |
| `loanPrice` | string | Loan price. |
| `lltv` | string | Liquidation LTV as a **decimal fraction** (e.g. `0.86`) — note this differs from `/api/moolah/allMarkets`, which returns it scaled to 1e18. |
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
| `start` | number | **Yes** | Offset, snapped down to a multiple of 10. There is no default — omitting it makes the server compute `NaN` and the request fails. |
| `count` | number | **Yes** | Page size, snapped down to a multiple of 20 then clamped to `[20, 100]`. No default; omitting it fails the request. |

Response: `{ users: [...] }`, each entry containing `userAddress`, `tokenName`, `collateralCurrency`, `collateral`, `liquidationPrice`, `liquidationCost`, `rangeFromLiquidation`. On this endpoint `rangeFromLiquidation` is always `0` (the positions are already liquidatable), and `liquidationCost` is a high-precision decimal string of up to 20 fractional digits — parse it with a big-number library, not `parseFloat`.

### GET /api/v2/liquidations/orange

Positions approaching the liquidation threshold (within the danger band, but not yet liquidatable). Same parameters and response shape as `/red`, but **not the same ordering**: `/red` sorts by liquidation price descending, `/orange` by `rangeFromLiquidation` ascending. Here `rangeFromLiquidation` reflects the remaining buffer to liquidation.

### GET /api/v2/liquidations/auctionUser

Look up the borrower(s) and clipper (auction contract) for a given liquidation auction.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `auctionId` | number | No\* | Auction identifier. |
| `token` | string | No\* | Collateral token address. |

> \* Both are bound unconditionally as equality filters. Omitting either returns an empty `users` array rather than an unfiltered list.

Response: `{ users: [{ userAddress, clipperAddress }] }`.

### GET /api/v2/liquidated

Recently liquidated CDP positions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start` | number | No | Offset. Defaults to `0`. |
| `count` | number | No | Page size. Defaults to and capped at `20`. |

Related sub-paths on the same controller: `GET /api/v2/liquidated/:user` (liquidations for one address), `GET /api/v2/liquidated/:user/latest?collateral=` (volume-weighted average liquidation price for an address + collateral), and `GET /api/v2/liquidated/lending/history` (Moolah lending liquidation history, with `collaterals` / `loans` / `userAddress` / `loanInUsd` filters). Three things to know about that last one: results are hard-capped to the **last 30 days** despite the name; `pageSize` is snapped down to a multiple of 10, floored at 10 and capped at 50; and the item shape differs from `/zone/history` — it adds `tx` and uses the on-chain event time, but omits `liquidator`, `repaidInUsd`, `seizedInUsd`, `collateralMarketPrice`, `loan`, `loanInUsd`, the token addresses and the decimals. Its `type` is always the literal `"lending"`.

> Addresses are stored lower-cased by the indexer. `/zone/history` lower-cases the filter for you; `/closeToLiquidate` and `/liquidated/:user` pass it through verbatim — send lower-case to be safe.


---

## 4. Emission (rewards) — merkle proofs

Lista Lending distributes emission rewards via a **weekly merkle-root** model: an off-chain job publishes a merkle root per week, and each eligible user fetches their leaf (amount + merkle proof) from the API and claims on-chain. These endpoints therefore return a **proof to claim**, not a pre-credited balance.

> **Authentication (wallet signature required).** These endpoints are signature-gated; the message format, the `type=safe` ERC-1271 path and the error names are in [Conventions](conventions.md#signature-gated-endpoints).
>
> **Treat the assembled URL as a credential.** `address`, `signature`, and `message` are query parameters, and the signed message is valid for 7 days with no nonce and no endpoint binding — so any copy of the URL grants read access to that address's reward data for the remainder of the window. Do not log these URLs, put them in bug reports, or pass them through third-party services; sign a fresh message per session and keep the lifetime short.

### GET /api/moolah/emission/userProof

Returns the LISTA-emission merkle proof for the latest active weekly root.

> **`amount` is cumulative, not a balance.** The merkle leaf encodes everything the address has earned to date, and the distributor subtracts what it has already paid out. To show what is actually claimable now, subtract the address's on-chain claimed total from `amountWei` — `claimed(user)` on the single-token LISTA distributor behind this endpoint, or `claimed(user, token)` on the multi-token distributor behind `/userMultiProof` — treating `amount` as the claimable figure over-reports by the full claim history.

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
| `amount` | string | **Cumulative** amount earned to date, as encoded in the leaf (scaled). |
| `amountWei` | string | Same figure, raw integer. |
| `proof` | string[] | Merkle proof nodes. |
| `currentAmount` | string | Amount attributable to the current week. |

When the user has no leaf for the latest root, an empty proof is returned: `{ rootId: "", amount: "0", amountWei: "0", proof: "" }`. Two differences from the populated shape — `currentAmount` is **absent entirely**, and `proof` is an empty **string** rather than the `string[]` the table lists.

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
| `amount` | string | **Cumulative** amount earned to date (scaled); `0` if only an estimate exists. |
| `amountWei` | string | Same figure, raw; `0` if estimate-only. |
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

## 5. CDP markets (separate controller)

Traditional single-collateral CDP markets are keyed by an `ilk` (collateral type) rather than a Moolah `marketId`, and live in their own namespace at `/api/cdp/market/*` (`/search`, `/list`, `/info`, `/borrowRate/history`, `/userBorrow/history`). They are documented separately — do not query them through the Moolah position/liquidation endpoints above.

---

## Related pages

- [Market API](market.md) — markets, oracles, borrow-rate history, on-chain market config.
- [Vault](vault.md) — vault list, detail, allocation.
- [Liquidation Logic (Service)](../liquidation-logic.md) — how at-risk and liquidatable positions are determined.
