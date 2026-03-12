# RWA

## 概览

Lista DAO RWA 市场为用户提供访问美国短期国库券和公司抵押债券策略的途径。

用户使用 `USDT` 订阅并获得代表池子所有权的份额。资金被分配到底层债券策略中，收益则持续反映在池子价值中。

## 设计详情

用户通过 `RWAEarnPool` 处理存款和提款请求：

* `deposit` 铸造池子份额
* `requestWithdraw` 销毁份额并排队等待提款
* `claimWithdraw` 在流动性返回后接收资产

`RWAEarnPool` 将资金路由到 `RWAAdapter`，后者通过 Centrifuge 的 `AsyncVault` 处理异步金库操作。

机器人定期执行金库的存取款请求确认流程，并调用 `notifyInterest` 来更新份额净资产值（NAV）的增长。

## 内容

* [用户操作](user-operations.md)
* [机器人操作](bot-operations.md)
* [智能合约](smart-contract.md)