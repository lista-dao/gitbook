# slisBNBx

## Overview

`SlisBNBxMinter` is a utility contract in Lista DAO's Moolah lending protocol. It is the mint-and-burn engine for `slisBNBx`, a non-transferable certificate token that represents a user's collateral position in Moolah.

`slisBNBx` (formerly `clisBNB`) allows users to keep an active lending position while still participating in Binance Launchpool. The minter enforces token lifecycle rules for issuance, delegation, and burn, so supply stays consistent with collateral at all times.

The legacy CDP system is not supported by this contract.

## Key Value Proposition

Users can deposit `slisBNB` or `slisBNB/BNB LP` as collateral in Moolah and still participate in Binance Launchpool without unwinding their lending position. `slisBNBx` is the non-transferable certificate that proves this collateral stake.

## Contents

* [Token Lifecycle](token-lifecycle.md)
* [Minting Ratio Logic](minting-ratio-logic.md)
* [Delegation](delegation.md)
* [Smart Contract](smart-contract.md)
