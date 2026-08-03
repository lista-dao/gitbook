# 多源预言机

## **弹性预言机简介**

之前，ListaDAO 仅依赖 Atlas Oracle、ChainLink Price Feed、RedStone Oracle 和 API3 Oracle 来获取价格数据。虽然这种设置大多数情况下是可靠的，但它存在单点故障的问题。没有备份验证系统，错误或过时的价格可能会导致不必要的清算或借款金额膨胀的问题。

为了降低这些风险，我们实施了 Resilient Price Oracle，这是一个更先进的系统，它聚合多个来源的数据进行交叉验证。这个新的预言机使用一种算法比较和验证来自不同来源的价格，确保更高的准确性和可靠性。ListaDAO 上的抵押资产正在逐步过渡到 Resilient Oracle 解决方案。

此外，升级后的预言机基础设施允许实时添加新的价格预言机，并提供灵活性，根据需要为特定代币激活或停用预言机。

<figure><img src="../.gitbook/assets/image (68).png" alt=""><figcaption></figcaption></figure>

## 抵押品配置

抵押品定价配置分为两个页面，均由上述的 Resilient Oracle 定价：

* [标准抵押品](multi-oracle-standard.md) — BNB Chain 和 Ethereum Chain 的抵押品。
* [bStock 抵押品](multi-oracle-bstock.md) — 代币化股权（bStock）抵押品。