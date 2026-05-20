# Liquidation Logic (Service)

This page describes how the **platform service** determines liquidatable positions and executes or supports liquidation: batch flow, eligibility checks, risk controls, and interaction with the liquidation contract.

## Inputs and dependencies

- **Execution context** — Chain(s), run config, list of markets to process.
- **Market data** — Collateral/loan assets, oracles, market params (LLTV, etc.).
- **Risk config** — Eligibility rules, minimum size threshold, delay rules, stable-asset handling.
- **Prices and state** — Oracle prices, market state, recent processing state / cache for dedup.

## Eligibility

- **Condition** — Position is liquidatable when `LTV > LLTV` for that market (LLTV from market params). Equivalently: **liquidation trigger price > current market price** (trigger price is the collateral/loan price ratio at which the position becomes liquidatable).
- **LTV** — `LTV = (Borrowed × Loan Oracle Price) / (Collateral × Collateral Oracle Price)` with contract’s scaling (e.g. 1e36).
- **Data** — Use the same oracle and market params as the contract; re-fetch oracle and position state at execution time to avoid staleness or front-running.

## Batch flow

1. **Run prep** — Validate environment and market list.
2. **Scan** — Query positions (e.g. from `MoolahUserPosition`) with `borrowedAmount > 0`.
3. **Risk identification** — For each position’s market, fetch current prices; compute liquidation trigger price and compare to current market price; keep positions where trigger price > current price.
4. **Delay and thresholds** — Apply configurable delay and minimum-size filters (see Risk controls below).
5. **Execution** — For each eligible position, select liquidation path (main Liquidator or pre-liquidation contract) and execute; use repaid amount and LIF to compute collateral to seize.
6. **Result and dedup** — Record outcomes; short-term dedup so the same position is not processed again within the configured window.

## Risk controls

- **Price validity** — Skip markets with missing or abnormal prices to avoid false liquidations.
- **Delay** — Optional delay for certain positions to reduce false positives from volatility.
- **Size threshold** — Do not trigger liquidation for positions below a minimum size (e.g. gas or economic threshold).
- **Dedup** — After processing a position, mark it (e.g. in cache) so it is not re-submitted for a short period.

## Observability

- Logs should cover: batch run, per-market processing, per-position eligibility, and result (executed / skipped / reason).
- Outputs: count processed, duration, skip reasons (e.g. price invalid, below threshold, dedup).

## Contract-side formulas (reference)

Service eligibility should match the contract’s health logic. Abstract formulas:

- **No debt** — `isHealthy = true`.
- **Borrowed amount** — Standard market: `borrowed = convertBorrowSharesToAssets(shares, totalBorrowAssets, totalBorrowShares)`. Broker market: `borrowed = getBrokerTotalDebt(borrower, market)`.
- **Max borrow** — `maxBorrow = collateral × price × lltv` (price = collateral/loan relative price).
- **Health** — `isHealthy = (maxBorrow ≥ borrowed)`.
- **Risky** — `isRisky = ¬isHealthy`; these are the candidates for liquidation (subject to service risk controls above).

## Implementation notes

- **Rounding** — Match contract rounding (typically down for user amounts) to avoid off-by-one in eligibility.
- **Gas / batching** — Liquidations are often executed by keeper bots; the service may only provide a liquidatable list API (e.g. `GET /api/moolah/liquidation/liquidatable`) and history.
- **Pre-liquidation** — When a market uses an external pre-liquidation contract, identify positions in the band `preLLTV ≤ LTV < LLTV` and route callers to that contract where applicable.

For product-level liquidation explanation and examples, see [Liquidation](../../introduction/lista-lending/liquidation/README.md).
