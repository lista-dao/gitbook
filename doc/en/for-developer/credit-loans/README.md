# Credit Loans

## Overview

`CreditBroker` is a specialized fixed-term, fixed-rate lending broker built on top of the LendingBroker pattern and extended with credit-limit gating.

It enables Lista DAO to offer loans where user eligibility and borrow capacity come from off-chain credit scoring, represented on-chain via Merkle roots.

Unlike standard collateral-based Moolah markets, Credit Loans use `CreditToken` as collateral representation:

* `CreditToken` is non-transferable.
* `1 CreditToken = 1 unit of credit limit = 1 USD borrowing capacity`.

## Contents

* [Loan Lifecycle](loan-lifecycle.md)
* [Bad Debt Handling](bad-debt-handling.md)
* [Smart Contract](smart-contract.md)
