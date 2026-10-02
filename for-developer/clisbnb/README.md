# slisBNBx

## Overview

`slisBNBx` (formerly `clisBNB`) is a non-transferable certificate that lets you keep collateral working in a Moolah lending position and still qualify for Binance Launchpool with it.

You never mint it directly. `SlisBNBxMinter` issues and burns it as a consequence of your collateral moving, so the supply always matches the collateral behind it — see [Token Lifecycle](token-lifecycle.md) for the five steps.

The legacy CDP's own `HelioProvider` is a separate, still-live minter alongside `SlisBNBxMinter` (see [Token Lifecycle](token-lifecycle.md)) — this page documents the Moolah path only. Nobody mints `slisBNBx` at will — the amount is always derived from the account's collateral. `rebalance` and `syncDelegatee` are module-only, but `syncUserModuleLp` / `bulkSyncUserModules` are permissionless: anyone may force a re-sync of any account against a registered module.
