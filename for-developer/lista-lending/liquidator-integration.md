# Liquidator Integration

This page is the end-to-end reference for running a **third-party liquidator** against Lista Lending (Moolah): which contract to call, how eligibility is gated, how to size a liquidation, and how the collateral comes back to you.

Liquidation on Moolah is permissionless *at the contract level* but **gated per market**. Rather than calling `Moolah.liquidate` directly, external liquidators go through **`PublicLiquidator`**, which is the contract that Lista's own [Liquidation Zone](https://lista.org/lending/liquidation) front end uses. That page is a working reference implementation of everything described here.

For the product-level explanation of liquidation see [Liquidation](../../introduction/lista-lending/liquidation/README.md); for the data feeds that tell you *what* to liquidate see [Positions, Liquidation & Emission API](../services/lending-api/position-liquidation-emission.md). For the low-level core function see [Contract & Interface Reference § Liquidation](contract-reference.md).


---

## The three liquidator contracts

Moolah deploys three liquidator contracts. Only one of them is for you.

| Contract | Caller | Funding | Use |
| --- | --- | --- | --- |
| **`PublicLiquidator`** | **Anyone** — no role gate | **Your own capital**; you approve the loan token and receive the seized collateral | **Third-party liquidators. This is the contract to integrate against.** |
| `Liquidator` | `BOT` role only | Protocol-held funds | Lista's internal keeper. Not callable by external parties. |
| `BrokerLiquidator` | `BOT` role only | Protocol-held funds | Fixed-term / broker markets, where health accounting sits at the broker. Not callable by external parties. |

Deployed addresses: [BSC Core](smart-contract-bsc-core.md) for `Liquidator` and `PublicLiquidator`, [BSC Lending Brokers](smart-contract-bsc-brokers.md) for `BrokerLiquidator`, and [Ethereum](smart-contract-ethereum.md) for all three.

---

## Eligibility: which positions you can actually liquidate

Every `PublicLiquidator` liquidation path runs the same internal eligibility check. On the flash paths it runs *after* the pair / smart-provider whitelist checks, and all of them revert with the same `NotWhitelisted()` selector, so the selector alone will not tell you which one failed:

```solidity
function isLiquidatable(bytes32 id, address borrower) internal view returns (bool) {
  return
    IMoolah(MOOLAH).isLiquidationWhitelist(id, address(0)) ||  // 1. market is open to anyone
    marketWhitelist[id] ||                                      // 2. market opened on PublicLiquidator
    marketUserWhitelist[id][borrower];                          // 3. this position opened on PublicLiquidator
}
```

A position is reachable if **any** of three conditions holds:

1. **The market is open at the Moolah level.** `Moolah._checkLiquidationWhiteList` returns `liquidationWhitelist[id].length() == 0 || contains(account)`, so an *empty* per-market whitelist means the market is open to every caller. `isLiquidationWhitelist(id, address(0))` is the cheap probe `PublicLiquidator` itself uses, but it does **not** prove the market is open: it also returns `true` for a gated market that happens to have `address(0)` in its whitelist, and `batchToggleLiquidationWhitelist` has no zero-address guard to rule that out. In that case `PublicLiquidator` passes its own gate and Moolah then rejects the call, because the caller Moolah checks is `PublicLiquidator`, not `address(0)`.

Two separate questions, so read them separately:

* **Is the market open to anyone?** `getLiquidationWhitelist(id).length == 0`. That is the only definitive test.
* **Can `PublicLiquidator` reach this market?** `isLiquidationWhitelist(id, <PublicLiquidator address>)`.

Query both rather than assuming — an open market is the common case, not a universal one.

2. **The market has been opened on `PublicLiquidator`** by the `BOT` role (`marketWhitelist[id]`). This is how a market that *is* gated at the Moolah level can still be routed through the public path.
3. **This specific borrower has been opened** by the `BOT` role (`marketUserWhitelist[id][borrower]`).

> **This is the part integrators get wrong.** On a market that is gated at the Moolah level, you cannot liquidate an arbitrary under-water position — the position has to have been surfaced through condition 2 or 3 first. The gating is *not* a health check: a position failing `isLiquidatable` reverts with `NotWhitelisted()` even when it is deeply under water. Pick the feed that matches the gate. `/api/liquidation/zone/list` returns the borrower **whitelist**, so it finds candidates on *gated* markets and will be empty or near-empty for the open markets that are the common case. For open markets use [`/api/moolah/redPositions`](../services/lending-api/position-liquidation-emission.md), which takes a single market `id` — enumerate markets from `/api/moolah/allMarkets` and fan out. A bot polling only `/zone/list` will conclude there is no business when there is.

Both `setMarketWhitelist` and `setMarketUserWhitelist` refuse to run on a market that is already open at the Moolah level, and `setMarketUserWhitelist` additionally refuses when the market has already been opened on `PublicLiquidator` itself. These are **preconditions checked at set time only** — Moolah-level state can change afterwards (a `MANAGER` can empty `liquidationWhitelist[id]` later), so do not assume the two mechanisms stay mutually exclusive.

After a successful liquidation, `postLiquidate` removes the borrower from `marketUserWhitelist` if the position has become healthy again. A partial liquidation that leaves the position under water keeps it open — but see the sizing constraint below: not every partial size is permitted.

---

## Entry points

Five liquidation entry points. Pick by (a) whether you bring your own loan-token capital or flash-swap the collateral, and (b) whether the collateral is a plain ERC-20 or a **smart collateral** LP token.

### Self-funded

```solidity
function liquidate(bytes32 id, address borrower, uint256 seizedAssets, uint256 repaidShares) external;
```

The main path. Pulls the required loan token from you, calls `Moolah.liquidate`, and transfers the seized collateral to you. Thin wrapper over `liquidateWithCollTransferOpt(..., doTransferColl: true)`.

```solidity
function liquidateWithCollTransferOpt(
  bytes32 id, address borrower, uint256 seizedAssets, uint256 repaidShares, bool doTransferColl
) public;
```

Same, but `doTransferColl: false` leaves the seized collateral inside `PublicLiquidator`, credited to you in `lpCollaterals[msg.sender][collateralToken]`, to be unwound later with `redeemSmartCollateral`. **Only pass `false` for smart-collateral LP tokens** — for a plain ERC-20 collateral there is no redeem path and the tokens are stranded in the contract.

```solidity
function liquidateSmartCollateral(
  bytes32 id, address borrower, address smartProvider,
  uint256 seizedAssets, uint256 repaidShares, bytes memory payload
) external returns (uint256, uint256);
```

Returns `(actualSeizedAssets, repaidAssets)`, both straight from `Moolah.liquidate`. Self-funded liquidation of a smart-collateral market that redeems the LP in the same transaction. `smartProvider` must be registered in `smartProviders` and its `TOKEN()` must equal the market's collateral token. `payload` is `abi.encode(minToken0Amt, minToken1Amt)` — your slippage bound on the LP redeem. **On `flashLiquidateSmartCollateral` these values do double duty:** for a leg whose token is native BNB, the contract forwards the min amount as the swap call's exact `msg.value`. Setting a conservative floor there underfunds the swap rather than protecting you, so for a native-BNB leg the value must be the amount you intend to send. Both underlying tokens are sent to you directly (native BNB is transferred as value, not wrapped).

### Flash-swap (no loan-token capital required)

```solidity
function flashLiquidate(
  bytes32 id, address borrower, uint256 seizedAssets, address pair, bytes calldata swapCollateralData
) external;
```

Uses Moolah's `onMoolahLiquidate` callback to swap the seized collateral into the loan token *before* the repayment is pulled, so you need no loan-token balance — only enough gas. `swapCollateralData` is raw calldata low-level-called against `pair`; obtain it from an aggregator (1inch, etc.) **with slippage already applied**. Your profit is the loan-token surplus, transferred to you at the end.

> **The swap must pay out to `PublicLiquidator`, not to you.** The callback measures the contract's own loan-token balance before and after the swap and approves Moolah out of that balance. Aggregator calldata built with your own address as the recipient will leave the contract unable to repay and the transaction reverts. Set the recipient to the `PublicLiquidator` address on **every** leg — both token legs, for the smart-collateral variant.

```solidity
function flashLiquidateSmartCollateral(
  bytes32 id, address borrower, address smartProvider, uint256 seizedAssets,
  address token0Pair, address token1Pair,
  bytes calldata swapToken0Data, bytes calldata swapToken1Data, bytes memory payload
) external returns (uint256, uint256);
```

The smart-collateral variant: redeems the LP inside the callback, then swaps each leg to the loan token. Any leftover of either underlying is returned to you. Returns `(actualSeizedAssets, repayAmount)` — note the second value here is the locally pre-computed `loanTokenAmountNeed`, not Moolah's returned repaid amount as in `liquidateSmartCollateral`.

> **Every pair must be whitelisted.** Both flash paths require `pairWhitelist[pair]`, which only the `MANAGER` role can set. On `flashLiquidateSmartCollateral` **both** `token0Pair` and `token1Pair` must be whitelisted unconditionally — including a leg that is never actually swapped, e.g. when that token already is the loan token — an arbitrary DEX router will revert with `NotWhitelisted()`. Read `pairWhitelist(address)` before building the route. Self-funded paths have no such constraint, so if the venue you want is not whitelisted, use `liquidate` and do the swap yourself afterwards.

### Unwinding deferred collateral

```solidity
function redeemSmartCollateral(
  address smartProvider, uint256 lpAmount, uint256 minToken0Amt, uint256 minToken1Amt
) external returns (uint256, uint256);
```

Returns `(token0Amount, token1Amount)`.

Redeems LP collateral you previously accumulated via `doTransferColl: false`. Reverts with `"insufficient lp collateral"` if `lpAmount` exceeds your tracked balance.

---

## Sizing a liquidation

**Exactly one of `seizedAssets` / `repaidShares` must be non-zero.** The other is derived:

* **`seizedAssets > 0`** — "buy this much collateral." The required repayment is computed from the oracle price and the liquidation incentive factor.
* **`repaidShares > 0`** — "close this much debt." Pass the borrower's full `borrowShares` to close the position entirely. The Liquidation Zone front end uses this branch for a full close-out and the `seizedAssets` branch for a partial buy. This only succeeds when the resulting seizure does not exceed the borrower's remaining collateral — `Moolah.liquidate` does `position.collateral -= seizedAssets`, which underflows and reverts on a deeply under-water position. Size by `seizedAssets` in that case.

The incentive factor is the same formula as in Moolah core:

```
liquidationIncentiveFactor = min(
  MAX_LIQUIDATION_INCENTIVE_FACTOR,          // 1.15e18
  WAD / (WAD - LIQUIDATION_CURSOR * (WAD - lltv))   // LIQUIDATION_CURSOR = 0.3e18
)
```

`PublicLiquidator` exposes a public view that replicates Moolah's math exactly, so you never have to reimplement it:

```solidity
function loanTokenAmountNeed(bytes32 id, uint256 seizedAssets, uint256 repaidShares)
  public view returns (uint256);
```

**Approve at least this amount of the loan token to `PublicLiquidator` before calling a self-funded path.** Any unused loan token is refunded to you in the same transaction, so approving the quoted amount (or a small buffer above it) is safe.

> **Do not use this quote on a broker market.** `loanTokenAmountNeed` prices the collateral with `Moolah.getPrice(marketParams)`, which is the plain market price (`user = address(0)`). `Moolah.liquidate` instead prices with `_getPrice(marketParams, borrower)`, and on a market with a broker that routes to the broker and can deviate from the market price according to the borrower's position. The quote can therefore underfund the liquidation. On broker markets, derive the repayment from the broker's own pricing — `peek(token, user)` and `getUserTotalDebt(user)`, see [Broker Reference](broker-reference.md).

One further constraint, on how you may size a *partial* liquidation:

**A residual below `minLoan` must be healthy.** After the repayment, Moolah requires `_isHealthyAfterLiquidate`: if the borrower still has both debt and collateral and the remaining borrow assets fall **below** `minLoan(marketParams)`, the position must be healthy or the whole transaction reverts `UNHEALTHY_POSITION`. So you cannot leave a small unhealthy dust position behind: either size the liquidation to restore health, keep the residual at or above `minLoan`, or clear the debt or collateral entirely.

Call it **after** interest has been accrued for the market, or accept that the quote drifts: every entry point calls `Moolah.accrueInterest(params)` before computing the amount, and `accrueInterest` is permissionless, so a fresh quote is best obtained by simulating against current state rather than reading a value cached from an earlier block.

---

## Reverts

| Error | Cause |
| --- | --- |
| `NotWhitelisted()` | `isLiquidatable` failed (position not open to the public path), or `pair` / `smartProvider` not whitelisted. This one selector covers **both** eligibility and whitelist failures — check `isLiquidationWhitelist` / `marketWhitelist` / `marketUserWhitelist` and `pairWhitelist` separately to tell them apart. |
| `NoProfit()` | Self-funded paths: the contract's collateral balance did not strictly increase. Flash paths: the swap output did not **exceed** the repayment — exact break-even reverts too, since a strictly positive loan-token surplus is required. Widen slippage, reduce `seizedAssets`, or pick a deeper venue. |
| `SwapFailed()` | The low-level call to `pair` reverted. Stale aggregator calldata is the usual cause. |
| `"Invalid smart provider"` | `ISmartProvider(smartProvider).TOKEN() != marketParams.collateralToken`. |
| Moolah `"position is healthy"` | The position was healthy by the time your transaction landed — someone repaid, or the price moved. The most common failure in practice; re-check immediately before submitting and expect to lose races. |
| Moolah `"inconsistent input"` | `exactlyOneZero(seizedAssets, repaidShares)` failed. Note the flash paths hardcode `repaidShares = 0`, so calling one with `seizedAssets = 0` reverts here. |
| Moolah `"position is unhealthy"` | The residual position was left with debt and collateral, borrow assets below `minLoan`, and still unhealthy. Size the liquidation differently — see above. |
| Moolah `"not liquidation whitelist"` | `PublicLiquidator` itself is not on the market's Moolah-level whitelist. Can surface when a market was gated after `marketWhitelist[id]` was set. |

Four entry points carry `nonReentrant` directly; `liquidate` inherits it by delegating to `liquidateWithCollTransferOpt`, which is `public nonReentrant`. `redeemSmartCollateral` is `nonReentrant` too.

---

## Event

```solidity
event Liquidated(
  bytes32 indexed id,
  address indexed borrower,
  uint256 seizedAssets,
  uint256 repaidAssets,
  uint256 repaidShares,
  address liquidator
);
```

Emitted by `PublicLiquidator` in addition to Moolah's own `Liquidate` event (see [Events & Callbacks](events-and-callbacks.md)). Index on this one to attribute liquidations to the public path specifically — but read the **settled** amounts from Moolah's `Liquidate`: the fields here echo the caller's *inputs*, so `repaidShares` is `0` on both flash paths and on any `seizedAssets > 0` call even though Moolah burned a non-zero share amount, and `seizedAssets` is likewise the requested figure rather than Moolah's returned value. `repaidAssets` is `PublicLiquidator`'s own `loanTokenAmountNeed` quote, priced at the plain market price, so on a broker market it diverges from what Moolah actually settled. Settled liquidations are also served by [`/api/liquidation/zone/history`](../services/lending-api/position-liquidation-emission.md).

---

## Reference flow

1. **Poll candidates.** `GET /api/liquidation/zone/list` for whitelisted / flagged positions, or `GET /api/liquidation/zone/closeToLiquidate` for positions approaching the threshold (safety factor `< 1.5`). The [Moolah liquidatable endpoint](../services/lending-api/position-liquidation-emission.md) returns `borrowShares`, `totalBorrowAssets`, and `totalBorrowShares` so you can recompute exact current debt from shares.
2. **Re-verify on chain.** API data is indexed and can lag. Confirm reachability the way the eligibility section describes — `getLiquidationWhitelist(id).length == 0` for an open market, or `isLiquidationWhitelist(id, <PublicLiquidator>)` plus `marketWhitelist(id)` / `marketUserWhitelist(id, borrower)` for a gated one — and that the position is still unhealthy at the live oracle price — Moolah re-checks health at execution time and will revert otherwise.
3. **Size it.** Choose `seizedAssets` or `repaidShares`, then call `loanTokenAmountNeed` for the repayment.
4. **Approve** that amount of the loan token to `PublicLiquidator` (self-funded paths only).
5. **Execute.** `liquidate` for plain collateral; `liquidateSmartCollateral` for smart collateral; the `flash*` variants if you would rather not hold the loan token and the venue is whitelisted.
6. **Settle.** Seized collateral arrives in the same transaction unless you passed `doTransferColl: false`, in which case unwind later with `redeemSmartCollateral`.
