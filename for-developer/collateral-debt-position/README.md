# 抵押债务头寸

CDP 是 Lista 的原始借贷产品：存入抵押品，铸造与之对应的 **lisUSD** 稳定币。它是一个 MakerDAO/Helio 风格的引擎 — `Vat`、`Jug`、`Spotter`、`Dog`、`Clipper` 和 `Vow` 在 `Interaction` 入口点的背后。

> **该产品正在逐步关闭。** 新的借贷在整个协议中被回滚，存款和清算拍卖都被列入白名单。请改为针对 [Lista Lending](../lista-lending/README.md) 构建新的集成。

* [Mechanics](mechanics.md) — 活跃的门槛，以及如何解除现有头寸。
* [Flash Loan](flash-loan.md) — lisUSD 的 ERC-3156 闪电铸造，仍然有效。
* [CDP API](api.md) — 现有头寸的读取端点。
* [Smart Contract](smart-contract.md) — 部署的地址。