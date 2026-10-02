# Lista Lending

## 概述

Moolah 是 Lista DAO 的去中心化借贷协议，品牌为 Lista Lending。它部署在 BNB 智能链和以太坊上——有关以太坊的地址集，请参阅 [Ethereum](smart-contract-ethereum.md)，并注意 [SDK](../sdk.md) 的以太坊覆盖范围落后于协议。它由 Morpho 提供支持，并基于 Morpho Blue 智能合约构建。

Moolah 扩展了标准的 Morpho 市场架构，增加了 Lista 特定的控制和集成，包括最低贷款底线、弹性预言机路由、协议级重入保护、可升级性和基于角色的访问控制。

此外，它支持两种外部系统的集成模式：

* 用于抵押品处理和资产转换的提供者合约
* 用于策划市场访问和固定期限/固定利率借贷流程的经纪合约