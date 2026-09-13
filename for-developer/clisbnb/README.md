# slisBNBx

## Overview

`SlisBNBxMinter` is a utility contract in Lista DAO's Moolah lending protocol. It is the mint-and-burn engine for `slisBNBx`, a non-transferable certificate token that represents a user's collateral position in Moolah.

`slisBNBx` (formerly `clisBNB`) allows users to keep an active lending position while still participating in Binance Launchpool. The minter enforces token lifecycle rules for issuance, delegation, and burn, so supply stays consistent with collateral at all times.

The legacy CDP system is not supported by this contract. Nobody mints `slisBNBx` at will — the amount is always derived from the account's collateral. `rebalance` and `syncDelegatee` are module-only, but `syncUserModuleLp` / `bulkSyncUserModules` are permissionless: anyone may force a re-sync of any account against a registered module.

## Contents

* [Minting Ratio Logic](minting-ratio-logic.md)
* [Delegation](delegation.md)
* [Smart Contract](smart-contract.md)
