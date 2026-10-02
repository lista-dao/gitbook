# Liquid Staking (slisBNB)

通过 `ListaStakeManager` 质押 BNB 并接收 **slisBNB**，这是一种可转让的 ERC-20 代币，能够持续获得验证者奖励。slisBNB 是通过汇率而非重基获得收益的——余额保持不变，其 BNB 价值增长。

它也是协议中最广泛重复使用的资产：slisBNB 是 Moolah 的抵押品（提供者限制），是 StableSwap 池的一方，也是 `slisBNBx` Launchpool 证书背后的资产。

* [Mechanics](mechanics.md) — 质押、两步提款和用户可调用接口。
* [Cross-Chain Bridge](cross-chain-bridge.md) — 将 slisBNB 作为 LayerZero OFT 移动到以太坊。
* [Smart Contract](smart-contract.md) — 部署的地址和端点 ID。