# Overview

<div align="center" data-full-width="true"><figure><img src="../.gitbook/assets/image (44).png" alt=""><figcaption></figcaption></figure></div>

## Lista DAO for developers

Lista DAO is a BNB Chain DeFi protocol spanning lending, liquid staking, a decentralized stablecoin, and a concentrated-liquidity DEX. The current developer-facing product set is anchored by **Lista Lending (Moolah)** — a Morpho-based isolated-market lending protocol — alongside **slisBNB** liquid staking, the **lisUSD** Collateral Debt Position, **Smart Lending & the V3 DEX**, **RWA** markets, **Credit Loans**, the **LISTA** governance token, **lisAster**, and the **slisBNBx** Launchpool certificate. This section is the entry point for integrators building on Lista, auditors reviewing the contracts, and developers learning how the pieces fit together. Each product below links to its developer README and its on-chain contract reference.

## Product map

| Product | What it is | Developer docs | Contracts |
| ------- | ---------- | -------------- | --------- |
| **Lista Lending (Moolah)** | Morpho-based isolated lending markets and curated vaults, extended with Lista controls (oracle routing, min-loan floor, role-based access). | [README](lista-lending/README.md) · [Integration Patterns](lista-lending/integration-patterns.md) | [Smart Contract](lista-lending/smart-contract.md) |
| **Liquid Staking (slisBNB)** | Stake BNB to mint the yield-bearing `slisBNB` liquid staking token, usable as collateral across Lista. | [README](liquid-staking-slisbnb/README.md) | [Smart Contract](liquid-staking-slisbnb/smart-contract.md) |
| **Collateral Debt Position (lisUSD)** | The legacy Helio-era CDP: deposit collateral into the Interaction module to borrow the `lisUSD` stablecoin. Now a secondary product alongside Lista Lending. | [README](collateral-debt-position/README.md) · [Mechanics](collateral-debt-position/mechanics.md) | [Smart Contract](collateral-debt-position/smart-contract.md) |
| **Smart Lending & V3 DEX** | Smart Lending routes lending collateral into DEX liquidity positions; the V3 DEX is a Uniswap V3-style concentrated-liquidity AMM (positions as NFTs, swaps via `SwapRouter`). | [V3 DEX README](dex/README.md) · [Smart Lending (concept)](../introduction/smart-lending.md) | [DEX Smart Contract](dex/smart-contract.md) · [Smart Lending contracts](lista-lending/smart-contract-bsc-smart-lending.md) |
| **RWA** | Tokenized access to U.S. short-term Treasury / bond strategies: subscribe with `USDT` and receive NAV-bearing pool shares via `RWAEarnPool`. | [README](rwa/README.md) | [Smart Contract](rwa/smart-contract.md) |
| **Credit Loans** | Fixed-term, fixed-rate `CreditBroker` lending gated by off-chain credit scoring represented on-chain via Merkle roots and a non-transferable `CreditToken`. | [README](credit-loans/README.md) · [Loan Lifecycle](credit-loans/loan-lifecycle.md) | [Smart Contract](credit-loans/smart-contract.md) |
| **Governance (LISTA)** | The `LISTA` token and governance contracts. Note: the veLISTA voting-escrow mechanism is being deprecated under LIP-024; governance voting has moved to plain LISTA on Snapshot. | [README](lista-governance/README.md) | [Smart Contract](lista-governance/smart-contract.md) |
| **lisAster** | ASTER staking aggregator: deposit ASTER to mint the transferable `lisAster` ERC-20, then stake it for epoch-based rewards. | [README](lisaster/README.md) | [Smart Contract](lisaster/smart-contract.md) |
| **slisBNBx** | Non-transferable collateral certificate (`SlisBNBxMinter`) that lets a Moolah collateral position also join Binance Launchpool. Formerly `clisBNB`. | [README](clisbnb/README.md) · [Delegation](clisbnb/delegation.md) | [Smart Contract](clisbnb/smart-contract.md) |

Cross-cutting references: the [Multi-Oracle](multi-oracle.md) resilient price layer that backs lending and CDP, and [Lista Platform Services](services/README.md) for the off-chain APIs and data services.

## Find your path

### Integrators — building on Lista
- Start with [Lista Lending Integration Patterns](lista-lending/integration-patterns.md) for the Provider and Broker integration flows.
- Use the **Moolah Lending API** ([Overall](services/lending-api/overall.md) · [Vault](services/lending-api/vault.md) · [Market](services/lending-api/market.md) · [Position / Liquidation / Emission](services/lending-api/position-liquidation-emission.md)) for read-side market, vault, and position data.
- For typed read access and transaction-step building, use the [Moolah Lending SDK](sdk.md) (`@lista-dao/moolah-lending-sdk` / `@lista-dao/moolah-sdk-core`).

### Auditors / security researchers
- Each product's **Smart Contract** page (linked in the product map above) lists the on-chain addresses and contract roles.
- The [Multi-Oracle](multi-oracle.md) page documents the resilient price layer.
- Published audit reports are in [Security → Audit Reports](../security/audit-reports.md).

### General developers — learning the protocol
- Begin with the conceptual [Introduction](../README.md): [Lista Lending](../introduction/lista-lending/README.md), [Liquid Staking](../introduction/liquid-staking-slisbnb/README.md), [Smart Lending & Swap](../introduction/smart-lending.md), the [lisUSD CDP](../introduction/collateral-debt-position-lisusd/README.md), [RWA Markets](../introduction/rwa-markets.md), [Lista Credit](../introduction/lista-credit.md), and [lisAster](../introduction/lisaster.md).

## Networks

Lista contracts are deployed on:

| Network | chainId |
| ------- | ------- |
| BNB Smart Chain | 56 |
| Ethereum | 1 |

The full per-product address sets (BSC and, where applicable, Ethereum) are on each product's Smart Contract page above.
