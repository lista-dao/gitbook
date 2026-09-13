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
> What still works: repaying, withdrawing collateral, and liquidation of the positions that remain.

## Unwinding an existing position

| Call | Purpose |
| --- | --- |
| `Interaction.locked(token, usr)` | Collateral deposited (`ink`). |
| `Interaction.borrowed(token, usr)` | Current lisUSD debt (`art * rate / RAY`). When the debt is non-zero this adds a flat 100-wei buffer so a repay can fully clear the position — repay the value it returns, not your own computation. |
| `Interaction.payback(token, amount)` | Repay lisUSD. Burns via `HayJoin` and reduces `art`. |
| `Interaction.withdraw(participant, token, dink)` | Withdraw collateral, subject to the position staying safe. Note the **three** parameters with `participant` first — there is no two-argument form. When the collateral has no provider, `msg.sender` must equal `participant`; when it does have one (slisBNB, for example), the withdrawal has to be driven through that provider so the certificate token is unwrapped. |

A position is safe while `ink * spot >= art * rate`. `spot` already has the liquidation ratio applied, so it sits below the raw oracle price.

Interest accrues into the Vat's per-collateral rate accumulator and is realized in lisUSD on repayment — nothing is charged at borrow time. The rate is set by the `DynamicDutyCalculator` AMO from the lisUSD price. The **Jug** compounds `base + duty` and the Vat only folds the resulting delta into its accumulator, so read both `Jug.base()` and the calculator's own views rather than treating any single value as the rate. `Interaction.borrowApr(token)` returns the combined figure with **20 decimals** — i.e. a *percentage* scaled by `1e18`, so `4035532478367910700` is 4.0355%; divide by `1e20` for a fraction. Despite the name it raises the per-second rate to one year of seconds, so it is a compounded annual figure (an APY).

For a liquidation surface that **is** open to third parties, see [Liquidator Integration](../lista-lending/liquidator-integration.md) on Lista Lending. The engine's internals (`Vat`, `Jug`, `Spotter`, `Dog`, `Clipper`, `Abacus`, `Vow`) behave as in the MakerDAO design they were forked from — use the MakerDAO docs for them, and [Smart Contract](smart-contract.md) for the deployed addresses.

## How the module works

These flows are unchanged from the original design and are what the remaining
positions still run on. Each step names the contract that performs it.

### Deposit collateral

<figure><img src="../../.gitbook/assets/image (41).png" alt=""><figcaption></figcaption></figure>

1. The user transfers collateral to the **Interaction** contract.
2. **Interaction** moves it into **GemJoin**, which custodies it.
3. **Vat** — the core CDP engine — records the collateral against the user.

### Borrow lisUSD

<figure><img src="../../.gitbook/assets/image (40).png" alt=""><figcaption></figcaption></figure>

1. The user calls `borrow()` on **Interaction**.
2. **Vat** records the debt increase against that collateral.
3. **HayJoin** mints the lisUSD and sends it to the user.
4. **Interaction** snapshots the position on **ListaDistributor** for reward accounting.

Interest is not charged here — it accrues in the Vat and is realized on repayment.

### Repay lisUSD

<figure><img src="../../.gitbook/assets/image (39).png" alt=""><figcaption></figcaption></figure>

1. The user specifies the amount to repay against a collateral.
2. **Vat** reduces the recorded debt; repaying in full closes the position.
3. **HayJoin** burns the lisUSD.
4. **Interaction** snapshots the new balance on **ListaDistributor**.

### Withdraw collateral

<figure><img src="../../.gitbook/assets/image (35).png" alt=""><figcaption></figcaption></figure>

1. The user specifies the amount to withdraw.
2. **Interaction** checks the position stays safe — with debt outstanding, only part of the deposit is withdrawable.
3. **GemJoin** transfers the collateral back.
4. **Vat** records that the collateral left the system.

### Liquidation

<figure><img src="../../.gitbook/assets/image (5) (1) (1).png" alt=""><figcaption></figcaption></figure>

> **The buy side of the auction is permissioned in this fork.** `Clipper.take` and
> `Clipper.redo` carry `auth`, and `Interaction.buyFromAuction` is whitelisted, so
> unlike upstream MakerDAO a third party cannot start, bid in, or restart an
> auction. The worked example below explains the mechanism; it is not an
> integration path. For a liquidation surface that *is* open to third parties,
> see [Liquidator Integration](../lista-lending/liquidator-integration.md).

A position becomes liquidatable once the collateral value, after the collateral
ratio is applied, falls below the debt:

* Collateral price $2, collateral ratio 66% → effective unit price `2 × 0.66 = $1.32`
* Deposit 10 units (`$20`), borrow limit `20 × 0.66 = $13.2`, borrow `13.2 lisUSD`
* Price falls to `$1.80` → effective unit price `1.8 × 0.66 = $1.188`, position worth `1.188 × 10 = $11.88`
* `13.2 − 11.88 = $1.32` — the shortfall makes it liquidatable

The auction is then prepared from those numbers:

* All 10 units of collateral go to the Dutch auction
* Liquidation penalty (governance-set): 13% of the debt → cover `13.2 × 1.13 = $14.916`
* Buffer (governance-set): 2% → starting price `1.8 × 1.02 = $1.836`

<figure><img src="../../.gitbook/assets/image (7) (1) (1).png" alt=""><figcaption></figcaption></figure>

The price then decreases over time — at 600 seconds into a 3600-second window,
`1.836 × ((3600 − 600) / 3600) = $1.53`. The auction pauses when either
governance-set bound is hit: **tail** (elapsed time) or **cusp** (share of the
starting price remaining). A paused auction has to be restarted, which pays the
restarter a flat **tip** plus a dynamic **chip**. Read the live values from the
`Clipper` for the collateral rather than assuming them.

## lisUSD staking

The **Jar** (`jar.sol`) is deprecated. The live lisUSD saving-rate product is the **LisUSDPoolSet** / **EarnPool** stack — see [Stable Pool (PSM)](../../introduction/collateral-debt-position-lisusd/lisusd/stable-pool-price-stability-module-psm.md) and [lisUSD Saving Rate (LSR)](../../introduction/collateral-debt-position-lisusd/lisusd/lisusd-saving-rate-lsr.md). That layer is separate from the CDP borrowing engine above and is not being wound down with it.

## See also

- [Flash Loan](flash-loan.md) — ERC-3156 flash minting of lisUSD.
