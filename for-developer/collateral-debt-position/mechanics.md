# Mechanics

The Collateral Debt Position (CDP) module lets a user deposit collateral and mint **lisUSD** against it. It is a MakerDAO/Helio-style fork: `Vat`, `Jug`, `Spotter`, `Dog`, `Clipper`, `Abacus` and `Vow` behind the **Interaction** entrypoint.

> ## This product is being wound down
>
> **Do not build new integrations against it.** Use [Lista Lending](../lista-lending/README.md) instead — it is the actively developed lending product and has a full [integration guide](../lista-lending/integration-patterns.md), [contract reference](../lista-lending/contract-reference.md) and [SDK](../sdk.md).
>
> Most of the CDP's user-facing surface is already closed. Verify each of these live before assuming otherwise:
>
> | Check | Current value | Effect |
> | --- | --- | --- |
> | `Vat.Line()` | `0` | **All new borrowing reverts** `Vat/ceiling-exceeded`, protocol-wide, regardless of the per-collateral `line`. |
> | `Interaction.whitelistMode()` | `1` | Deposits are whitelisted. The gate is on the **participant**, not the caller, so an integrator cannot deposit for a non-whitelisted user. |
> | `Interaction.auctionWhitelistMode()` | `1` | Starting, buying from and resetting auctions are restricted to `Interaction.auctionWhitelist`. This fork adds `auth` to `Clipper.take`/`redo`, so unlike upstream MakerDAO there is **no open keeper or buyer role**. |
>
> What still works: repaying, withdrawing collateral, and liquidation of the positions that remain. The rest of this page covers what an existing holder or an auditor needs, and nothing more.

## Unwinding an existing position

| Call | Purpose |
| --- | --- |
| `Interaction.locked(token, usr)` | Collateral deposited (`ink`). |
| `Interaction.borrowed(token, usr)` | Current lisUSD debt (`art * rate / RAY`). When the debt is non-zero this adds a flat 100-wei buffer so a repay can fully clear the position — repay the value it returns, not your own computation. |
| `Interaction.payback(token, amount)` | Repay lisUSD. Burns via `HayJoin` and reduces `art`. |
| `Interaction.withdraw(participant, token, dink)` | Withdraw collateral, subject to the position staying safe. Note the **three** parameters with `participant` first — there is no two-argument form. When the collateral has no provider, `msg.sender` must equal `participant`; when it does have one (slisBNB, for example), the withdrawal has to be driven through that provider so the certificate token is unwrapped. |

A position is safe while `ink * spot >= art * rate`. `spot` already has the liquidation ratio applied, so it sits below the raw oracle price.

Interest accrues into the Vat's per-collateral rate accumulator and is realized in lisUSD on repayment — nothing is charged at borrow time. The rate is set by the `DynamicDutyCalculator` AMO from the lisUSD price. The **Jug** compounds `base + duty` and the Vat only folds the resulting delta into its accumulator, so read both `Jug.base()` and the calculator's own views rather than treating any single value as the rate. `Interaction.borrowApr(token)` returns the combined figure with **20 decimals** — i.e. a *percentage* scaled by `1e18`, so `4035532478367910700` is 4.0355%; divide by `1e20` for a fraction. Despite the name it raises the per-second rate to one year of seconds, so it is a compounded annual figure (an APY).

For a liquidation surface that **is** open to third parties, see [Liquidator Integration](../lista-lending/liquidator-integration.md) on Lista Lending. The engine's internals (`Vat`, `Jug`, `Spotter`, `Dog`, `Clipper`, `Abacus`, `Vow`) are unchanged from the MakerDAO/Helio design and are not restated here; deployed addresses are on [Smart Contract](smart-contract.md).

## lisUSD staking

The **Jar** (`jar.sol`) is deprecated. The live lisUSD saving-rate product is the **LisUSDPoolSet** / **EarnPool** stack — see [Stable Pool (PSM)](../../introduction/collateral-debt-position-lisusd/lisusd/stable-pool-price-stability-module-psm.md) and [lisUSD Saving Rate (LSR)](../../introduction/collateral-debt-position-lisusd/lisusd/lisusd-saving-rate-lsr.md). That layer is separate from the CDP borrowing engine above and is not being wound down with it.

## See also

- [Flash Loan](flash-loan.md) — ERC-3156 flash minting of lisUSD.
- [Smart Contract](smart-contract.md) — deployed CDP contract addresses.
