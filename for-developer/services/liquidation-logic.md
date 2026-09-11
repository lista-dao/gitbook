# Liquidation (Service)

Lista operates its own liquidation keeper. Its scheduling, thresholds, and retry behaviour are internal and are not documented here.

Third-party liquidators do not need them. What you do need:

## Eligibility

A position is liquidatable when its loan-to-value exceeds the market's `lltv`:

```
borrowed  = convertBorrowSharesToAssets(borrowShares, totalBorrowAssets, totalBorrowShares)
maxBorrow = collateral × price × lltv      // price = collateral denominated in the loan asset
isHealthy = maxBorrow ≥ borrowed
```

A position with no debt is always healthy. On a broker market the borrower's debt is replaced by the broker's total debt (Moolah principal plus interest accrued at the broker), while the collateral is still priced at the plain market price.

Use the same oracle and market parameters the contract uses, and match its rounding — `maxBorrow` is floored and `borrowed` rounded up, both in the protocol's favour. The exact scale factors, the `isHealthy` view and its caveats, and the liquidation-price formula are in [Consuming Oracle Prices](../multi-oracle/consuming-prices.md).

Re-read the oracle and position state at execution time: Moolah accrues interest and re-checks health when your transaction lands, and reverts `HEALTHY_POSITION` if the position has recovered.

## Finding candidates

* `GET /api/liquidation/zone/list` — the per-market borrower whitelist with each account's latest position snapshot. It applies **no** health test, so treat it as a candidate roster and evaluate eligibility yourself.
* `GET /api/liquidation/zone/closeToLiquidate` — positions approaching the threshold.
* `GET /api/liquidation/zone/history` — settled liquidations.

Parameters and response fields are in [Positions, Liquidation & Emission](lending-api/position-liquidation-emission.md). Indexed data can lag; treat it as a candidate feed and confirm on-chain before submitting.

## Executing

Liquidations are executed through the `PublicLiquidator` contract, which is permissionless and self-funded. Entry points, sizing, the eligibility gate, and the revert reference are in [Liquidator Integration](../lista-lending/liquidator-integration.md).

Lista's keeper competes on the same public paths as anyone else. Running your own liquidator does not require, and does not receive, any knowledge of its configuration.

For the product-level explanation of liquidation, see [Liquidation](../../introduction/lista-lending/liquidation/README.md).
