# Mechanics

The Collateral Debt Position (CDP) module lets a user deposit a supported asset as collateral and mint **lisUSD**, an over-collateralized stablecoin, against it. The engine is a MakerDAO/Helio-style fork deployed on BNB Chain: a small set of specialized contracts (VAT, JUG, SPOT, DOG, CLIP, ABACI, VOW) sit behind a single user-facing entrypoint, the **Interaction** contract.

> **Naming.** `lisUSD` is the canonical stablecoin name. Throughout the engine source you will also see the legacy alias **Hay** (`hay.sol`, name `"Hay Destablecoin"`) and the `HayJoin` adapter. `Hay` and `lisUSD` refer to the same token; the live mainnet token is `LisUSD` (name `"Lista USD"`). This page uses `lisUSD`.

This page describes the on-chain mechanics and ties each user action to the real `Interaction` function and the `IDao` event it emits, so integrators and auditors can index and reproduce each step.

## Component map

| Contract | Role |
| --- | --- |
| `Interaction` | User entrypoint; orchestrates deposit / borrow / payback / withdraw and the auction surface. |
| `Vat` | Core accounting engine: per-collateral `ilks` and per-user `urns` (`ink` = collateral, `art` = normalized debt), plus the debt rate accumulator. |
| `Jug` | Stability-fee accrual. `drip` folds the per-collateral `duty` into the Vat `rate` accumulator. |
| `Spotter` (SPOT) | Pulls the collateral price from the oracle and applies the liquidation ratio (`mat`) to produce the safe `spot` price. |
| `GemJoin` | Per-collateral adapter that escrows the ERC-20 collateral and credits it into the Vat. |
| `HayJoin` | lisUSD adapter: `exit` mints lisUSD to the user on borrow; `join` burns it on repay. |
| `Dog` | Liquidation trigger (`bark`): marks an unsafe position and kicks a Dutch auction. |
| `Clipper` (CLIP) | Per-collateral Dutch auction (`kick` / `take` / `redo`). |
| `Abacus` (ABACI) | Auction price-decay curve (`LinearDecrease` / `StairstepExponentialDecrease` / `ExponentialDecrease`). |
| `Vow` | Surplus/debt accounting; receiver of auction proceeds. |
| `DynamicDutyCalculator` (AMO) | Computes the per-collateral borrow rate dynamically from the lisUSD price (see [Borrow rate](#borrow-rate)). |

## Fees

1. **Borrowing interest (stability fee).** Interest accrues continuously into the Vat debt-rate accumulator and is realized in lisUSD when debt is repaid. **No interest is charged at borrow time.** The rate is **dynamic**, computed per collateral by the AMO `DynamicDutyCalculator` from the lisUSD price — it is not a fixed governance number. See [Borrow rate](#borrow-rate).
2. **Liquidation penalty.** When a position is liquidated, the lisUSD target the auction must raise is the outstanding debt plus a liquidation penalty (`Dog.chop`). The penalty is a governance/manager-adjustable on-chain parameter; its live value is not published here.

## Collateral ratio

Each collateral has a liquidation ratio (`mat`, set per `ilk` on the Spotter). The Spotter combines the oracle price with `mat` to compute the `spot` price used by the Vat to decide whether a position is safe. A position is **safe** while

```
ink * spot  >=  art * rate
```

i.e. collateral value (at the safe price) is at least the current debt. When this no longer holds the position becomes liquidatable. The contract exposes read-only helpers an integrator can call directly:

| Function | Returns |
| --- | --- |
| `collateralPrice(token)` | Current oracle price of the collateral. |
| `collateralRate(token)` | `10**45 / mat` — the collateral ratio (18 decimals). |
| `locked(token, usr)` | User collateral (`ink`). |
| `free(token, usr)` | Unlocked (un-pledged) collateral. |
| `borrowed(token, usr)` | Current lisUSD debt (`art * rate / RAY`); when the debt is non-zero the helper adds a flat 100-wei buffer so `repay` can fully clear the position. |
| `availableToBorrow(token, usr)` | Additional lisUSD borrowable against current collateral. |
| `willBorrow(token, usr, amount)` | Borrowable lisUSD if `amount` more collateral were added (or removed, if negative). |
| `currentLiquidationPrice(token, usr)` | Collateral price at which the position becomes liquidatable. |
| `borrowApr(token)` | Current annualized borrow rate for the collateral. |

## Borrow rate (AMO)

The borrow rate is **not** a fixed governance constant. It is the per-collateral stability fee (`duty`) computed on-chain by the `DynamicDutyCalculator` (Algorithmic Market Operations / AMO) to defend the lisUSD peg, modeled on Curve's crvUSD monetary policy. The mechanism and formula are already public in the protocol's [AMO documentation](../../introduction/collateral-debt-position-lisusd/lisusd/algorithmic-market-operations-amo/README.md).

The rate is derived from the lisUSD oracle price:

```
deviation = PEG - price(lisUSD)         // PEG = $1 (1e8)
r         = r0 * exp(deviation / beta)
duty      = r + 1e27                     // per-second rate in the Vat
```

where `r0` is the per-collateral baseline rate (when lisUSD trades at peg) and `beta` controls how sharply the rate responds to depeg. When lisUSD trades below $1 the rate rises (incentivizing repayment, contracting supply); above $1 it falls. **The rate is bounded on-chain by `maxDuty` and `minDuty`**: the contract clamps `duty` to that range, applying `maxDuty` when the price is at/below `minPrice` and `minDuty` when it is at/above `maxPrice`. The default `maxDuty` is ≈200% APY (`1000000034836767751273470154`) and `minDuty` is 0% APY (`1e27`); both are governance/manager-adjustable, so treat them as current on-chain values rather than a fixed cap.

The per-collateral `r0`, `beta`, and the price/duty bounds are governance/manager-adjustable on-chain values — read them from `DynamicDutyCalculator.ilks(collateral)` and the lisUSD oracle rather than treating them as fixed promises. On every borrow, repay, or deposit, `Interaction.drip(token)` asks the calculator for the up-to-date `duty` and updates the Jug before the Vat operation, so the live rate is always re-applied.

## CDP lifecycle

Each step below names the `Interaction` function called and the `IDao` event emitted, for indexing.

### a. Deposit collateral

<figure><img src="../../.gitbook/assets/image (41).png" alt=""><figcaption></figcaption></figure>

**`deposit(address participant, address token, uint256 dink)`**

1. `Interaction` drips the stability fee (`drip`), then pulls `dink` of collateral from the caller.
2. The collateral is escrowed via the collateral's `GemJoin` adapter (`gem.join`).
3. `Interaction` calls `vat.frob` to record the collateral (`ink`) against the user's position in the Vat.
4. A debt snapshot is taken for reward accounting.

Collaterals that have a registered provider must be deposited **through** that provider unless `providerCompatibilityMode` is enabled for the token. Emits `Deposit(user, collateral, amount, totalAmount)`.

### b. Borrow lisUSD

<figure><img src="../../.gitbook/assets/image (40).png" alt=""><figcaption></figcaption></figure>

**`borrow(address token, uint256 hayAmount)`**

1. `Interaction` first calls `drip(token)` (refresh the dynamic rate and accrue interest into the Vat) and `poke(token)` (refresh the collateral price).
2. It converts the requested lisUSD amount into a normalized debt delta `dart = hayAmount * RAY / rate` (rounded up) and calls `vat.frob` to record the new debt against the position. **No interest is charged at this point** — `frob` only increases `art`; the stability fee accrues over time through the Vat `rate` accumulator and is paid in lisUSD when the debt is repaid.
3. `Interaction` moves the freshly minted internal balance (`vat.move`) and calls `hayJoin.exit` to mint `hayAmount` of lisUSD to the borrower.
4. A debt snapshot is taken for reward accounting.

The borrow reverts if it would leave the position unsafe (enforced inside `vat.frob`). Emits `Borrow(user, collateral, collateralAmount, amount, liquidationPrice)`.

### c. Payback (repay) lisUSD

<figure><img src="../../.gitbook/assets/image (39).png" alt=""><figcaption></figcaption></figure>

**`payback(address token, uint256 hayAmount)`** — repay your own debt.
**`paybackFor(address token, uint256 hayAmount, address borrower)`** — repay another address's debt.

1. `Interaction` calls `drip` and `poke`, so the repayment settles the debt **including all accrued interest** at the current `rate`.
2. lisUSD is pulled from the caller and burned via `hayJoin.join`. If the amount covers the full debt the position is closed (`art` set to 0); otherwise the debt is reduced proportionally (`dart = realAmount * RAY / rate`).
3. `vat.frob` reduces the position's `art` by `dart`.
4. A debt snapshot is taken for reward accounting.

Emits `Payback(borrower, collateral, amount, debt, liquidationPrice)`.

### d. Withdraw collateral

<figure><img src="../../.gitbook/assets/image (35).png" alt=""><figcaption></figcaption></figure>

**`withdraw(address participant, address token, uint256 dink)`**

1. `Interaction` calls `drip` and `poke`.
2. If the position has outstanding debt, only collateral above the amount required to keep the position safe can be withdrawn; the Vat enforces this and reverts otherwise.
3. Collateral is moved out via `vat.flux` and returned to the user via the `GemJoin` adapter (`gem.exit`).
4. A debt snapshot is taken for reward accounting.

As with deposits, tokens with a registered provider are withdrawn through that provider (unless `providerCompatibilityMode` is on). Emits `Withdraw(participant, amount)`.

## Liquidation & Dutch auctions

When a position falls below its liquidation ratio (`ink * spot < art * rate`), its collateral is sold for lisUSD through a **Dutch auction**: the price starts above the oracle price and decreases over time until a buyer takes it. The `Interaction` contract exposes the auction surface; the work is done by `Dog`, `Clipper`, and an `Abacus` price curve.

> The example numbers below are **illustrative only** to show the shape of the math. The live liquidation parameters — penalty (`Dog.chop`), starting-price multiplier (`buf`), reset window (`tail`), reset price-drop threshold (`cusp`), and keeper incentives (`tip`, `chip`) — are governance/manager-adjustable on-chain values and are **not** published here.

### g.1 Starting an auction

<figure><img src="../../.gitbook/assets/image (5) (1) (1).png" alt=""><figcaption></figcaption></figure>

**`startAuction(address token, address user, address keeper)`** → `Dog.bark` → `Clipper.kick`.

`Dog.bark` checks the position is unsafe, grabs the collateral and debt out of the position into the auction, adds the liquidation penalty (`chop`) to compute the lisUSD target (`tab`) the auction must raise, and kicks a `Clipper` auction. The Clipper sets the starting price:

```
top = collateralFeedPrice * buf
```

where `buf >= 1` lifts the start price above the current oracle price. A keeper that triggers the auction can receive an incentive (a flat `tip` plus a `chip` proportion of `tab`).

*Illustrative shape:* with collateral at \$1.80 and a starting-price multiplier `buf`, the auction would open at `1.80 * buf`; the lisUSD to raise would be the outstanding debt scaled up by `(1 + penalty)`.

Emits `AuctionStarted(token, user, amount, price)` and the Dog's `Bark` event.

### g.2 Buying from an auction

<figure><img src="../../.gitbook/assets/image (7) (1) (1).png" alt=""><figcaption></figcaption></figure>

**`buyFromAuction(address token, uint256 auctionId, uint256 collateralAmount, uint256 maxPrice, address receiverAddress, bytes data)`** → `Clipper.take`.

The price decreases from `top` according to the auction's configured **Abacus** curve. Three curves are implemented in `abaci.sol`; a given Clipper is wired to one of them via its `calc` setting:

| Curve | Price as a function of elapsed time `dur` |
| --- | --- |
| `LinearDecrease` | `price = top * (tau - dur) / tau` (reaches 0 at `tau`). |
| `StairstepExponentialDecrease` | `price = top * cut^(dur / step)` — drops by a fixed factor `cut` every `step` seconds. |
| `ExponentialDecrease` | `price = top * cut^dur` — continuous per-second exponential decay. |

(There is also `AlwaysOneDollarCalc`, a fixed \$1 curve used only for specific USD-denominated LP collateral.)

A buyer calls `take` with an upper bound on collateral and a `maxPrice` slippage guard; the auction never collects more lisUSD than its `tab`, and partial buys must leave a non-dusty remainder (`Clipper.chost`). Emits `Liquidation(urn, token, collateralAmount, leftover)` and the Clipper's `Take` event.

### g.3 Resetting an auction

**`resetAuction(address token, uint256 auctionId, address keeper)`** → `Clipper.redo`.

An auction can be reset (its price re-initialized from the current feed) once it has run too long or its price has fallen too far. `Clipper.status` flags a reset when either condition holds:

```
needsRedo  =  (now - startTime) > tail        // ran longer than the reset window
           ||  price / top      < cusp          // price dropped past the reset threshold
```

The keeper that resets it may receive the same `tip` + `chip` incentive (subject to the auction still being economically meaningful). The concrete `tail` and `cusp` values are on-chain risk parameters and are not published here.

## Earn / staking note

Historically, lisUSD holders could stake into the **Jar** (`jar.sol`) to earn rewards. The Jar contract still exists in the repository but is **largely deprecated**: the live lisUSD staking / saving-rate product is now the **LisUSDPoolSet** / **EarnPool** stack (the Stable Pool / lisUSD Saving Rate layer). New integrations should target that layer rather than the Jar. See the [Stable Pool (PSM)](../../introduction/collateral-debt-position-lisusd/lisusd/stable-pool-price-stability-module-psm.md) and [lisUSD Saving Rate (LSR)](../../introduction/collateral-debt-position-lisusd/lisusd/lisusd-saving-rate-lsr.md) docs.

## See also

- [Flash Loan](flash-loan.md) — ERC-3156 flash minting of lisUSD.
- [Smart Contract](smart-contract.md) — deployed CDP contract addresses.
- [Algorithmic Market Operations (AMO)](../../introduction/collateral-debt-position-lisusd/lisusd/algorithmic-market-operations-amo/README.md) — the public borrow-rate formula and parameters.
