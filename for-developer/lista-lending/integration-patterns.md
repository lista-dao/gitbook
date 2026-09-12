# Integration Patterns

Moolah supports two external integration patterns. They operate at different layers of the lending stack.

## Which surface do I call?

A market can be gated on either side. Probe both before building against it — a gated market rejects a direct call:

```solidity
MOOLAH.providers(id, marketParams.collateralToken);  // non-zero -> collateral must route through it
MOOLAH.brokers(id);                                  // non-zero -> borrow/repay must route through it
```

| Your case | Call | Reference |
| --- | --- | --- |
| Plain ERC-20 collateral, variable rate | Moolah directly | [Contract & Interface Reference](contract-reference.md) |
| `slisBNB` collateral | `SlisBNBProvider` | [Providers](providers.md) |
| Native BNB into a WBNB vault | `BNBProvider` | [Providers](providers.md) |
| StableSwap LP collateral | `SmartProvider` | [Smart Lending & StableSwap](stableswap-integration.md) |
| Fixed-term borrowing | the market's `LendingBroker` | [Broker Reference](broker-reference.md) |
| Undercollateralized credit | `CreditBroker` | [Loan Lifecycle](../credit-loans/loan-lifecycle.md) |
| Depositing to earn, not borrowing | the ERC-4626 vault | [Vault Reference](vault-reference.md) |
| Moving a variable position to a fixed term | `PositionManager` | [Position Conversion](position-conversion.md) |
| Liquidating someone else's position | `PublicLiquidator` | [Liquidator Integration](liquidator-integration.md) |


| Pattern | Purpose | Typical Usage |
| --- | --- | --- |
| Provider | Handles collateral deposit/withdraw flow, asset conversion, and optional `slisBNBx` mint/burn callbacks. | `slisBNB` collateral, Lista StableSwap LP collateral, WBNB vault integrations, parts of credit flows |
| Broker | Curates access to one or more markets and handles loan-origination logic. | Fixed term/rate lending products, credit loans |

## Provider Integration

A provider sits between user and Moolah core for specific collateral types. Instead of calling Moolah directly, users call provider contracts that normalize assets and route collateral into target markets.

| Provider | Collateral Type | `slisBNBx` Minting |
| --- | --- | --- |
| `SlisBNBProvider` | `slisBNB` liquid staking token | Yes |
| `SmartProvider` | Lista StableSwap LP tokens | Only the slisBNB/BNB instance |
| `BNBProvider` | Native BNB wrapped to WBNB | No |
| `CreditBroker` | Lista Credit Token | No |

> `CreditBroker` appears in **both** tables on purpose: on the Credit market it is registered as the collateral provider *and* as the broker. Both `Moolah.providers(id, creditToken)` and `Moolah.brokers(id)` return the same address, so it gates collateral movement and borrow/repay origination at once. It is the only contract registered in both roles.

## Broker Integration

A broker is a loan-origination layer for curated products. Unlike providers, brokers focus on terms, rates, and borrower eligibility before routing calls into Moolah.

Broker markets are created against `FixedRateIrm` rather than the adaptive curve, and the Moolah-level rate is left at zero — the broker's own term rate is what the borrower pays. Reading `borrowRateView` on such a market returns `0`; read the rate from the broker's `getFixedTerms()` instead.

| Broker Type | Product | Key Differentiator |
| --- | --- | --- |
| Lending Broker | Lista fixed term & fixed rate markets | Uses `FixedRateIrm` instead of utilization-based adaptive curve |
| Credit Broker | Lista Credit Loans | Supports undercollateralized borrowing with credit-limit gating |
