# Mechanics

The Collateral Debt Position (CDP) module let a user deposit a supported asset as collateral and mint **lisUSD**, an over-collateralized stablecoin, against it. The engine is a MakerDAO/Helio-style fork on BNB Chain: `Vat`, `Jug`, `Spotter`, `Dog`, `Clipper`, `Abacus` and `Vow` behind the **Interaction** entrypoint.

> **This product is being wound down, and most of its surface is already closed.** Verify each of the following live before building anything against it:
>
> * **New borrowing is disabled protocol-wide.** The global debt ceiling `Vat.Line()` is `0`, so any operation that increases debt reverts `Vat/ceiling-exceeded` no matter what the per-collateral `line` says.
> * **Deposits are whitelisted.** `Interaction.whitelistMode()` is `1`, and the gate applies to the **participant**, not the caller — an integrator cannot deposit on behalf of a non-whitelisted user. Non-whitelisted deposits revert `Interaction/not-in-whitelist`.
> * **The auction surface is permissioned.** `Interaction.auctionWhitelistMode()` is `1`, and this fork adds `auth` to `Clipper.take` / `redo`. Unlike upstream MakerDAO there is no open keeper or buyer role: starting, buying from and resetting auctions are all restricted to `Interaction.auctionWhitelist`, in practice the Lista liquidator.
>
> What still works is repaying, withdrawing collateral, and liquidation of the positions that remain. This page documents the engine for auditors and for integrators unwinding existing positions. **New integrations should target [Lista Lending](../lista-lending/README.md) instead.**

> **Naming.** `lisUSD` is the canonical stablecoin name. In the engine source you will also see the legacy alias **Hay** (`hay.sol`, `HayJoin`); they are the same token. The live mainnet token is `LisUSD` (`"Lista USD"`).

## Component map

| Contract | Role |
| --- | --- |
| `Interaction` | User entrypoint; orchestrates deposit / borrow / payback / withdraw and the auction surface. |
| `Vat` | Core accounting: per-collateral `ilks`, per-user `urns` (`ink` = collateral, `art` = normalized debt), and the debt rate accumulator. |
| `Jug` | Stability-fee accrual. `drip` folds the per-collateral `duty` into the Vat `rate` accumulator, compounding `base + duty`. |
| `Spotter` (SPOT) | Applies the liquidation ratio (`mat`) to the oracle price to produce the safe `spot` price. |
| `GemJoin` | Per-collateral adapter that escrows the ERC-20 and credits it into the Vat. |
| `HayJoin` | lisUSD adapter: `exit` mints on borrow, `join` burns on repay. |
| `Dog` | Liquidation trigger (`bark`). Bounded by `Hole` / `ilk.hole`, so it liquidates **partially** — it reverts `Dog/liquidation-limit-hit` or `Dog/dusty-auction-from-partial-liquidation` rather than always taking the whole position. |
| `Clipper` (CLIP) | Per-collateral Dutch auction (`kick` / `take` / `redo`), all permissioned in this fork. |
| `Abacus` (ABACI) | Auction price-decay curve. Four are implemented; every live Clipper uses a `LinearDecrease`, so `tau` is the operative parameter and `cut` / `step` are unused. |
| `Vow` | Surplus/debt accounting; receiver of auction proceeds. |
| `DynamicDutyCalculator` (AMO) | Computes the per-collateral borrow rate from the lisUSD price. |

## Reading a position

| Call | Returns |
| --- | --- |
| `Interaction.locked(token, usr)` | Collateral deposited (`ink`). |
| `Interaction.borrowed(token, usr)` | Current lisUSD debt (`art * rate / RAY`). When the debt is non-zero the helper adds a flat 100-wei buffer so `repay` can fully clear the position. |
| `Interaction.collateralRate(token)` | `1e18 / mat` — the maximum loan-to-value for the collateral. |
| `Interaction.borrowApr(token)` | Borrow rate **scaled by 1e18** — `4035532478367910700` is 4.0355%, not 403%. Despite the name it is `base + duty` compounded over a year, i.e. an APY. |

A position is safe while `ink * spot >= art * rate`. `spot` already has the liquidation ratio applied, so it is below the raw oracle price.

## Interest

Interest accrues continuously into the Vat's per-collateral rate accumulator and is realized in lisUSD when debt is repaid — **nothing is charged at borrow time**. The rate is dynamic: on every borrow, repay or deposit, `Interaction.drip(token)` asks `DynamicDutyCalculator` for an up-to-date `duty` and updates the Jug before the Vat operation.

The calculator derives `duty` from the lisUSD oracle price using a per-collateral baseline `rate0` and a sensitivity `beta`: below peg the rate rises to incentivize repayment, above peg it falls. Two behaviours worth knowing: when `ilks[collateral].enabled` is `false` the existing duty is returned unchanged, and the rate does not move at all while the price stays within a `delta` band of the last recorded price.

Read the inputs live — `rate0` and `beta` from `DynamicDutyCalculator.ilks(collateral)` (that struct is `{ enabled, lastPrice, rate0, beta }`), the bounds from the top-level `minDuty()` / `maxDuty()` / `minPrice()` / `maxPrice()` views, and `Jug.base()`. Note the AMO clamp bounds `duty`, not the borrow rate: since the Vat compounds `base + duty`, a non-zero `base` puts the effective floor above zero. The clamp also exists only on this path — neither `Jug.file(ilk, "duty")` nor `Interaction.setCollateralDuty` enforces a maximum.

## Liquidation

When `ink * spot < art * rate`, `Dog.bark` marks the position and kicks a Dutch auction on the collateral's `Clipper`. The auction opens above the oracle price and decays along the Abacus curve until someone takes it; proceeds repay the debt plus a liquidation penalty (`Dog.chop`), and any surplus collateral returns to the borrower.

The live risk parameters — the penalty (`Dog.chop`), the starting-price multiplier (`buf`), the reset window (`tail`), the reset threshold (`cusp`), and the keeper incentives (`tip`, `chip`) — are governance-adjustable on-chain values and are not published here. Read them from the relevant `Clipper` and `Dog`.

Two implementation details that catch integrators:

* **Auction state.** `Clipper.status` is `internal`; use `getStatus(id)` or `Interaction.getAuctionStatus`.
* **The reset clock is `tic`, not the auction start.** `tic` is reset on every `redo`, so a long-running auction's reset window is measured from its last reset.

Because `take` and `redo` are permissioned in this fork, none of this is an open keeper opportunity. For a liquidation surface that *is* open to third parties, see [Liquidator Integration](../lista-lending/liquidator-integration.md) on Lista Lending.

## Earn / staking note

lisUSD holders could historically stake into the **Jar** (`jar.sol`). The Jar still exists in the repository but is largely deprecated; the live lisUSD staking / saving-rate product is the **LisUSDPoolSet** / **EarnPool** stack. New integrations should target that layer. See [Stable Pool (PSM)](../../introduction/collateral-debt-position-lisusd/lisusd/stable-pool-price-stability-module-psm.md) and [lisUSD Saving Rate (LSR)](../../introduction/collateral-debt-position-lisusd/lisusd/lisusd-saving-rate-lsr.md).

## See also

- [Flash Loan](flash-loan.md) — ERC-3156 flash minting of lisUSD.
- [Smart Contract](smart-contract.md) — deployed CDP contract addresses.
- [Algorithmic Market Operations (AMO)](../../introduction/collateral-debt-position-lisusd/lisusd/algorithmic-market-operations-amo/README.md) — the public borrow-rate formula and parameters.
