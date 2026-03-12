# Integration Patterns

Moolah supports two external integration patterns. They operate at different layers of the lending stack.

| Pattern | Purpose | Typical Usage |
| --- | --- | --- |
| Provider | Handles collateral deposit/withdraw flow, asset conversion, and optional `slisBNBx` mint/burn callbacks. | `slisBNB` collateral, Lista StableSwap LP collateral, WBNB vault integrations, parts of credit flows |
| Broker | Curates access to one or more markets and handles loan-origination logic. | Fixed term/rate lending products, credit loans |

## Provider Integration

A provider sits between user and Moolah core for specific collateral types. Instead of calling Moolah directly, users call provider contracts that normalize assets and route collateral into target markets.

| Provider | Collateral Type | `slisBNBx` Minting |
| --- | --- | --- |
| `SlisBNBProvider` | `slisBNB` liquid staking token | Yes |
| `SmartProvider` | Lista StableSwap LP tokens | Yes |
| `BNBProvider` | Native BNB wrapped to WBNB | No |
| `CreditBroker` | Lista Credit Token | No |

## Broker Integration

A broker is a loan-origination layer for curated products. Unlike providers, brokers focus on terms, rates, and borrower eligibility before routing calls into Moolah.

In many broker markets, base market rate is initialized to zero in Moolah and broker-level logic applies product-specific borrowing behavior.

| Broker Type | Product | Key Differentiator |
| --- | --- | --- |
| Lending Broker | Lista fixed term & fixed rate markets | Uses `FixedRateIRM` instead of utilization-based adaptive curve |
| Credit Broker | Lista Credit Loans | Supports undercollateralized borrowing with credit-limit gating |
