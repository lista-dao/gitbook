# 信用贷款

## 概述

Lista Credit 提供固定期限、固定利率的贷款，其规模由信用额度而非抵押品决定。资格和能力在链下评估，并作为 Merkle 根发布在链上。

合约是 `CreditBroker`，一个扩展了信用额度门槛的 `LendingBroker`。

与标准的基于抵押品的 Moolah 市场不同，信用贷款使用 `CreditToken` 作为抵押品的表示：

* `CreditToken` 有 **18 位小数**，因此 $10,000 的额度是 `10000e18`，而不是 `10000`。
* `CreditToken` 除了被列入白名单的 `TRANSFERER`（经纪人和 Moolah）外是不可转让的。请参阅 [贷款生命周期](loan-lifecycle.md)。
* `1 CreditToken = 1 单位信用额度 = 1 美元借款能力`。