# 概述

<div align="center" data-full-width="true"><figure><img src="../.gitbook/assets/image (44).png" alt=""><figcaption></figcaption></figure></div>

## Lista DAO 为开发者提供的功能

Lista DAO 是一个涵盖借贷、流动质押、去中心化稳定币和集中流动性 DEX 的 DeFi 协议。大部分部署在 BNB Smart Chain 上；Lista Lending、LISTA 和 slisBNB OFTs 以及 slisXAUE RWA 产品也运行在以太坊上（参见[网络](#networks)）。集成工作主要集中在 **Lista Lending (Moolah)** —— 一个基于 Morpho 的隔离市场借贷协议 —— 以及 **slisBNB** 流动质押、**Smart Lending**、**V3 DEX**、**RWA** 市场、**Credit Loans**、**LISTA** 治理代币、**lisAster**、**slisBNBx** Launchpool 证书和传统的 **lisUSD** 抵押债务头寸。无论您是要集成 Lista、审计合约，还是研究各个部分如何协同工作，都可以从这里开始。下面每个产品都链接到其开发者 README 和链上合约参考。

## 产品地图

| 产品 | 描述 | 开发者文档 | 合约 |
| ------- | ---------- | -------------- | --------- |
| **Lista Lending (Moolah)** | 基于 Morpho 的隔离借贷市场和精选金库，扩展了 Lista 控制（预言机路由、最小贷款底线、基于角色的访问）。 | [README](lista-lending/README.md) · [集成模式](lista-lending/integration-patterns.md) | [智能合约](lista-lending/smart-contract.md) |
| **Liquid Staking (slisBNB)** | 质押 BNB 以铸造收益型 `slisBNB` 流动质押代币，可在 Lista 中用作抵押品。 | [README](liquid-staking-slisbnb/README.md) | [智能合约](liquid-staking-slisbnb/smart-contract.md) |
| **Collateral Debt Position (lisUSD)** | 传统的 Helio 时代 CDP。**正在逐步关闭** —— 协议范围内禁用新借款，存款被列入白名单，清算拍卖仅限白名单。现有持有人可以偿还或提取；新的第三方清算集成应使用 Lista Lending。 | [README](collateral-debt-position/README.md) · [机制](collateral-debt-position/mechanics.md) | [智能合约](collateral-debt-position/smart-contract.md) |
| **Smart Lending** | 接受 Lista **StableSwap** LP 头寸作为 Moolah 抵押品通过 `SmartProvider`，因此 LP 在支持贷款的同时继续赚取交易费用。与下面的 V3 DEX 不同。 | [Smart Lending & StableSwap](lista-lending/stableswap-integration.md) · [概念](../introduction/smart-lending.md) | [Smart Lending 合约](lista-lending/smart-contract-bsc-smart-lending.md) |
| **V3 DEX** | 类似 Uniswap V3 的集中流动性 AMM —— 头寸作为 NFT，通过 `SwapRouter` 进行交换。使用 Lista 自己的 init-code 哈希推导池地址，而不是 Uniswap 的。 | [README](dex/README.md) · [机制](dex/mechanics.md) | [智能合约](dex/smart-contract.md) |
| **RWA** | 代币化的现实世界资产。两个 `USDT` 池（国库，AAA CLO）通过 `RWAEarnPool` 发行 NAV 份额；slisXAUE（Tether Gold，以太坊）是一个独立产品。 | [README](rwa/README.md) | [智能合约](rwa/smart-contract.md) |
| **Credit Loans** | 固定期限、固定利率的 `CreditBroker` 借贷，由链下信用评分通过 Merkle 根和转移受限的 `CreditToken` 在链上表示（只有白名单中的 `TRANSFERER` 可以转移）。 | [README](credit-loans/README.md) · [贷款生命周期](credit-loans/loan-lifecycle.md) | [智能合约](credit-loans/smart-contract.md) |
| **Governance (LISTA)** | `LISTA` 代币和治理合约。veLISTA 投票托管机制正在根据 LIP-024 退役；现有锁定仍可退出。参见智能合约页面了解退出路径及其门槛。 | [README](lista-governance/README.md) | [智能合约](lista-governance/smart-contract.md) |
| **lisAster** | ASTER 质押聚合器：存入 ASTER 以铸造可转让的 `lisAster` ERC-20，然后质押以获得基于纪元的奖励。 | [README](lisaster/README.md) | [智能合约](lisaster/smart-contract.md) |
| **Lista Rights** | **持有者**发行计划的奖励分配（LISTA 持有者提升）。`LendingRewardsDistributorV2` 和 `RewardsRouter` 各自多次部署，每个发行计划一组，除了 Credit（没有 `RewardsRouter`）——参见 README 了解如何区分实例。 | [README](lista-rights/README.md) | [智能合约](lista-rights/smart-contract.md) |
| **slisBNBx** | 一种不可转让的抵押证书，使 Moolah 抵押头寸也可以加入 Binance Launchpool。以前称为 `clisBNB`。铸造和销毁由 `SlisBNBxMinter` 驱动，其地址在 [Lista Lending BSC Core](lista-lending/smart-contract-bsc-core.md) 页面上。 | [README](clisbnb/README.md) · [委托](clisbnb/delegation.md) | [智能合约](clisbnb/smart-contract.md) |

跨领域参考：借贷和 CDP 背后的弹性价格层 —— 从 [Standard Collaterals](multi-oracle-standard.md) 开始了解每个资产的来源，或 [Consuming Oracle Prices](multi-oracle/consuming-prices.md) 以代码读取价格 —— 以及 [Lista Platform Services](services/README.md) 的链下 API。

## 从哪里开始

* **集成** —— [集成模式](lista-lending/integration-patterns.md) 用于提供者和经纪人流程，然后是 [合约参考](lista-lending/contract-reference.md) 或 [SDK](sdk.md)。
* **读取数据** —— [Moolah Lending API](services/lending-api/README.md)。
* **审计** —— 上述每个产品的 **智能合约** 页面，[Multi-Oracle](multi-oracle.md) 价格层，以及 [审计报告](../security/audit-reports.md)。

## 网络

Lista 合约部署在：

| 网络 | chainId |
| ------- | ------- |
| BNB Smart Chain | 56 |
| Ethereum | 1 |

每个产品的智能合约页面包含其地址集，适用于 BSC 和（如适用）以太坊。这些地址表可能会滞后于部署：截至撰写本文时，[治理](lista-governance/smart-contract.md) 的表（从内部来源同步）缺少以太坊 LISTA OFT 地址，即使 LISTA 桥接到以太坊（如上所述）——如果某个页面看起来在产品运行的链上不完整，请将其视为需要报告的文档缺口，而不是合约不存在的证据。