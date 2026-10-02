# V3 Dex

## 概述

Lista V3 Dex 是一个基于 BNB Smart Chain 的集中流动性自动化做市商 (AMM)。流动性提供者在选择的价格范围（tick ranges）内集中资本，而不是在整个价格曲线上分布，每个流动性头寸都作为 ERC-721 NFT 持有。这些并不是 Smart Lending 背后的资金池——该产品通过 `SmartProvider` 将 **StableSwap** LP 作为抵押品；请参阅 [Smart Lending & StableSwap](../lista-lending/stableswap-integration.md)。该协议是 Uniswap V3 的一个分叉，因此标准的 Uniswap V3 模型和工具可以直接应用。

## 内容

* [架构与机制](mechanics.md) — Lista 特定的部署细节（费用等级、NFT 名称、可升级的头寸管理器、池初始化代码哈希）以及如何基于 V3 分叉进行构建。
* [智能合约](smart-contract.md) — 部署地址。