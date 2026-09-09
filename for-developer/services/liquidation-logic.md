# Liquidation (Service)

Lista operates its own liquidation keeper. Its scheduling, thresholds, and retry behaviour are internal and are not documented here.

Third-party liquidators do not need them. What you do need:

* **Eligibility** — a position is liquidatable when `LTV > LLTV`, i.e. when the collateral price returned by `getPrice(marketParams)` falls below the position's liquidation price. The exact on-chain formula, the scale factors, and the `isHealthy` view are in [Consuming Oracle Prices](../multi-oracle/consuming-prices.md).
* **Finding candidates** — `GET /api/liquidation/zone/list` for positions currently eligible, and `GET /api/liquidation/zone/closeToLiquidate` for positions approaching the threshold. See [Positions, Liquidation & Emission](lending-api/position-liquidation-emission.md).
* **Executing** — call through `PublicLiquidator`, which is permissionless and self-funded. Entry points, sizing, and the eligibility gate are in [Liquidator Integration](../lista-lending/liquidator-integration.md).

Lista's keeper competes on the same public paths as anyone else. Running your own liquidator does not require, and does not receive, any knowledge of its configuration.

For the product-level explanation of liquidation, see [Liquidation](../../introduction/lista-lending/liquidation/README.md).
