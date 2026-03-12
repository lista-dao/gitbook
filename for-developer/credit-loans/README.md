# 信用贷款

## 概览

`CreditBroker` 是一个基于 LendingBroker 模式构建的专门的固定期限、固定利率借贷经纪人，并通过信用限额门控进行了扩展。

它使 Lista DAO 能够提供贷款，其中用户资格和借款能力来自于链下信用评分，通过 Merkle 根在链上表示。

与标准的以抵押品为基础的 Moolah 市场不同，信用贷款使用 `CreditToken` 作为抵押品表示：

* `CreditToken` 是不可转让的。
* `1 CreditToken = 1 单位的信用限额 = 1 USD 借款能力`。

## 内容

* [贷款生命周期](loan-lifecycle.md)
* [坏账处理](bad-debt-handling.md)
* [智能合约](smart-contract.md)