# 用户操作

用户仅调用 `RWAEarnPool` 方法进行订阅和赎回。

## 流程

1. 用户将 `USDT` 存入 `RWAEarnPool`。
2. 池向用户铸造份额。
3. 资金通过 `RWAAdapter` 路由到外部金库流程。
4. 赎回时，用户首先请求提款，然后在资金可用时领取。

## 方法

| 方法 | 描述 |
| --- | --- |
| `deposit` | 向 `receiver` 铸造份额并从 `msg.sender` 转移资产。 |
| `requestWithdraw` | 从 `msg.sender` 销毁份额，记录请求的接收者和异步支付的金额。 |
| `claimWithdraw` | 在适配器资助的流动性在 `RWAEarnPool` 中可用后，将资产转移给接收者。 |

## 提款生命周期

提款是异步的：

* `requestWithdraw` 创建待处理请求
* 机器人通过适配器完成外部金库的赎回
* 适配器资金返回到赚取池
* 用户调用 `claimWithdraw`