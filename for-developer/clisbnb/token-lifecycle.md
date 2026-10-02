# Token Lifecycle

`slisBNBx` 是由 `SlisBNBxMinter` 在 Moolah 中因抵押品移动而铸造和销毁的。没有用户可调用的铸造功能。然而，`SlisBNBxMinter` 并不是唯一的活跃铸造者，传统的 CDP 的 `HelioProvider` 仍然拥有铸造权；请参阅下面的说明。

| 步骤 | 您的操作 | 链上发生的事情 |
| --- | --- | --- |
| 1. 存款 | 通过其提供者向 Moolah 提供 `slisBNB` 或 `slisBNB/BNB` LP 头寸。 | 抵押品被记录，提供者调用 `SlisBNBxMinter`。 |
| 2. 铸造 | — | 铸造者根据抵押品的 BNB 等值价值推导出 `slisBNBx` 数量，并将其铸造给您或您的代理人。 |
| 3. 持有 | 持有证书。它是不可转让的。 | 持有人有资格参与 Binance Launchpool。 |
| 4. 提取 | 从 Moolah 提取全部或部分抵押品。 | 提供者调用铸造者进行销毁。 |
| 5. 销毁 | — | 铸造者销毁与移除的抵押品相匹配的 `slisBNBx` 份额，因此供应始终完全由抵押品支持。 |

计划围绕三个后果：

* **部分提取仅销毁比例数量** — 证书的其余部分仍然被铸造。剩余余额是否仍然符合特定 Launchpool 的资格由该活动的自身规则决定，而不是由此合约决定。
* **您不能持有没有抵押品支持的 `slisBNBx`。** 任何移除抵押品的路径都会移除证书。
* **此生命周期是 Moolah 集成。** 传统的 CDP 是通过其自身的 `HelioProvider` 的一个独立的、仍然活跃的铸造/销毁路径 — 这不是本页面记录的内容。有关这两条路径如何不同，请参阅 [Delegation](delegation.md)。

有关将铸造指向另一个地址的信息，请参阅 [Delegation](delegation.md)，有关数量如何推导的信息，请参阅 [Minting Ratio Logic](minting-ratio-logic.md)。