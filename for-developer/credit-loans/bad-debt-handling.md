# 坏账处理

违约是在链上识别的，而不是按面值处理的，因此损失落在注销时持有金库股份的人身上。

注销是**由 Lista 驱动的，而不是由您驱动的**。一个 `BOT` 调用 `CreditBroker.liquidate(borrower, posId)`，这会调用 `Moolah.liquidateBrokerPosition` —— 而这又需要 `msg.sender == brokers[id]`，因此无法从第三方账户访问。(`CreditBroker` 还携带一个 `liquidate(Id, address)` 重载，总是返回 `not supported`；它仅存在以满足接口要求)。该调用在同一交易中减少了市场的未偿还借款和金库的总资产，因此股价立即按比例下降。

这对存款人的意义是：

* 没有保险分层和首损吸收者——当前股东承担全部损失。
* 这种风险的补偿是，表现良好的贷款支付良好：在预付利息条款中，无论借款人多早还款，他们都欠下**整个期限**的利息，而逾期头寸则需支付额外罚款。

由于您无法触发它，集成问题是如何**检测**它：监控经纪人的清算事件——请参阅 [Loan Lifecycle](loan-lifecycle.md) 了解事件集。