# Events & Callbacks

This page is the integration reference for the two ways Moolah hands control back to your contracts and off-chain systems:

- **Callbacks** — synchronous, in-transaction hooks that Moolah invokes on the caller mid-execution (before it pulls the tokens it is owed), enabling atomic flows such as leverage loops, flash-liquidations, and position migrations.
- **Events** — the logs Moolah, the IRM, and the vault layer emit for off-chain indexers, subgraphs, and monitoring.

For function signatures, structs, and the `Id`/`MarketParams` types referenced below, see the [Contract & Interface Reference](contract-reference.md). For the higher-level provider/broker model, see [Integration Patterns](integration-patterns.md).

---

## Callbacks

Moolah follows the Morpho-style callback pattern: several core entry points optionally call back into `msg.sender` after updating internal accounting but **before** transferring in the assets the caller owes. This lets an integrator source those assets inside the same transaction — for example, minting/swapping collateral, or repaying a loan out of seized collateral — so the whole operation is atomic and reverts as a unit if any leg fails.

### Firing rule

Each entry point takes a trailing `bytes data` argument. For **supply**, **repay**, **supplyCollateral**, and **liquidate**, the callback fires **only when `data` is non-empty** (`data.length > 0`); pass empty `data` to skip it. **`flashLoan` is the exception**: its callback is always invoked, because the flash loan has no purpose without it.

The callback is always made on `msg.sender`, so the contract that calls Moolah must be the contract that implements the interface.

### Callback interfaces

All five interfaces are declared in `moolah/interfaces/IMoolahCallbacks.sol`.

| Interface | Method | Fired by | Fires when |
| --- | --- | --- | --- |
| `IMoolahSupplyCallback` | `onMoolahSupply(uint256 assets, bytes data)` | `supply` | `data` non-empty |
| `IMoolahRepayCallback` | `onMoolahRepay(uint256 assets, bytes data)` | `repay` | `data` non-empty |
| `IMoolahSupplyCollateralCallback` | `onMoolahSupplyCollateral(uint256 assets, bytes data)` | `supplyCollateral` | `data` non-empty |
| `IMoolahLiquidateCallback` | `onMoolahLiquidate(uint256 repaidAssets, bytes data)` | `liquidate` | `data` non-empty |
| `IMoolahFlashLoanCallback` | `onMoolahFlashLoan(uint256 assets, bytes data)` | `flashLoan` | always |

```solidity
interface IMoolahSupplyCallback {
  function onMoolahSupply(uint256 assets, bytes calldata data) external;
}

interface IMoolahRepayCallback {
  function onMoolahRepay(uint256 assets, bytes calldata data) external;
}

interface IMoolahSupplyCollateralCallback {
  function onMoolahSupplyCollateral(uint256 assets, bytes calldata data) external;
}

interface IMoolahLiquidateCallback {
  function onMoolahLiquidate(uint256 repaidAssets, bytes calldata data) external;
}

interface IMoolahFlashLoanCallback {
  function onMoolahFlashLoan(uint256 assets, bytes calldata data) external;
}
```

The first argument is the settled amount for that action: assets supplied/repaid/supplied-as-collateral, `repaidAssets` for a liquidation, or the flash-loaned amount. The `data` argument is the same opaque payload you passed into the originating call, so you can encode a route, a target market, or step parameters and decode them inside the callback.

### Execution order (the atomic window)

Within the originating call, Moolah:

1. Updates its own accounting.
2. Emits the corresponding event (`Supply`, `Repay`, `SupplyCollateral`, `Liquidate`, `FlashLoan`).
3. For the actions where Moolah owes **you** assets, transfers them out now — the seized collateral for `liquidate`, the loaned token for `flashLoan`. (`supply`, `repay`, and `supplyCollateral` have no outbound transfer; you are the one paying in.)
4. Calls back into `msg.sender` (subject to the firing rule above), handing you control while the position is mid-update.
5. On return, pulls in the assets **you** owe via `transferFrom` (the supplied/repaid/collateral token, or the flash-loaned amount plus zero fee). If your balance or allowance is short, the whole transaction reverts.

Your callback body runs in step 4, so it must leave `msg.sender` holding enough of the inbound token (and allowance to Moolah) for step 5 to succeed.

### Typical atomic flows

| Flow | Callback used | Sketch |
| --- | --- | --- |
| **Leverage loop** | `onMoolahSupplyCollateral` | Deposit seed collateral with non-empty `data`; in the callback, borrow the loan token, swap it to more collateral, and top up so the net collateral requirement is met on return — opening a levered position in one transaction. |
| **Flash-liquidation** | `onMoolahLiquidate` | Call `liquidate` with `data`; Moolah sends you the seized collateral first, then calls back. Swap that collateral to the loan token (e.g. via [Lista DEX](../dex/README.md) or any DEX) so you can cover the `repaidAssets` pulled on return — no upfront capital. |
| **Debt / position migration** | `onMoolahFlashLoan` | Flash-loan the loan token, use it to repay a position elsewhere, withdraw the freed collateral, re-supply it into a Moolah market, borrow, and repay the flash loan — all atomically. |
| **Zero-capital deleverage** | `onMoolahRepay` | Repay a borrow with `data`; in the callback withdraw collateral and swap part of it to fund the repayment that Moolah pulls on return. |

> Callbacks are a low-level primitive. If you are integrating in TypeScript and do not need custom atomic routing, the [Moolah Lending SDK](../sdk.md) builds standard supply/borrow/repay transactions for you.

---

## Events

### Core market events (`Moolah`)

Emitted by the Moolah core contract; declared in `moolah/libraries/EventsLib.sol`. `Id` is the market identifier (the keccak hash of `MarketParams`). Indexed parameters are marked below.

| Event | Parameters (indexed in **bold**) |
| --- | --- |
| `CreateMarket` | **`Id id`**, `MarketParams marketParams` |
| `Supply` | **`Id id`**, **`address caller`**, **`address onBehalf`**, `uint256 assets`, `uint256 shares` |
| `Withdraw` | **`Id id`**, `address caller`, **`address onBehalf`**, **`address receiver`**, `uint256 assets`, `uint256 shares` |
| `SupplyCollateral` | **`Id id`**, **`address caller`**, **`address onBehalf`**, `uint256 assets` |
| `WithdrawCollateral` | **`Id id`**, `address caller`, **`address onBehalf`**, **`address receiver`**, `uint256 assets` |
| `Borrow` | **`Id id`**, `address caller`, **`address onBehalf`**, **`address receiver`**, `uint256 assets`, `uint256 shares` |
| `Repay` | **`Id id`**, **`address caller`**, **`address onBehalf`**, `uint256 assets`, `uint256 shares` |
| `Liquidate` | **`Id id`**, **`address caller`**, **`address borrower`**, `uint256 repaidAssets`, `uint256 repaidShares`, `uint256 seizedAssets`, `uint256 badDebtAssets`, `uint256 badDebtShares` |
| `FlashLoan` | **`address caller`**, **`address token`**, `uint256 assets` |
| `AccrueInterest` | **`Id id`**, `uint256 prevBorrowRate`, `uint256 interest`, `uint256 feeShares` |
| `SetAuthorization` | **`address caller`**, **`address authorizer`**, **`address authorized`**, `bool newIsAuthorized` |
| `IncrementNonce` | **`address caller`**, **`address authorizer`**, `uint256 usedNonce` |
| `SetFee` | **`Id id`**, `uint256 newFee` |
| `SetFeeRecipient` | **`address newFeeRecipient`** |
| `EnableIrm` | **`address irm`** |
| `EnableLltv` | `uint256 lltv` |

Indexing notes for integrators:

- **Position reconstruction.** A supplier's balance evolves through `Supply`/`Withdraw`; a borrower's through `Borrow`/`Repay`/`Liquidate`; collateral through `SupplyCollateral`/`WithdrawCollateral`. All are keyed by the indexed `Id` and the indexed `onBehalf` (or `borrower`) address.
- **Interest.** `AccrueInterest` carries the `prevBorrowRate` used for the elapsed period, the `interest` added to the market, and the `feeShares` minted to the fee recipient. Note that the fee recipient can receive shares during accrual **without** a `Supply` event, so reconstruct fee-recipient balances from `AccrueInterest`, not `Supply`.
- **Repay/Liquidate rounding.** `repaidAssets` on both `Repay` and `Liquidate` may exceed the market's `totalBorrowAssets` by 1 due to rounding — account for this when reconciling.
- **Bad debt.** On `Liquidate`, non-zero `badDebtAssets`/`badDebtShares` mean the position was underwater and the loss was socialized to suppliers of that market.
- **Authorization.** Watch `SetAuthorization` (and `IncrementNonce` for signature-based authorizations) to track which managers can act on a position via the `authorized`/`onBehalf` model.

Lista-specific administrative events (provider/broker wiring, whitelists, blacklists, min-loan, default fee) are also declared in the same `EventsLib` and documented alongside the functions that emit them in the [Contract & Interface Reference](contract-reference.md).

### Interest-rate model events (`InterestRateModel`)

The adaptive-curve IRM (`src/interest-rate-model/InterestRateModel.sol`) emits its own events. `BorrowRateUpdate` is emitted each time Moolah accrues interest against a market that uses this IRM (Moolah calls `IIrm.borrowRate` during `_accrueInterest`), so it is the finest-grained rate signal available to indexers.

| Event | Parameters (indexed in **bold**) |
| --- | --- |
| `BorrowRateUpdate` | **`Id id`**, `uint256 avgBorrowRate`, `uint256 rateAtTarget` |
| `BorrowRateCapUpdate` | **`Id id`**, `uint256 oldRateCap`, `uint256 newRateCap` |
| `BorrowRateFloorUpdate` | **`Id id`**, `uint256 oldRateFloor`, `uint256 newRateFloor` |
| `MinCapUpdate` | `uint256 oldMinCap`, `uint256 newMinCap` |

`avgBorrowRate` is the average per-second rate (scaled by WAD) applied over the accrual interval; `rateAtTarget` is the model's rate at target utilization after the update. Fixed-rate broker markets use a separate `FixedRateIrm`, which emits `SetBorrowRate(Id indexed id, int256 newBorrowRate)` when its rate is set.

### Vault events (`MoolahVault`)

The ERC-4626 curator vault layer emits its own lifecycle and configuration events; declared in `moolah-vault/libraries/EventsLib.sol`. In addition to the standard ERC-4626 `Deposit`/`Withdraw`/`Transfer` events, integrators typically index:

| Event | Parameters (indexed in **bold**) |
| --- | --- |
| `CreateMoolahVault` | **`address moolahVault`**, `address implementation`, `address managerTimeLock`, `address curatorTimeLock`, `uint256 timeLockDelay`, **`address caller`**, `address manager`, `address curator`, `address guardian`, **`address asset`**, `string name`, `string symbol` |
| `SetCap` | **`address caller`**, **`Id id`**, `uint256 cap` |
| `SubmitCap` | **`address caller`**, **`Id id`**, `uint256 cap` |
| `SetSupplyQueue` | **`address caller`**, `Id[] newSupplyQueue` |
| `SetWithdrawQueue` | **`address caller`**, `Id[] newWithdrawQueue` |
| `ReallocateSupply` | **`address caller`**, **`Id id`**, `uint256 suppliedAssets`, `uint256 suppliedShares` |
| `ReallocateWithdraw` | **`address caller`**, **`Id id`**, `uint256 withdrawnAssets`, `uint256 withdrawnShares` |
| `AccrueInterest` | `uint256 newTotalAssets`, `uint256 feeShares` |
| `UpdateLastTotalAssets` | `uint256 updatedTotalAssets` |
| `SetCurator` | **`address newCurator`** |
| `SetIsAllocator` | **`address allocator`**, `bool isAllocator` |
| `SetFee` | **`address caller`**, `uint256 newFee` |
| `SetFeeRecipient` | **`address newFeeRecipient`** |
| `Skim` | **`address caller`**, **`address token`**, `uint256 amount` |

Timelocked/governance actions on the vault emit the matching `Submit*` / `Set*` / `Revoke*` pairs (`SubmitTimelock`/`SetTimelock`, `SubmitGuardian`/`SetGuardian`, `SubmitMarketRemoval`/`RevokePendingMarketRemoval`, etc.), also in the same `EventsLib`.

To reconstruct how a vault allocates deposits across underlying Moolah markets, track `SetSupplyQueue`/`SetWithdrawQueue` for ordering, `SetCap`/`SubmitCap` for per-market limits, and `ReallocateSupply`/`ReallocateWithdraw` for actual moves.

### Vault allocator events (`VaultAllocator`)

The public reallocation helper (`src/vault-allocator/VaultAllocator.sol`) emits, from `vault-allocator/libraries/EventsLib.sol`:

| Event | Parameters (indexed in **bold**) |
| --- | --- |
| `PublicWithdrawal` | **`address sender`**, **`address vault`**, **`Id id`**, `uint256 withdrawnAssets` |
| `PublicReallocateTo` | **`address sender`**, **`address vault`**, **`Id supplyMarketId`**, `uint256 suppliedAssets` |
| `SetFlowCaps` | **`address sender`**, **`address vault`**, `FlowCapsConfig[] config` |
| `SetAdmin` | **`address sender`**, **`address vault`**, `address admin` |
| `SetFee` | **`address sender`**, **`address vault`**, `uint256 fee` |
| `TransferFee` | **`address sender`**, **`address vault`**, `uint256 amount`, **`address feeRecipient`** |

A public reallocation emits one `PublicWithdrawal` per market it pulls from and a `PublicReallocateTo` for the market it supplies into, all correlated by the indexed `vault`.

---

## See also

- [Contract & Interface Reference](contract-reference.md) — full function signatures, structs, and Lista-specific extensions.
- [Integration Patterns](integration-patterns.md) — provider vs. broker integration models.
- [Moolah Lending SDK](../sdk.md) — TypeScript builder for standard supply/borrow/repay flows.
- [Smart Contract](smart-contract.md) — deployed contract addresses.
