# Oracle

### Oracle是什么？

Oracle是一种智能合约，它为区块链应用程序提供外部数据，特别是价格信息。在像Lista Lending这样的借贷协议中，Oracle应提供具有8位小数精度的价格数据。例如，如果1 BTC的价格是80,000，它将返回80,000 * 100,000,000 = 8,000,000,000,000。

### 借贷市场中的Oracle

传统的借贷协议依赖于Oracle来：

* 确定抵押资产的价值
* 计算借款能力
* 当头寸变得抵押不足时触发清算
* 启用准确的利率计算

### Lista Lending中的Oracle实现

Lista Lending市场中使用的所有Oracle都实现了IOracle接口，该接口有一个标准化的函数：

`function peek(address asset) external view returns (uint256);`

这个函数返回1个抵押代币的价格，以usd报价。

还有一个函数：

`function getPrice(MarketParams calldata marketParams) external view returns (uint256);`

这个函数返回1单位抵押代币的价格，以贷款代币报价，并适当调整以考虑代币之间的小数差异。

### 与Lista Lending兼容的Oracle类型

可以在Lista Lending市场中使用各种Oracle实现：

1. 价格馈送Oracle：使用外部价格馈送（如Chainlink, Redstone, API3, Pyth, Chronicle）来计算资产汇率。
2. 汇率Oracle：专为包装代币或重定基代币设计，其中汇率是确定性的（如wstETH/stETH）。
3. 固定价格Oracle：用于具有已知或预定义汇率的资产，如与同一价值挂钩的稳定币。

### Lista Lending市场中的关键Oracle特性

* 不可变：一旦市场部署，其Oracle地址不能被修改
* 独立：每个Oracle独立运行，可以使用不同的定价来源
* 灵活实施：策展人可以利用各种数据来源，同时保持一致的接口

### 市场策展人选择Oracle

市场策展人（非Lista Lending）负责为其市场选择和实施适当的Oracle。每个Lista Lending市场在市场参数中指定其Oracle：

CollateralAsset/LoanAsset (LLTV%, OracleAddress, IRMAddress)

### Oracle安全考虑

Oracle的安全性对Lista Lending市场的安全至关重要。用户应：

* 验证他们互动的任何市场的Oracle实现
* 了解正在使用的价格来源
* 考虑潜在的操纵向量或故障模式

Lista Lending市场的不可变性意味着Oracle选择是一个永久的决定，定义了市场的风险概况。

### Oracle社区部分

一些社区成员贡献了可以插入Oracle的适配器。

* Morpho协会或仓库的作者不对使用此信息可能导致的任何损失或损害承担责任。
* 用户建议进行自己的研究，并在应用此处描述的任何策略或方法时谨慎行事。