# Loan Lifecycle

This page describes the on-chain lifecycle of a Lista Credit loan, from credit-limit provisioning through borrowing, repayment, the grace/penalty window, and reinstatement. Every step below is implemented in the deployed `CreditToken` and `CreditBroker` contracts; the off-chain credit assessment is only ever surfaced on-chain as a Merkle root, never as scoring inputs or formulas.

> The values in this page (grace period, penalty rate, LISTA discount, no-interest period, Merkle waiting period) are the **current on-chain configuration**. They are manager/governance-adjustable on-chain and should be read live from the contracts, not treated as fixed product guarantees.

## Roles in the flow

| Actor | Responsibility |
| --- | --- |
| Borrower | Supplies `CreditToken` collateral, borrows the loan token, repays principal + interest (+ penalty if overdue). |
| Off-chain assessment | Computes eligibility/limits off-chain and publishes **only a Merkle root** to `CreditToken`. Scoring inputs and logic are not on-chain. |
| `BOT` role | Rotates the `CreditToken` Merkle root (two-step, time-locked) and triggers liquidation of penalized positions. Operational keeper. |
| `CreditBroker` | Orchestrates collateral supply/withdraw and fixed-term borrow/repay against the underlying Moolah market. |
| `CreditBrokerInterestRelayer` | Receives interest and penalty from the broker and supplies it into the Moolah Credit Vault as revenue. |

## Lifecycle

| Phase | Trigger | What happens on-chain |
| --- | --- | --- |
| 1. Credit-limit publication | Off-chain assessment → `CreditToken.setPendingMerkleRoot` then `acceptMerkleRoot` (`BOT`) | A new Merkle root is staged, then accepted after a waiting period (current default 6h, min 6h). Accepting increments `versionId`. Only the root is published — not the underlying scores. |
| 2. Score sync (mint/burn) | `syncCreditScore(user, score, proof)` — also run implicitly by broker actions | The user's `(score, proof)` is verified against the current root and `versionId`. `CreditToken` mints up to the new score or burns down to it (1 token = 1 USD of credit capacity). |
| 3. Supply collateral | `supplyCollateral(amount, score, proof)` | Broker syncs the score, pulls `CreditToken` from the user, and supplies it as collateral into the broker's Moolah market. |
| 4. Borrow (open fixed position) | `supplyAndBorrow(collateralAmount, borrowAmount, termId, score, proof)` or `borrow(amount, termId, score, proof)` | Guarded by `noDebt` and `userNotPenalized`. A `FixedLoanPosition` is created with the term's `apr`, `start`, `end`, and `termType`; the broker borrows from Moolah and transfers the loan token to the user. Emits `FixedLoanPositionCreated`. |
| 5. Interest accrual | Time | Interest grows per the position's `FixedTermType` (see below). The broker's per-user `peek` price decreases as broker debt outpaces the 0%-rate Moolah debt, so Moolah perceives the rising risk. |
| 6. Repayment | `repay(amount, posId, onBehalf)` / `repayAndWithdraw(...)` / `repayInterestWithLista(...)` | Interest is repaid first, then principal. Interest (and any penalty) is supplied to the Credit Vault via the relayer. Emits `RepaidFixedLoanPosition`. |
| 7. Grace period | `end` → `end + graceConfig.period` | The loan is overdue but **no penalty applies yet**. The borrower can still repay normally. Current grace period: 3 days. |
| 8. Penalty window | After `end + graceConfig.period` (`dueTime`) | The position is "penalized." A penalty of `penaltyRate × (remaining principal + accrued interest)` is required, and the position **must be repaid in full** in a single repayment. Current penalty rate: 15% (`graceConfig.penaltyRate = 15 * 1e25`). |
| 9. Liquidation / bad debt | `CreditBroker.liquidate(borrower, posId)` (`BOT` only) | A penalized, not-already-bad-debt position is written off via `Moolah.liquidateBrokerPosition`; the position is flagged `isBadDebt`. See [Bad Debt Handling](bad-debt-handling.md). |
| 10. Reinstatement | Full repayment of the penalized/bad-debt position | The position is paid off and removed; `PaidOffPenalizedPosition` is emitted when a penalty was settled. Once outstanding debt (`CreditToken.debtOf`) is cleared, the user may borrow again. |

## Fixed-term interest modes (`FixedTermType`)

Each fixed-term product (`FixedTermAndRate`) carries one of two interest modes. The mode is fixed at borrow time and stored on the position; it determines how interest is computed.

| Mode | Enum | How interest is charged |
| --- | --- | --- |
| Accrue per-second | `ACCRUE_INTEREST` (0) | Interest accrues linearly over time: `principal × aprPerSecond × elapsed`, where `aprPerSecond = (apr − 1) / 365 days`. Accrual is capped at the position `end`. There is no upfront charge. |
| Upfront | `UPFRONT_INTEREST` (1) | Full term interest is owed once the no-interest window passes: `principal × (apr − 1) × term / 365 days`. Within `noInterestUntil` (set to `start + graceConfig.noInterestPeriod`, current default 1 second) the interest is 0. |

`apr` is scaled by `RATE_SCALE = 1e27`, expressed as `1 + rate` (e.g. a 10% APR is `1.10 * 1e27`).

## Repayment rules

* **Interest first, then principal.** A repayment pays down outstanding interest before principal. Interest collected is supplied to the Credit Vault through the relayer.
* **Penalized positions must be repaid in full.** Once past `dueTime`, a repayment must cover remaining principal + remaining interest + penalty in one transaction, or it reverts.
* **Repay interest with LISTA (discounted).** `repayInterestWithLista(loanTokenAmount, listaAmount, posId, onBehalf)` lets a borrower settle outstanding interest using LISTA at a discount — current discount 20% (`listaDiscountRate = 20 * 1e25`), i.e. only 80% of the interest value need be paid in LISTA. The LISTA is sent to the relayer; the equivalent loan-token interest is credited from the relayer to the broker. This path is only available while the relayer has `allowTransferLoan` enabled.
* **Minimum loan check.** After any borrow/repay, each non-cleared position must remain at or above the Moolah market `minLoan`.

## Borrow guards

A new fixed position can only be opened when both broker modifiers pass:

| Guard | Condition | Source |
| --- | --- | --- |
| `noDebt` | `CreditToken.debtOf(borrower) == 0` — the user must have no outstanding credit-token debt (excess balance over current score). | `CreditBroker._borrow` |
| `userNotPenalized` | The user has no fixed position past its `dueTime`. | `CreditBroker._borrow` |

Before borrowing, the broker calls `_tryWithdrawAndBurnDebt`, which withdraws and burns any `CreditToken` debt so the `noDebt` guard can be satisfied.

## Credit-limit gating (Merkle root)

* `CreditToken` is non-transferable except by whitelisted `TRANSFERER`s (the brokers and Moolah). `1 CreditToken = 1 USD` of borrow capacity.
* A user's balance is reconciled to their published score on every `syncCreditScore`: the broker passes `(score, proof)` and the token verifies the leaf `keccak256(abi.encode(chainid, creditToken, user, score, versionId))` against the current root before minting up to, or burning down to, the score.
* The root is rotated in two steps by the `BOT` role: `setPendingMerkleRoot` → wait `waitingPeriod` (current default 6h, minimum 6h) → `acceptMerkleRoot` (increments `versionId`). A pending root can be cancelled by the `MANAGER` via `revokePendingMerkleRoot`.

> The off-chain credit assessment that determines eligibility and limits is **not** documented here and is not on-chain. Only the resulting Merkle root is published. Do not infer scoring inputs from the on-chain flow.

## Key events

| Event | Emitted when |
| --- | --- |
| `AcceptMerkleRoot` | A new credit-limit Merkle root is accepted (`CreditToken`). |
| `ScoreSynced` | A user's score/balance is reconciled to the current root (`CreditToken`). |
| `FixedLoanPositionCreated` | A new fixed-term position is opened. |
| `RepaidFixedLoanPosition` | A repayment is applied (interest/principal/penalty breakdown in the event). |
| `RepayInterestWithLista` | Interest is settled using discounted LISTA. |
| `PaidOffPenalizedPosition` | A penalized position is fully paid off. |
| `PositionLiquidate` | A penalized position is liquidated and flagged as bad debt. |

## Related

* [Bad Debt Handling](bad-debt-handling.md) — how a flagged position is written off and how the loss hits Credit Vault shareholders.
* [Smart Contract](smart-contract.md) — contract roster and roles.
* Canonical addresses: [BSC Credit (Lista Lending)](../lista-lending/smart-contract-bsc-credit.md).
