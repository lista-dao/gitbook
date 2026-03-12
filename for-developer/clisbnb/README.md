# slisBNBx

## 概览

`SlisBNBxMinter` 是 Lista DAO 的 Moolah 借贷协议中的一个实用合约。它是 `slisBNBx` 的铸造和销毁引擎，`slisBNBx` 是一个不可转让的证书代币，代表用户在 Moolah 中的抵押品位置。

`slisBNBx`（原名 `clisBNB`）允许用户在保持活跃的借贷位置的同时，继续参与 Binance Launchpool。铸币机执行代币生命周期的规则，包括发行、委托和销毁，因此供应始终与抵押品保持一致。

此合约不支持传统的 CDP 系统。

## 关键价值主张

用户可以在 Moolah 中存入 `slisBNB` 或 `slisBNB/BNB LP` 作为抵押品，并且仍然可以参与 Binance Launchpool 而不需要解除他们的借贷位置。`slisBNBx` 是证明这种抵押品的不可转让证书。

## 内容

* [代币生命周期](token-lifecycle.md)
* [铸币比率逻辑](minting-ratio-logic.md)
* [委托](delegation.md)
* [智能合约](smart-contract.md)