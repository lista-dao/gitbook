# Position Conversion

A borrower with a variable-rate position on a Moolah market can move it into a **fixed-term** market without unwinding it themselves. `PositionManager` does it atomically: it flash-loans the loan token from Moolah, repays the variable debt, moves the collateral, and re-borrows the same amount at the fixed term — all in one call.

The mechanism is worth knowing because it is what fails: the migration needs Moolah to have `borrowAmount` of the loan token free for the flash loan, and it is subject to Moolah's global pause.

Deployed addresses are on [BSC Core](smart-contract-bsc-core.md) and [Ethereum](smart-contract-ethereum.md).


> **No borrower-callable reverse path.** Matured fixed positions are folded back into the broker's variable ("dynamic") position by a bot role calling `refinanceMaturedFixedPositions` — you cannot trigger it. To leave a fixed term early, repay the fixed position through its broker. See [Broker Reference](broker-reference.md) for the repay surface.
>
> **Check the lighter path first.** If you only want to move *variable debt you already hold at a broker* into one of that broker's fixed terms, `LendingBroker.convertDynamicToFixed(amount, termId)` does it within the one market — no `PositionManager`, no authorization, no flash loan. `PositionManager` is for crossing from a plain Moolah market into a different, broker-gated one.

---

## The call

```solidity
function migrateCommonMarketToFixedTermMarket(
  MarketParams calldata outMarket,
  MarketParams calldata inMarket,
  uint256 collateralAmount,
  uint256 borrowAmount,
  uint256 borrowShares,
  uint256 termId
) external;
```

`outMarket` is the variable market you are leaving, `inMarket` the fixed-term market you are entering.

## Prerequisite: authorize PositionManager

The manager moves your position on your behalf, so Moolah must be told to allow it. This is the standard authorization flag described in [Contract & Interface Reference](contract-reference.md):

```solidity
// 1. check
MOOLAH.isAuthorized(user, positionManager);   // bool

// 2. if false, the user signs this themselves
MOOLAH.setAuthorization(positionManager, true);
```

Without it the call reverts `not-authorized`.

## Sizing it

Exactly one of `borrowAmount` / `borrowShares` must be zero — the contract enforces `exactlyOneZero` and reverts `exactly-one-of-borrowAmount-or-borrowShares` otherwise. Pass the position's full `borrowShares` to move the whole debt; use `borrowAmount` to move a specific assets figure.

`collateralAmount` must be non-zero (`zero-collateral-amount`).

## What must match

Both markets must share the same pair:

| Check | Revert |
| --- | --- |
| `outMarket.loanToken == inMarket.loanToken` | `loan-token-mismatch` |
| `outMarket.collateralToken == inMarket.collateralToken` | `collateral-token-mismatch` |
| `inMarket.lltv >= outMarket.lltv` | `in-market-lltv-too-low` |
| `inMarket` has a broker registered | `no-broker-for-market` |

So a conversion stays within one asset pair — it changes the rate model, not the exposure.

The LLTV rule bites in practice: broker markets run a wide LLTV spread, so migrating out of a high-LLTV variable market into a lower-LLTV fixed one reverts. Compare `lltv` on both [market rows](smart-contract-bsc-brokers.md) before offering the conversion.

## Finding the target market and term

Two inputs the call needs and cannot derive for you:

- **`inMarket`** — the fixed-term market paired with your variable one. Broker markets are listed with their market ids on [BSC Lending Brokers](smart-contract-bsc-brokers.md); match on the same loan and collateral tokens.
- **`termId`** — read the target broker's `getFixedTerms()`, which returns `{ termId, duration, apr }` per offered term. See [Broker Reference](broker-reference.md).

---

## Reference flow

1. Read the user's position on `outMarket` — `collateral` and `borrowShares`.
2. Pick the fixed-term market with the same pair, and a `termId` from its broker's `getFixedTerms()`.
3. `MOOLAH.isAuthorized(user, positionManager)`; if false, have the user call `setAuthorization(positionManager, true)`.
4. Call `migrateCommonMarketToFixedTermMarket` with the collateral amount and **one** of borrow amount or borrow shares.

After conversion the debt lives at the broker, so read it with `getUserTotalDebt(user)` and repay through the broker rather than through Moolah.

---

## See also

- [Broker Reference](broker-reference.md) — terms, borrowing and repayment on the fixed-term side.
- [Contract & Interface Reference](contract-reference.md) — `setAuthorization` and the authorization model.
- [Moolah Lending SDK](../sdk.md) — note the SDK does not currently build this flow; it has to be assembled directly.
