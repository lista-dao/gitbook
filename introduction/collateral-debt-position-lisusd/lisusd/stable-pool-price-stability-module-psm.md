# 稳定池 - 价格稳定模块 (PSM)

## 价格稳定模块 (PSM)

锚定稳定模块（PSM）是一个关键组件，旨在通过促进中心化稳定币和lisUSD之间的无缝转换，维护lisUSD的稳定性和可用性。以下是其主要功能的分解：

### 1. 转换费用结构[​](https://helio.money/docs/price-stability#hays-price-stability-mechanism) <a href="#hays-price-stability-mechanism" id="hays-price-stability-mechanism"></a>

随着PSM的推出，用户将能够使用USDT或USDC以1:1的比例铸造lisUSD，且铸币费为0%。

注意：0%费用不是永久的。将来，如果lisUSD交易溢价，可能会引入铸币费，费用调整将以0.01%的精确增量进行。

A) 费用精度：1基点（0.01%）

B) 转换费将以lisUSD收取

### 2. PSM铸币上限

锚定稳定模块（PSM）在启动时的上限为500万lisUSD，支持最多500万中心化稳定币的转换。

A) 一旦达到上限，将进行调整以适应额外的转换。

B) 在启动前，将预先铸造500万lisUSD并存入PSM合约。

### 3. 兑换中心化稳定币

对于希望将lisUSD转换回中心化稳定币的用户，将适用每日限额500,000 lisUSD，受到金库中可用储备的限制。

这些转换将收取2%的费用，以鼓励用户直接在PancakeSwap上将lisUSD换成其他稳定币，以获得可能更好的汇率。

通过PSM获得的中心化稳定币将在维持lisUSD稳定性中发挥关键作用，确保其价值紧密锚定于1美元。

## lisUSD稳定池

通过使用我们的PSM模块，在我们的[赚取](https://lista.org/earn?utm_source=gitbook\&utm_medium=article\&utm_campaign=stable-pool-price-stability-module-psm)部分创建了稳定池：

用户现在可以存入他们的USDT，享受来自LISTA代币发行以及lisUSD储蓄率的收益。通过PSM，存入USDT稳定池的USDT将以1:1的比例换成lisUSD，并存入lisUSD稳定池。

关于lisUSD储蓄率（LSR）的更多信息可以在下一节[这里](lisusd-saving-rate-lsr.md)找到。<br>
