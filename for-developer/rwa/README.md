# RWA

## 概述

Lista DAO RWA 市场为用户提供访问美国短期国债和 **AAA 级抵押贷款债务 (CLO)** 策略的机会。两个 `RWAEarnPool` 池分别是由 Janus Henderson Treasury Fund (JTRSY) 支持的 `USDT.Treasury` 和由 Janus Henderson AAA CLO Fund (JAAA) 支持的 `USDT.AAA`。一个独立的 RWA 产品，**slisXAUE**（以太坊上的 Tether Gold），不使用 `RWAEarnPool` — 其地址在 [Smart Contract](smart-contract.md) 上。

用户使用 `USDT` 进行认购，并获得代表池所有权的份额。资金分配到基础债券策略中，收益会持续反映在池的价值中。

## 设计细节

用户通过 `RWAEarnPool` 进行存款和提款请求的交互：

* `deposit` 铸造池份额
* `requestWithdraw` 以份额形式收取提款费用，销毁剩余部分，并将提款排队
* `claimWithdraw` 在流动性返回后接收资产

`RWAEarnPool` 将资金路由到 `RWAAdapter`，后者通过 Centrifuge 的 `AsyncVault` 处理异步金库操作。

赎回在外部金库的自身周期内结算，而不是按需结算 — 请参阅 [User Operations](user-operations.md) 了解这对调用者意味着什么。