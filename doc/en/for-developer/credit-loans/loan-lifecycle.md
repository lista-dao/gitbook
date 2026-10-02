# Loan Lifecycle

A Lista Credit loan runs from credit-limit provisioning through borrowing, repayment, the grace and penalty window, and reinstatement. Every step is on-chain in `CreditToken` and `CreditBroker`; only the Merkle **root** is committed in advance. A user's score becomes public on-chain state once synced — `CreditToken.creditScores` is a public mapping, the sync emits `ScoreSynced`, and the credit-token balance is itself 1 token per USD of limit. What stays off-chain is the scoring **inputs and model**, not the resulting score.

> The grace period, penalty rate, no-interest window and LISTA discount are all manager-adjustable on-chain. Read `graceConfig()` and `listaDiscountRate` on `CreditBroker`, and `waitingPeriod` on `CreditToken`, at the time you need them — none of them is a fixed product guarantee.

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
| 1. Credit-limit publication | Off-chain assessment → `CreditToken.setPendingMerkleRoot` then `acceptMerkleRoot` (`BOT`) | A new Merkle root is staged, then accepted after a waiting period (`waitingPeriod`, floored at 6h). Accepting increments `versionId`. Only the root is published — not the underlying scores. |
| 2. Score sync (mint/burn) | `syncCreditScore(user, score, proof)` — also run implicitly by broker actions | The user's `(score, proof)` is verified against the current root **only when the submitted score or the stored `versionId` differs from what is already recorded** — an unchanged score accepts an empty proof and `versionId`. `CreditToken` mints up to the new score or burns down to it (1 token = 1 USD of credit capacity). |
| 3. Supply collateral | `supplyCollateral(amount, score, proof)` | Broker syncs the score, pulls `CreditToken` from the user, and supplies it as collateral into the broker's Moolah market. |
| 4. Borrow (open fixed position) | `supplyAndBorrow(collateralAmount, borrowAmount, termId, score, proof)` or `borrow(amount, termId, score, proof)` | Guarded by `noDebt` and `userNotPenalized`. The borrower receives the **full** `borrowAmount`; on an upfront-interest term the whole term's interest is owed from the start rather than deducted at disbursement. A `FixedLoanPosition` is created with the term's `apr`, `start`, `end`, and `termType`; the broker borrows from Moolah and transfers the loan token to the user. Emits `FixedLoanPositionCreated`. |
| 5. Interest accrual | Time | Interest grows per the position's `FixedTermType` (see below). Interest is tracked at the broker. For a broker market `_isHealthy` ignores the per-user price entirely and compares collateral at the **plain market price** against the **broker's** total debt; the per-user price only shapes the seize math once a liquidation runs. So Moolah perceives the rising risk. |
| 6. Repayment | `repay(amount, posId, onBehalf)` / `repayAndWithdraw(...)` / `repayInterestWithLista(...)` (gated — see below) | Interest is repaid first, then principal. Interest (and any penalty) is supplied to the Credit Vault via the relayer. Emits `RepaidFixedLoanPosition`. |
| 7. Grace period | `end` → `end + graceConfig.period` | The loan is overdue but **no penalty applies yet**. The borrower can still repay normally. |
| 8. Penalty window | After `end + graceConfig.period` (`dueTime`) | The position is "penalized." A penalty of `penaltyRate × (remaining principal + accrued interest) / RATE_SCALE` is required, and the position **must be repaid in full** in a single repayment. `graceConfig.penaltyRate` is `RATE_SCALE`-scaled (`1e27`), so `3 * 1e25` reads as 3%; `setGraceConfig` caps it at `RATE_SCALE`. Read it from `graceConfig()`; the `initialize()` default in the source is not what is deployed. |
| 9. Liquidation / bad debt | `CreditBroker.liquidate(borrower, posId)` (`BOT` only) | A penalized, not-already-bad-debt position is written off via `Moolah.liquidateBrokerPosition`; the position is flagged `isBadDebt`. See [Bad Debt Handling](bad-debt-handling.md). |
| 10. Reinstatement | Full repayment of the penalized/bad-debt position | The position is paid off and removed; `PaidOffPenalizedPosition` is emitted when a penalty was settled. Once outstanding debt (`CreditToken.debtOf`) is cleared, the user may borrow again. |

## Fixed-term interest modes (`FixedTermType`)

Each fixed-term product carries one of two interest modes. `CreditBroker`'s `FixedTermAndRate` is **not** the same struct as `LendingBroker`'s: it adds a fourth field, `termType`, so the two cannot share an ABI decoder. The mode is fixed at borrow time and stored on the position; it determines how interest is computed.

| Mode | Enum | How interest is charged |
| --- | --- | --- |
| Accrue per-second | `ACCRUE_INTEREST` (0) | Interest accrues linearly on the **remaining** principal: `(principal − principalRepaid) × aprPerSecond × elapsed / RATE_SCALE`, where `aprPerSecond = (apr − RATE_SCALE) / 365 days`. `elapsed` runs from **`lastRepaidTime`**, not from the position start, and a partial principal repayment resets `lastRepaidTime` to the current block — so interest is not a single accrual over the whole term. Both ends are capped at the position `end`. There is no upfront charge. |
| Upfront | `UPFRONT_INTEREST` (1) | Full term interest is owed once the no-interest window passes: `principal × (apr − RATE_SCALE) × term / (365 days × RATE_SCALE)`. Within `noInterestUntil` (set to `start + graceConfig.noInterestPeriod`) the interest is 0. |

`apr` is scaled by `RATE_SCALE = 1e27` and encoded as `RATE_SCALE + rate` — a 10% APR is `1.10e27`. Subtract `RATE_SCALE`, not `1`, before using it in either formula above. `apr − RATE_SCALE` is itself still `RATE_SCALE`-scaled (10% APR → `1e26`, not `0.1`) — both formulas above, and the penalty formula below, each carry an explicit `/ RATE_SCALE` alongside the subtraction to remove that scale; drop either the subtraction or the division and the result is 1e27× too large.

## Repayment rules

* **Interest first, then principal.** A repayment pays down outstanding interest before principal. Interest collected is supplied to the Credit Vault through the relayer.
* **Penalized positions must be repaid in full.** Once past `dueTime`, a repayment must cover remaining principal + remaining interest + penalty in one transaction, or it reverts.
* **Repay interest with LISTA (discounted).** `repayInterestWithLista(loanTokenAmount, listaAmount, posId, onBehalf)` lets a borrower settle outstanding interest using LISTA at a discount. Read `listaDiscountRate` for the rate and `allowTransferLoan` for whether the path is open — it reverts `relayer/transfer-loan-not-allowed` when it is not. The LISTA is sent to the relayer; the equivalent loan-token interest is credited from the relayer to the broker.
* **Minimum loan check.** A borrow validates only the position it just opened against the Moolah market `minLoan`; a repay validates only the position it just touched, and only if it isn't fully cleared. Neither sweeps the account's other positions. Moolah separately enforces the same floor on the account's aggregate borrow.

## Borrow guards

A new fixed position can only be opened when both broker modifiers pass:

| Guard | Condition | Source |
| --- | --- | --- |
| `noDebt` | `CreditToken.debtOf(borrower) == 0` — the user must have no outstanding credit-token debt. This is an **accounted** amount, not a wallet balance: it counts credit tokens held plus those posted as collateral, so an address with a zero wallet balance can still be blocked here. | `CreditBroker._borrow` |
| `userNotPenalized` | The user has no fixed position past its `dueTime`. | `CreditBroker._borrow` |

Before borrowing, the broker calls `_tryWithdrawAndBurnDebt`, which withdraws and burns any `CreditToken` debt so the `noDebt` guard can be satisfied.

## Credit-limit gating (Merkle root)

* `CreditToken` is non-transferable except by whitelisted `TRANSFERER`s (the brokers and Moolah). `1 CreditToken = 1 USD` of borrow capacity.
* A user's balance is reconciled to their published score on every `syncCreditScore`: the broker passes `(score, proof)` and the token verifies the leaf `keccak256(abi.encode(chainid, creditToken, user, score, versionId))` against the current root before minting up to, or burning down to, the score.
* The root is rotated in two steps by the `BOT` role: `setPendingMerkleRoot` → wait `waitingPeriod` (floored at 6h) → `acceptMerkleRoot` (increments `versionId`). A pending root can be cancelled by the `MANAGER` via `revokePendingMerkleRoot`.

> Do not infer scoring inputs from the on-chain flow — the assessment that produces a limit is off-chain, and only its output reaches the chain.

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

* [Smart Contract](smart-contract.md) — contract roster and roles.
* Canonical addresses: [BSC Credit (Lista Lending)](../lista-lending/smart-contract-bsc-credit.md).
