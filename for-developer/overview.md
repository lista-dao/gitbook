# Overview

<div align="center" data-full-width="true"><figure><img src="../.gitbook/assets/image (44).png" alt=""><figcaption></figcaption></figure></div>

## Lista DAO for developers

Lista DAO is a DeFi protocol spanning lending, liquid staking, a decentralized stablecoin, and a concentrated-liquidity DEX. Most of it is deployed on BNB Smart Chain; Lista Lending, the LISTA and slisBNB OFTs and the slisXAUE RWA product also run on Ethereum (see [Networks](#networks)). Integration work centres on **Lista Lending (Moolah)** — a Morpho-based isolated-market lending protocol — alongside **slisBNB** liquid staking, **Smart Lending**, the **V3 DEX**, **RWA** markets, **Credit Loans**, the **LISTA** governance token, **lisAster**, the **slisBNBx** Launchpool certificate, and the legacy **lisUSD** Collateral Debt Position. Whether you are integrating against Lista, auditing the contracts, or working out how the pieces fit together, start here. Each product below links to its developer README and its on-chain contract reference.

## Product map

| Product | What it is | Developer docs | Contracts |
| ------- | ---------- | -------------- | --------- |
| **Lista Lending (Moolah)** | Morpho-based isolated lending markets and curated vaults, extended with Lista controls (oracle routing, min-loan floor, role-based access). | [README](lista-lending/README.md) · [Integration Patterns](lista-lending/integration-patterns.md) | [Smart Contract](lista-lending/smart-contract.md) |
| **Liquid Staking (slisBNB)** | Stake BNB to mint the yield-bearing `slisBNB` liquid staking token, usable as collateral across Lista. | [README](liquid-staking-slisbnb/README.md) | [Smart Contract](liquid-staking-slisbnb/smart-contract.md) |
| **Collateral Debt Position (lisUSD)** | The legacy Helio-era CDP. **Being wound down** — new borrowing is disabled protocol-wide and deposits and auctions are whitelisted; repay, withdraw and liquidation still work. New integrations should use Lista Lending. | [README](collateral-debt-position/README.md) · [Mechanics](collateral-debt-position/mechanics.md) | [Smart Contract](collateral-debt-position/smart-contract.md) |
| **Smart Lending** | Accepts a Lista **StableSwap** LP position as Moolah collateral through `SmartProvider`, so the LP keeps earning trading fees while backing a loan. Distinct from the V3 DEX below. | [Smart Lending & StableSwap](lista-lending/stableswap-integration.md) · [concept](../introduction/smart-lending.md) | [Smart Lending contracts](lista-lending/smart-contract-bsc-smart-lending.md) |
| **V3 DEX** | Uniswap V3-style concentrated-liquidity AMM — positions as NFTs, swaps via `SwapRouter`. Derive pool addresses with Lista's own init-code hash, not Uniswap's. | [README](dex/README.md) · [Mechanics](dex/mechanics.md) | [Smart Contract](dex/smart-contract.md) |
| **RWA** | Tokenized real-world assets. The two `USDT` pools (Treasury, AAA CLO) issue NAV-bearing shares via `RWAEarnPool`; slisXAUE (Tether Gold, Ethereum) is a separate product. | [README](rwa/README.md) | [Smart Contract](rwa/smart-contract.md) |
| **Credit Loans** | Fixed-term, fixed-rate `CreditBroker` lending gated by off-chain credit scoring represented on-chain via Merkle roots and a non-transferable `CreditToken`. | [README](credit-loans/README.md) · [Loan Lifecycle](credit-loans/loan-lifecycle.md) | [Smart Contract](credit-loans/smart-contract.md) |
| **Governance (LISTA)** | The `LISTA` token and governance contracts. The veLISTA voting-escrow mechanism is being retired under LIP-024; existing locks can still be exited. See the Smart Contract page for the exit paths and their gates. | [README](lista-governance/README.md) | [Smart Contract](lista-governance/smart-contract.md) |
| **lisAster** | ASTER staking aggregator: deposit ASTER to mint the transferable `lisAster` ERC-20, then stake it for epoch-based rewards. | [README](lisaster/README.md) | [Smart Contract](lisaster/smart-contract.md) |
| **Lista Rights** | Reward distribution for the **holder** emission programme. `LendingRewardsDistributorV2` and `RewardsRouter` are deployed once per programme — see the README for how to tell them apart. | [README](lista-rights/README.md) | [Smart Contract](lista-rights/smart-contract.md) |
| **slisBNBx** | A non-transferable collateral certificate that lets a Moolah collateral position also join Binance Launchpool. Formerly `clisBNB`. Minting and burning are driven by `SlisBNBxMinter`, whose address is on the [Lista Lending BSC Core](lista-lending/smart-contract-bsc-core.md) page. | [README](clisbnb/README.md) · [Delegation](clisbnb/delegation.md) | [Smart Contract](clisbnb/smart-contract.md) |

Cross-cutting references: the resilient price layer behind lending and the CDP — start at [Standard Collaterals](multi-oracle-standard.md) for the per-asset sources, or [Consuming Oracle Prices](multi-oracle/consuming-prices.md) to read prices in code — and [Lista Platform Services](services/README.md) for the off-chain APIs.

## Where to start

* **Integrating** — [Integration Patterns](lista-lending/integration-patterns.md) for the provider and broker flows, then the [Contract Reference](lista-lending/contract-reference.md) or the [SDK](sdk.md).
* **Reading data** — the [Moolah Lending API](services/lending-api/README.md).
* **Auditing** — each product's **Smart Contract** page above, the [Multi-Oracle](multi-oracle.md) price layer, and [Audit Reports](../security/audit-reports.md).

## Networks

Lista contracts are deployed on:

| Network | chainId |
| ------- | ------- |
| BNB Smart Chain | 56 |
| Ethereum | 1 |

Each product's Smart Contract page carries its full address set, for BSC and — where applicable — Ethereum.
