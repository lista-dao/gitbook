# Token Lifecycle

The `slisBNBx` lifecycle is strictly controlled by `SlisBNBxMinter`. Users and external contracts cannot mint directly.

| Step | Action | Result |
| --- | --- | --- |
| 1. Deposit | User deposits `slisBNB` or `slisBNB/BNB LP` into Moolah through the related provider/collateral contract. | Collateral is recorded and provider calls `SlisBNBxMinter`. |
| 2. Mint | Minter calculates `slisBNBx` using BNB-equivalent collateral value and calls `slisBNBx.mint()`. | `slisBNBx` is credited to user or delegated address. |
| 3. Hold | User holds `slisBNBx` (non-transferable). | Holder qualifies for Launchpool participation. |
| 4. Withdraw | User withdraws collateral from Moolah, fully or partially. | `SlisBNBxMinter` is called for proportional burn. |
| 5. Burn | Minter burns `slisBNBx` corresponding to collateral removed. | `slisBNBx` supply is reduced and stays collateral-backed. |

## Notes

* Minting and burning always follow collateral state.
* Partial withdrawals burn only the proportional amount.
* This lifecycle applies to Moolah integration, not legacy CDP.
