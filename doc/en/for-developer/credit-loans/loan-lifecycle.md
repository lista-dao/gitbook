# Loan Lifecycle

| Phase | Timing | Description |
| --- | --- | --- |
| 1. Credit assessment | Daily (off-chain) | Lista scores eligible Binance MPC wallets, assigns credit limits, and publishes a new Merkle root to `CreditBroker`. |
| 2. CreditToken mint/burn | After root update | User submits Merkle proof to claim or adjust `CreditToken` balance. Mint for increased score, burn for reduced score. |
| 3. Supply and borrow | T = 0 | Borrower calls `CreditBroker.supplyAndBorrow(amount, proof)`. Proof is validated, broker calls `Moolah.borrow()` on behalf of user, upfront interest is deducted, and net amount is disbursed. |
| 4. Repayment | On or before maturity | Borrower calls `repay()`. Principal returns to vault. |
| 5. Grace period | Maturity to maturity + grace | Loan is overdue but penalty is not yet applied. Borrower can still repay principal plus origination fee. |
| 6. Penalty applied | After grace period | A `3%` penalty is applied to outstanding debt and routed to Credit Vault. |
| 7. Blacklist | After penalty trigger | Merkle-gated operations (supply/withdraw/borrow) are suspended until full repayment including penalty. |
| 8. Reinstatement | After full repayment | Blacklist is removed. Credit score may be restored gradually, based on policy. |

## Notes

* Interest is typically collected upfront in the broker flow.
* `CreditBrokerInterestRelayer` routes interest to Credit Vault.
* Merkle proof checks are central to both credit-limit updates and borrow authorization.
