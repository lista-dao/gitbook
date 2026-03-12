# 机器人操作

机器人在 `RWAAdapter` 上运行，以桥接 `RWAEarnPool` 和异步金库结算。

## 存款路径

1. `requestDepositToVault`
2. 等待结算窗口（通常为1-2个工作日）
3. `depositToVault`

## 取款路径

1. `requestWithdrawFromVault`
2. 等待结算窗口（通常为1-2个工作日）
3. `withdrawFromVault`
4. `finishEarnPoolWithdraw` 以资助 `RWAEarnPool` 中的用户请求

## 收益更新

机器人每天调用 `notifyInterest`，因此收益反映在份额净值增长中。

## 方法

| 方法 | 描述 |
| --- | --- |
| `requestDepositToVault` | 调用 AsyncVault 的 `requestDeposit` 并将资金转移到金库认购中。 |
| `depositToVault` | 在异步结算后完成铸造并接收金库份额。 |
| `requestWithdrawFromVault` | 向 AsyncVault 提交批量赎回请求。 |
| `withdrawFromVault` | 在异步结算后完成赎回并接收资金。 |
| `finishEarnPoolWithdraw` | 将赎回的资金转移到 `RWAEarnPool` 以满足待处理的用户提款。 |