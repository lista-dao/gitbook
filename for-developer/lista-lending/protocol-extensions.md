# Protocol Extensions

Moolah extends Morpho Blue with protocol-level controls designed for production risk management and product flexibility.

## Minimum Loan Restriction (`minLoan`)

Moolah enforces a single **protocol-wide** minimum, `minLoanValue`, which `minLoan(marketParams)` converts into each market's loan token. There is no per-market setting.

* Supply, borrow and repay all revert when they would leave a **non-zero** position below `minLoan`.

See [Contract & Interface Reference](contract-reference.md) for the conversion and the `MANAGER`-adjustable value.

This avoids dust positions that are expensive to liquidate and can increase bad-debt risk.

## Reentrancy Protection

> The guard is a **single global** slot, not per-function, and it covers eight entry points: `supply`, `withdraw`, `borrow`, `repay`, `supplyCollateral`, `withdrawCollateral`, `liquidate` and `liquidateBrokerPosition`. `flashLoan` is deliberately excluded. See [Events & Callbacks](events-and-callbacks.md) for what that means for callback-based flows — in short, only `onMoolahFlashLoan` can re-enter a guarded entry point, though views, `accrueInterest` and `flashLoan` stay callable from any callback.


## Upgradeability

Moolah is deployed as an upgradeable system.

* Upgrade authority is controlled by `DEFAULT_ADMIN_ROLE`.
* Execution is delayed by TimeLock.
* TimeLock provides a 1-day review window before upgrade takes effect.

## Oracle Architecture

Moolah oracles expose `peek(address)`. Every deployed Lista oracle except `IdleOracle` (which returns a literal `0` for its idle collateral) returns an 8-decimal price, but that is a property of those deployments, not something the interface declares or Moolah validates — see [Consuming Oracle Prices](../multi-oracle/consuming-prices.md) before trusting a scale on a market whose oracle you did not deploy.

### Resilient Oracle

For resilient/multi-source oracle design, see:

* [Multi-Oracle](../multi-oracle.md)

### PT Linear Discount Oracle

PT tokens use a linear discount model against underlying asset price before maturity.

* Typical use case: PT-based collateral markets such as `PT-USDe / USD1`
* Discount formula:

```text
discount = baseDiscount x (timeToMaturity / totalDuration)
```

At maturity, discount goes to zero and oracle returns full underlying price.
