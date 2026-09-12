# Providers

A **provider** is a contract registered against a market and token that takes over part of the flow. Where a collateral-token provider is set, Moolah makes it an **exclusive gate**: only the provider may call `supplyCollateral` / `withdrawCollateral` for that market, and a direct call reverts. So for those collaterals the provider *is* the integration surface.

[Integration Patterns](integration-patterns.md) explains the model and lists which provider backs which collateral. This page gives the call signatures. Deployed addresses are on [Smart Contract](smart-contract.md).

Check whether a market is provider-gated before building against it:

```solidity
function providers(Id id, address token) external view returns (address);
```

A non-zero result for the collateral token means you must route through it.


---

## BNBProvider — native BNB

Lista's BNB vaults hold **WBNB**. `BNBProvider` is the wrapper that lets a user deposit native BNB and receive vault shares in one call, and unwrap on the way out. Without it you must wrap to WBNB yourself first; sending BNB at the vault will not work.

```solidity
function deposit(address receiver) external payable returns (uint256 shares);
function mint(uint256 shares, address receiver) external payable returns (uint256 assets);
function withdraw(uint256 assets, address payable receiver, address owner) external returns (uint256 shares);
function redeem(uint256 shares, address payable receiver, address owner) external returns (uint256 assets);
```

The amount is `msg.value` — there is no assets argument on `deposit`. On `mint` you send at least the previewed cost (`msg.value >= previewAssets`, else `invalid BNB amount`) and the surplus is refunded.

Each instance is **bound to one vault**, which is why the addresses table lists several.

A newer implementation adds a multi-vault form, but **not every deployed provider runs it** — the calls below are absent from some of the listed addresses and revert with empty returndata there. Probe `vaults` first; if it reverts, you have a single-vault instance and only the four signatures above exist.

```solidity
function deposit(address vault, address receiver) external payable returns (uint256 shares);
function mint(address vault, uint256 shares, address receiver) external payable returns (uint256 assets);
function vaults(address vault) external view returns (bool);
```

On that implementation `vaults(v)` must be `true` or the call reverts `vault not added` — including for the single-argument form, which routes through the provider's own `MOOLAH_VAULT`. So a default vault that was never registered makes even `deposit(receiver)` revert.

The vault's own whitelist still applies to the **receiver** either way — see [Vault Reference](vault-reference.md).

---

## SlisBNBProvider — slisBNB collateral

slisBNB collateral is provider-gated, so these are the only ways *you* can move it:

```solidity
function supplyCollateral(
  MarketParams memory marketParams,
  uint256 assets,
  address onBehalf,
  bytes calldata data
) external;

function withdrawCollateral(
  MarketParams memory marketParams,
  uint256 assets,
  address onBehalf,
  address receiver
) external;
```

**Approve the provider**, not Moolah — it pulls slisBNB from you with `transferFrom`. `marketParams.collateralToken` must be slisBNB (`invalid collateral token` otherwise), and `assets` must be non-zero.

On withdrawal the caller must be `onBehalf` or authorized for it (`unauthorized sender`).

Liquidation is the exception to the *user-facing* gate: Moolah transfers the seized collateral straight to the liquidator and then calls the provider's `liquidate(id, borrower)` hook. So collateral can leave a position without anyone calling `withdrawCollateral` — but the provider is still invoked, and on `SlisBNBProvider` that hook re-syncs the position and burns the corresponding `slisBNBx`, so Launchpool eligibility follows the liquidation.

Supplying through this provider also mints the non-transferable `slisBNBx` certificate that carries Binance Launchpool eligibility, and withdrawing burns it. The delegatee that holds it, and how to change it, are covered in [slisBNBx Delegation](../clisbnb/delegation.md) — including that the certificate covers the user's part only, not the fee slice.

---

## SmartProvider — StableSwap LP collateral

Smart Lending's provider has its own page: [Smart Lending & StableSwap](stableswap-integration.md), which covers the supply/withdraw variants, the price-difference guard and the collateral token's transfer restrictions.

---

## See also

- [Integration Patterns](integration-patterns.md) — the provider and broker model, and which provider backs which collateral.
- [Vault Reference](vault-reference.md) — the ERC-4626 surface these route into.
- [Contract & Interface Reference](contract-reference.md) — the provider gate as Moolah enforces it.
