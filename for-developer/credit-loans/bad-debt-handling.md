# Bad Debt Handling

## Why Write-Off Matters

Credit Vault has a fairness issue if defaults are not explicitly recognized on-chain.

Because interest is collected upfront and distributed immediately, early withdrawers may exit before default losses are reflected. If bad debt remains booked at face value, vault NAV is overstated and later withdrawers bear disproportionate liquidity risk.

## Write-Off Flow

To resolve this, bad debt is recognized via liquidation/write-off paths such as:

* `CreditBroker.liquidate()`
* `Moolah.liquidateBrokerPosition()`

When write-off is executed:

1. Outstanding borrow balance is reduced in market accounting.
2. Vault total assets are adjusted to recoverable value.
3. Share price is reduced immediately and proportionally.

This ensures losses are distributed to current shareholders at the time of realization, rather than deferred to later exits.

## Impact on Vault Shareholders

* Defaulted principal reduces vault total assets.
* Share price drops proportionally at write-off time.
* All current shareholders absorb loss pro-rata.
* There is no insurance tranche or first-loss absorber in this model.

Tradeoff: shareholders take this risk in exchange for higher yield from upfront interest and overdue penalties on performing loans.
