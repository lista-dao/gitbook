# V3 Dex

## Overview

Lista V3 Dex is a concentrated-liquidity automated market maker (AMM) on BNB Smart Chain. Liquidity providers concentrate capital within chosen price ranges (tick ranges) rather than across the full price curve, and each liquidity position is held as an ERC-721 NFT. The same pools are the on-chain liquidity engine behind Lista's Smart Lending / Smart Swap experience. The protocol is a Uniswap V3 fork, so the canonical Uniswap V3 model and tooling apply directly.

## Core components

| Contract | Role |
| -------- | ---- |
| `ListaV3Factory` | Deploys and registers one `ListaV3Pool` per `(token0, token1, fee)` triple, and controls which fee tiers are enabled. |
| `ListaV3Pool` | Per-pair, per-fee AMM pool. Holds concentrated liquidity, tracks the current price/tick, and executes swaps, mints, burns, collects, and flash loans. CREATE2-deployed by the factory. |
| `NonfungiblePositionManager` (NPM) | Wraps liquidity positions as ERC-721 NFTs (`Lista V3 Positions NFT`, symbol `LISTA-V3`). Entry point for mint / increaseLiquidity / decreaseLiquidity / collect / burn. Deployed behind a `TransparentUpgradeableProxy`. |
| `SwapRouter` | Stateless entry point for executing swaps (single-hop and multi-hop) against the pools, with WBNB wrapping/unwrapping, slippage, and deadline handling. |

## Fee tiers

The factory seeds three fee tiers at deployment. Fees are denominated in hundredths of a basis point (units of `1e-6`):

| Fee tier | `fee` value | Tick spacing |
| -------- | ----------- | ------------ |
| 0.05% | `500` | `10` |
| 0.30% | `3000` | `60` |
| 1.00% | `10000` | `200` |

The factory owner can enable additional fee tiers on-chain via `enableFeeAmount`; the three tiers above are those configured at deployment.

## Uniswap V3 compatibility

Because Lista V3 Dex is a Uniswap V3 fork, the canonical Uniswap V3 concentrated-liquidity model applies: `sqrtPriceX96`/tick price representation, tick-range liquidity, tick crossing on swaps, and ERC-721 positions. Standard Uniswap V3 SDKs and integration patterns work against these contracts. Use the deployed Lista addresses (see [Smart Contract](smart-contract.md)) in place of the upstream Uniswap deployment, and refer to the official Uniswap V3 documentation for the underlying math. One deployment-specific caveat: off-chain pool-address derivation must use Lista's own pool init-code hash (or read `factory.getPool`) — see [Mechanics](mechanics.md#building-on-lista-v3).

## Contents

* [Mechanics](mechanics.md)
* [Smart Contract](smart-contract.md)
