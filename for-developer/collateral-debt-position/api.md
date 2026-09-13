# CDP API

Read-side endpoints for the **lisUSD CDP**, where each position is backed by a single collateral type (`ilk`). They key on `ilk` (collateral type) and collateral token address, not on a Moolah `marketId`.

> The CDP is being wound down — see [Mechanics](mechanics.md). These feeds serve existing positions. For Moolah markets use [Positions, Liquidation & Emission](../services/lending-api/position-liquidation-emission.md).

Conventions (base URL, envelope, chain selector, pagination) are shared with the rest of the API — see [Conventions](../services/lending-api/conventions.md).

## Liquidation feeds

These `/api/v2/liquidations/*` and `/api/v2/liquidated` endpoints serve the **CDP (single-collateral) borrow product**, not Moolah markets. They read from the borrower index and key results by collateral token address. Use [Positions, Liquidation & Emission](../services/lending-api/position-liquidation-emission.md) for Moolah-market liquidations.

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

### GET /api/v2/liquidated/:user

Liquidations for one address. `GET /api/v2/liquidated/:user/latest?collateral=` returns the volume-weighted average liquidation price for an address and collateral.

> Addresses are stored lower-cased by the indexer and `/liquidated/:user` passes the value through verbatim — send lower-case.

## Market feeds

`/api/cdp/market/*` serves the CDP markets themselves. `/info`, `/borrowRate/history` and `/userBorrow/history` each take a required `ilk`. `/list` is a paginated listing filtered by collateral **symbol**, returning the `ilk` per row; `/search` takes a required `typeId=collateral`.
