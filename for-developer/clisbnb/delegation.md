# Delegation

`slisBNBx` is a non-transferable certificate, so a holder cannot move it with a normal ERC-20 `transfer`. Instead, the protocol lets an account choose **which wallet holds the `slisBNBx` minted on its behalf**. This is called delegation, and it is the mechanism used to route a position's `slisBNBx` (and therefore its Binance Launchpool eligibility) to another wallet, such as a Binance Web3 MPC wallet.

Delegation is managed by `SlisBNBxMinter`, the mint-and-burn engine for `slisBNBx`. See [Token Lifecycle](token-lifecycle.md) for how `slisBNBx` is minted and burned, and [Smart Contract](smart-contract.md) for addresses.

## Delegation model

| Property | Behavior |
| --- | --- |
| Scope | **Per account, not per position.** A single delegatee holds the account's *entire* `slisBNBx` balance across all collateral modules (the `slisBNB` provider and the `slisBNB/BNB` LP provider). |
| Granularity | **No partial delegation.** You cannot split an account's `slisBNBx` between multiple wallets — it is all-or-nothing. |
| Default | If an account has never set a delegatee, the holder defaults to **the account itself**. The first mint records `delegation[account] = account`. |
| Mutability | **Can be changed at any time** via `delegateAllTo`. It is *not* fixed at mint time. |
| Effect on collateral | Delegation only changes **who holds the `slisBNBx` certificate**. It does not move, re-own, or otherwise affect the underlying collateral in Moolah. |

The minter stores delegation as a single mapping, `delegation[account] => delegatee`, and tracks the total `slisBNBx` minted for each account across every module in `userTotalBalance[account]`. Both are read-only and queryable on-chain.

## Changing the delegatee

Reassigning the delegatee is **atomic**: the minter burns the account's entire `slisBNBx` balance from the old holder and mints the same amount to the new delegatee in a single call. No rebalance against collateral happens during the switch — only the holder changes.

### `delegateAllTo` (called by the account)

```solidity
function delegateAllTo(address newDelegatee) external;
```

Called by the account itself (`msg.sender`). It delegates the account's whole `slisBNBx` balance to `newDelegatee`.

* No-op if `newDelegatee` already equals the current delegatee (this equality check runs first).
* Otherwise, the zero address is rejected as a new delegatee.
* Internally: reads `userTotalBalance[account]`, burns that amount from the current holder (the old delegatee, or the account itself if none was set), records `delegation[account] = newDelegatee`, then mints the burned amount to `newDelegatee`.

### `syncDelegatee` (called by a module)

```solidity
function syncDelegatee(address account, address newDelegatee) external;
```

The module-callable variant. It is restricted to registered collateral modules (`msg.sender` must be a configured module), and performs the same atomic burn-from-old / mint-to-new as `delegateAllTo`. It exists so a provider module can carry a user's existing delegation over to the minter during the migration to the `SlisBNBxMinter` architecture; integrators delegate through `delegateAllTo`, not this function.

### Burn-tolerant reassignment

The burn step uses a safe-burn that tolerates a holder whose actual `slisBNBx` balance is lower than the recorded total (balances can drift from collateral value, exchange-rate, or fee-rate changes). If less than the expected amount can be burned, `userTotalBalance[account]` is adjusted down to the amount actually burned, and only that amount is minted to the new delegatee. This keeps the certificate accounting consistent rather than reverting.

## Legacy `SlisBNBProvider.delegateAllTo` is disabled

The `SlisBNBProvider` collateral module also exposes a `delegateAllTo(address)` function from an earlier design. Once the provider has been wired to the minter (`slisBNBxMinter` is set), this legacy path **reverts with `"not supported"`**. All delegation must go through `SlisBNBxMinter.delegateAllTo`.

```solidity
// SlisBNBProvider.delegateAllTo — legacy path, gated off once the minter is set
require(slisBNBxMinter == address(0), "not supported");
```

## Events

Index these to track delegation and the resulting certificate movements:

| Event | Emitted by | Signature | Meaning |
| --- | --- | --- | --- |
| `ChangeDelegateTo` | `SlisBNBxMinter` | `ChangeDelegateTo(address account, address oldDelegatee, address newDelegatee, uint256 amount)` | Delegatee reassigned; `amount` is the `slisBNBx` actually burned from the old holder and minted to the new one. |
| `UserModuleRebalanced` | `SlisBNBxMinter` | `UserModuleRebalanced(address account, address module, uint256 userPart, uint256 feePart)` | Per-module `slisBNBx` recomputed for the account during a rebalance. |
| `Rebalance` | `SlisBNBxMinter` | `Rebalance(address account, uint256 latestModuleBalance, address module, uint256 latestTotalBalance)` | A module triggered a rebalance; `latestTotalBalance` is the account's new total across modules. |

> The `SlisBNBProvider` contract emits its own `ChangeDelegateTo(address account, address oldDelegatee, address newDelegatee)` (note: **no `amount` field**) only from the legacy, now-disabled path. For the current minter architecture, listen for the `SlisBNBxMinter` event above.

## Integration notes

* **Read, don't expect transfers.** `slisBNBx` is non-transferable. To find an account's certificate holder, read `delegation[account]`; to find the minted total, read `userTotalBalance[account]`.
* **Delegation does not auto-rebalance.** `delegateAllTo` moves the existing balance as-is. Subsequent collateral supply/withdraw will rebalance the certificate to the *current* delegatee. See [Token Lifecycle](token-lifecycle.md).
* **The new holder receives Launchpool eligibility.** Because eligibility is computed off-chain from `slisBNBx` balances, the wallet that holds the certificate after delegation is the one credited with rewards.
