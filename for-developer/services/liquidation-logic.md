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

Use the same oracle and market parameters the contract uses, match its rounding (down, for user amounts), and re-read the oracle and position state at execution time — Moolah re-checks health when your transaction lands and reverts if the position has recovered.

## Finding candidates

* `GET /api/liquidation/zone/list` — positions currently eligible.
* `GET /api/liquidation/zone/closeToLiquidate` — positions approaching the threshold.
* `GET /api/liquidation/zone/history` — settled liquidations.

Parameters and response fields are in [Positions, Liquidation & Emission](lending-api/position-liquidation-emission.md). Indexed data can lag; treat it as a candidate feed and confirm on-chain before submitting.

## Executing

Liquidations are executed through the `PublicLiquidator` contract, which is permissionless and self-funded. Addresses are in [Smart Contract](../lista-lending/smart-contract.md).

Lista's keeper competes on the same public paths as anyone else. Running your own liquidator does not require, and does not receive, any knowledge of its configuration.

For the product-level explanation of liquidation, see [Liquidation](../../introduction/lista-lending/liquidation/README.md).
