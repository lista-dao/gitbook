# Protocol Extensions

Moolah extends Morpho Blue with protocol-level controls designed for production risk management and product flexibility.

## Minimum Loan Restriction (`minLoan`)

Each market can enforce a minimum borrow amount.

* Borrow transactions that result in debt below `minLoan` revert.
* Partial repay transactions that leave remaining debt below `minLoan` also revert.

This avoids dust positions that are expensive to liquidate and can increase bad-debt risk.

## Reentrancy Protection

State-changing paths apply `nonReentrant` guards, including:

* `supply()`
* `borrow()`
* `repay()`
* `withdrawCollateral()`
* `liquidate()`

## Upgradeability

Moolah is deployed as an upgradeable system.

* Upgrade authority is controlled by `DEFAULT_ADMIN_ROLE`.
* Execution is delayed by TimeLock.
* TimeLock provides a 1-day review window before upgrade takes effect.

## Oracle Architecture

Moolah oracles expose a `peek()` interface with 8-decimal price scale (`1e8`).

### Resilient Oracle

For resilient/multi-source oracle design, see:

* [Multi-Oracle](../collateral-debt-position/multi-oracle.md)

### PT Linear Discount Oracle

PT tokens use a linear discount model against underlying asset price before maturity.

* Typical use case: PT-based collateral markets such as `PT-USDe / USD1`
* Discount formula:

```text
discount = baseDiscount x (timeToMaturity / totalDuration)
```

At maturity, discount goes to zero and oracle returns full underlying price.
