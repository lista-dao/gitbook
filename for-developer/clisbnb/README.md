# slisBNBx

## Overview

`slisBNBx` (formerly `clisBNB`) is a non-transferable certificate that lets you keep collateral working in a Moolah lending position and still qualify for Binance Launchpool with it.

You never mint it directly. `SlisBNBxMinter` issues and burns it as a consequence of your collateral moving, so the supply always matches the collateral behind it — see [Token Lifecycle](token-lifecycle.md) for the five steps.

The legacy CDP system is not supported by this contract. Nobody mints `slisBNBx` at will — the amount is always derived from the account's collateral. `rebalance` and `syncDelegatee` are module-only, but `syncUserModuleLp` / `bulkSyncUserModules` are permissionless: anyone may force a re-sync of any account against a registered module.

