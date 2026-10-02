# 清算（服务）

Lista 运营其自己的清算守护程序。其调度、阈值和重试行为是内部的，并未在此处记录。

第三方清算者不需要这些信息。您需要的是：

## 资格

当一个头寸的贷款价值比超过市场的 `lltv` 时，该头寸是可清算的：

```
borrowed  = convertBorrowSharesToAssets(borrowShares, totalBorrowAssets, totalBorrowShares)
maxBorrow = collateral × price / 1e36 × lltv / 1e18      // price = 以贷款资产计价的抵押品价格，1e36 缩放；lltv 是 1e18 缩放
isHealthy = maxBorrow ≥ borrowed
```

没有债务的头寸始终是健康的。在一个经纪市场中，借款人的债务被经纪人的总债务（Moolah 本金加上在经纪人处累积的利息）所取代，而抵押品仍以普通市场价格计价。

使用合约使用的相同预言机和市场参数，并匹配其舍入方式——`maxBorrow` 向下取整，`borrowed` 向上取整，均对协议有利。确切的缩放因子、`isHealthy` 视图及其注意事项，以及清算价格公式在[消费预言机价格](../multi-oracle/consuming-prices.md)中。

在执行时重新读取预言机和头寸状态：Moolah 在您的交易落地时累积利息并重新检查健康状况，如果头寸已恢复，则以字符串 `"position is healthy"` 进行回滚——Moolah 的健康和输入检查使用 `require` 字符串，而不是类型化错误。（继承的重入保护是例外：它回滚一个类型化的 `ReentrancyGuardReentrantCall()`——参见[事件与回调](../lista-lending/events-and-callbacks.md)。）

## 寻找候选者

* `GET /api/moolah/redPositions` — 单个市场上的可清算头寸。**从这里开始开放市场**，这是常见情况：从 `/api/moolah/allMarkets` 枚举市场并展开。
* `GET /api/liquidation/zone/closeToLiquidate` — 接近阈值的头寸。
* `GET /api/liquidation/zone/list` — 每个市场的**借款人**白名单及每个账户的最新头寸快照。它**不**进行健康测试，因此请自行评估资格，并且它仅在*受限*市场上找到候选者。
* `GET /api/liquidation/zone/history` — 已结算的清算。

参数和响应字段在[头寸、清算与发放](lending-api/position-liquidation-emission.md)中。索引数据可能滞后；将其视为候选者提要，并在提交前在链上确认。

## 执行

清算通过 `PublicLiquidator` 合约执行。它没有角色门槛，但可达性是**每个市场**的——一个水下头寸不一定由您清算，并且有自筹资金和闪电交换路径。入口点、大小、资格门槛和回滚参考在[清算者集成](../lista-lending/liquidator-integration.md)中。

Lista 的守护程序与其他人竞争相同的公共路径。运行您自己的清算者不需要，也不会收到其配置的任何信息。

有关清算的产品级解释，请参见[清算](../../introduction/lista-lending/liquidation/README.md)。