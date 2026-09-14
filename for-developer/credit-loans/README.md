# Credit Loans

## Overview

Lista Credit offers fixed-term, fixed-rate loans whose size is set by a credit limit rather than by posted collateral. Eligibility and capacity are assessed off-chain and published on-chain as a Merkle root.

The contract is `CreditBroker`, a `LendingBroker` extended with that credit-limit gate.

Unlike standard collateral-based Moolah markets, Credit Loans use `CreditToken` as collateral representation:

* `CreditToken` has **18 decimals**, so a $10,000 limit is `10000e18`, not `10000`.
* `CreditToken` is non-transferable except by whitelisted `TRANSFERER`s — the brokers and Moolah. See [Loan Lifecycle](loan-lifecycle.md).
* `1 CreditToken = 1 unit of credit limit = 1 USD borrowing capacity`.

