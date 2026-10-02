# slisBNBx

## 概述

`slisBNBx`（前称为 `clisBNB`）是一种不可转让的凭证，它允许您在 Moolah 借贷头寸中保持抵押品的运作，同时仍然有资格参与 Binance Launchpool。

您从未直接铸造它。`SlisBNBxMinter` 会在您的抵押品移动时发行和销毁它，因此供应始终与其背后的抵押品相匹配——请参阅[代币生命周期](token-lifecycle.md)了解五个步骤。

传统 CDP 自身的 `HelioProvider` 是一个独立的、仍然活跃的铸造者，与 `SlisBNBxMinter` 并行（请参阅[代币生命周期](token-lifecycle.md)）——此页面仅记录 Moolah 路径。没有人可以随意铸造 `slisBNBx`——数量总是源自账户的抵押品。`rebalance` 和 `syncDelegatee` 仅限模块使用，但 `syncUserModuleLp` / `bulkSyncUserModules` 是无权限的：任何人都可以强制对任何账户进行重新同步，针对注册的模块。