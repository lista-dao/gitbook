# Vault Reference (MoolahVault)

`MoolahVault` is the ERC-4626 layer over Moolah: suppliers deposit one loan asset, a curator allocates it across markets, and shares accrue the blended yield. This page is the interface reference for calling a vault **directly** — from Solidity, or from a stack that cannot use the [SDK](../sdk.md).

For deployed vault addresses see [Smart Contract](smart-contract.md). For the market-level contract see [Contract & Interface Reference](contract-reference.md); for the read-side REST API see [Vault API](../services/lending-api/vault.md).

All facts below are derived from `src/moolah-vault/MoolahVault.sol` and its `ErrorsLib`.

---

## Before you deposit: three things that can block you

These are the gates that make a deposit fail for reasons a plain ERC-4626 client would not expect.

**1. The vault may have a whitelist.** `deposit` and `mint` both require `isWhiteList(receiver)`. The check is `whiteList.length() == 0 || whiteList.contains(account)` — an **empty list means open to everyone**, which is the common case. Once any address is added, only listed receivers can be minted to. Read it before assuming:

```solidity
function isWhiteList(address account) external view returns (bool);
function getWhiteList() external view returns (address[] memory);
```

A blocked deposit reverts `NotWhiteList()`. Note the gate is on the **receiver**, not the caller, so depositing on someone else's behalf is constrained by *their* status.

**2. Capacity is finite and is not `totalAssets`.** Each market in the supply queue has a cap, and the vault can only absorb what the queue can still take. `maxDeposit` walks the supply queue and sums the remaining room:

```solidity
function maxDeposit(address) external view returns (uint256);
function maxMint(address) external view returns (uint256);
```

Call `maxDeposit` before sizing a deposit; exceeding it reverts `AllCapsReached()`. Both `maxDeposit` and `maxMint` are documented in-source as possibly **over-reporting** when the supply queue contains the same market twice — that market's headroom gets counted once per entry. Treat either as an upper bound rather than a promise, and leave margin: a deposit sized at exactly `maxDeposit` can still revert.

**3. Withdrawal is bounded by reachable liquidity, not by your balance.** A vault withdraw pulls from markets in withdraw-queue order, and a market whose liquidity is fully borrowed cannot be pulled from. So a holder's shares are not always redeemable in full at that moment:

```solidity
function maxWithdraw(address owner) external view returns (uint256);
function maxRedeem(address owner) external view returns (uint256);
```

Exceeding the reachable amount reverts `NotEnoughLiquidity()`. Both views are documented in-source as possibly **under-reporting** because of share/asset rounding, so they are a safe lower bound. **Do not present a user's full share balance as withdrawable** — quote `maxWithdraw` instead.

---

## ERC-4626 surface

Standard, with the usual semantics:

```solidity
function asset() external view returns (address);
function totalAssets() external view returns (uint256);

function deposit(uint256 assets, address receiver) external returns (uint256 shares);
function mint(uint256 shares, address receiver) external returns (uint256 assets);
function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
```

**Approve the vault itself** for `deposit` / `mint` — it pulls the asset with `transferFrom`. `withdraw` and `redeem` from an `owner` other than the caller consume the ERC-20 allowance on the *shares*, per the standard.

The `convertTo*` / `preview*` conversions account for the not-yet-minted performance-fee shares, so a quote taken before a fee accrual can differ slightly from what settles. For an exact figure, simulate the call.

`totalAssets` does **not** net out the fee — the fee is taken by minting shares to the fee recipient, not by reducing assets. It does subtract the broker interest lock buffer's `currentLocked()`, so it is not simply the sum of the vault's market positions.

### Two non-standard helpers

```solidity
function withdrawFor(uint256 assets, address owner, address sender) external returns (uint256 shares);
function redeemFor(uint256 shares, address owner, address sender) external returns (uint256 assets);
```

These exist for provider-routed flows — see [Providers](providers.md), which is how native BNB reaches a WBNB vault.

---

## Reading a vault's allocation

```solidity
function supplyQueueLength() external view returns (uint256);
function withdrawQueueLength() external view returns (uint256);
```

The supply queue determines where a deposit lands; the withdraw queue determines what a withdrawal can reach, in order. Both are allocator-managed (`setSupplyQueue`, `updateWithdrawQueue`, and `reallocate` — the last also callable by a bot role), while the per-market caps behind them are curator-managed (`setCap`, `setMarketRemoval`). All are role-gated, and all change without notice — read the queues rather than caching them.

Per-market caps and queue changes are observable as events; see [Events & Callbacks](events-and-callbacks.md) for the vault event set, including `SetCap`, `SetSupplyQueue` and `SetWithdrawQueue`.

---

## Reverts

| Error | Cause |
| --- | --- |
| `NotWhiteList()` | The **receiver** is not on a non-empty vault whitelist. |
| `AllCapsReached()` | Every market in the supply queue is at its cap. |
| `SupplyCapExceeded(Id)` | A **reallocation** would push one market past its cap — an allocator error, not a deposit one. A deposit clamps to the cap instead and reverts `AllCapsReached()`. |
| `NotEnoughLiquidity()` | The withdraw queue cannot reach enough liquidity right now. |
| `MarketNotEnabled(Id)` · `UnauthorizedMarket(Id)` | The market is not enabled for this vault — relevant to curator calls, not to a plain deposit. |
| `InconsistentAsset(Id)` | A market's loan token does not match the vault's `asset()`. |

---

## See also

- [Providers](providers.md) — native BNB into a WBNB vault, and the provider-gated collaterals.
- [Vault API](../services/lending-api/vault.md) — read-side list, detail and allocation endpoints.
- [Moolah Lending SDK](../sdk.md) — `buildVaultDepositParams` / `buildVaultWithdrawParams` assemble these calls for you.
