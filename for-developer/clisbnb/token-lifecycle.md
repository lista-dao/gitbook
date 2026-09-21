# Token Lifecycle

`slisBNBx` is minted and burned by `SlisBNBxMinter` as a consequence of a collateral movement in Moolah. There is no user-callable mint. `SlisBNBxMinter` is not the only live minter, though — the legacy CDP's `HelioProvider` still holds minter rights too; see the note below.

| Step | What you do | What happens on-chain |
| --- | --- | --- |
| 1. Deposit | Supply `slisBNB` or a `slisBNB/BNB` LP position to Moolah through its provider. | Collateral is recorded and the provider calls `SlisBNBxMinter`. |
| 2. Mint | — | The minter derives the `slisBNBx` amount from the BNB-equivalent value of the collateral and mints it to you, or to your delegatee. |
| 3. Hold | Hold the certificate. It is non-transferable. | The holder qualifies for Binance Launchpool. |
| 4. Withdraw | Withdraw collateral from Moolah, in full or in part. | The provider calls the minter to burn. |
| 5. Burn | — | The minter burns the share of `slisBNBx` matching the collateral removed, so supply stays fully collateral-backed. |

Plan around three consequences:

* **A partial withdrawal burns only the proportional amount** — the rest of the certificate stays minted. Whether the remaining balance still qualifies for a given Launchpool is decided by that campaign's own rules, not by this contract.
* **You cannot hold `slisBNBx` without the backing collateral.** Any path that removes collateral removes the certificate with it.
* **This lifecycle is the Moolah integration.** The legacy CDP is a separate, still-live mint/burn path through its own `HelioProvider` — not something this page documents. See [Delegation](delegation.md) for how the two paths differ.

See [Delegation](delegation.md) for directing the mint to another address, and [Minting Ratio Logic](minting-ratio-logic.md) for how the amount is derived.
