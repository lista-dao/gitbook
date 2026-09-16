# Bad Debt Handling

Defaults are recognised on-chain rather than carried at face value, so the loss lands on whoever holds vault shares at the moment of write-off.

Write-off is **driven by Lista, not by you**. A `BOT` calls `CreditBroker.liquidate(borrower, posId)`, which calls `Moolah.liquidateBrokerPosition` — and that in turn requires `msg.sender == brokers[id]`, so neither is reachable from a third-party account. (`CreditBroker` also carries a `liquidate(Id, address)` overload that always reverts `not supported`; it exists only to satisfy an interface.) The call reduces the market's outstanding borrow and the vault's total assets in the same transaction, so share price drops immediately and pro-rata.

What that means for a depositor:

* There is no insurance tranche and no first-loss absorber — current shareholders absorb the full loss.
* The compensation for that risk is that performing loans pay well: on an upfront-interest term the borrower owes the **whole term's** interest however early they repay, and an overdue position pays a penalty on top.

Since you cannot trigger it, the integration question is how to **detect** one: watch the broker's liquidation events — see [Loan Lifecycle](loan-lifecycle.md) for the event set.
