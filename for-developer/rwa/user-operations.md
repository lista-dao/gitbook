# 用户操作

用户在 `RWAEarnPool` 上调用方法进行认购和赎回，在 `USDT` 代币上进行一次性 `approve` 操作后——池通过 `transferFrom` 拉取资产，因此第一次 `deposit` 在没有授权的情况下会被回退。需要授权的支出者是 `RWAEarnPool`。

## 流程

1. 用户调用 `RWAEarnPool.deposit`。池从调用者那里拉取 `USDT` **直接到 `RWAAdapter`**，因此它不持有任何存入的本金。它唯一持有的资产余额是通过 `finishWithdraw` 由适配器推回的可提取流动性，等待被认领——不要将池的余额视为 AUM。
2. 池将份额铸造给 `receiver` 参数（不一定是 `msg.sender`）。
3. `RWAAdapter` 进入外部金库流程。
4. 对于赎回，用户首先请求提款，然后在资金可用时进行认领。

## 方法

| 方法 | 描述 |
| --- | --- |
| `deposit(uint256 amount, uint256 shares, address receiver)` | 将份额铸造给 `receiver` 并将资产从 `msg.sender` 转移到适配器。接受 **amount** 或 **shares** 中的一个——传递您想指定的一个，另一个传 `0`；池从第一个推导出第二个。需要注意的两个门槛：一个是 **最低存款**（`minDeposit`，以资产单位表示），低于此值的存款会被回退——小额测试存款将失败；另一个是接收者白名单，当集合为空时是 **开放的**；一旦管理者填充了它，未列出的存款和份额转移将被回退。在假设之前，请阅读 `minDeposit()` 和 `getWhiteList()`。|
| `requestWithdraw(uint256 amount, uint256 shares, address receiver)` | 与 `deposit` 相同的双重 `amount`/`shares` 约定——传递一个，另一个传 `0`。以份额形式收取提款费（转移给费用接收者——读取 `withdrawFeeRate()`，其缩放为 `1e18`，因此 `1e15` 是 0.1%），从 `msg.sender` 中销毁剩余部分，并记录接收者和金额——该金额是从减少的份额数量重新推导的，因此排队的支付低于简单的 `convertToAssets(shares)`。|
| `claimWithdraw` | 在 `RWAEarnPool` 中适配器提供的流动性可用后，将资产转移给接收者。|

## 提款生命周期

提款是异步的。结算阶段运行在 **外部金库的赎回周期** 上，而不是合同强制执行的时间表上，因此没有链上截止日期，未决请求变得可认领。轮询可认领的流动性，而不是假设固定的延迟。利息随着报告进入份额净值，因此份额的价值在持有期间增长，而不是单独支付。