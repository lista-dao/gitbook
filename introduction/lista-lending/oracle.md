# Oracle

### Oracle是什么？

Oracle是一种智能合约，它向区块链应用程序提供外部数据，尤其是价格信息。对于像Lista Lending这样的借贷协议，大多数oracle提供具有8位小数精度的价格数据。例如，如果1 BTC的价格是80,000，它将返回80,000 * 100,000,000 = 8,000,000,000,000。

### 借贷市场中的Oracle

借贷市场依赖于oracle来：

* 确定抵押品和贷款资产的价值
* 计算借款能力
* 当头寸变得低于抵押时触发清算
* 启用准确的利率计算

### Lista Lending中的Oracle

Lista Lending市场中使用的所有oracle都实现了IOracle接口，该接口有一个标准化的函数：

`function peek(address asset) external view returns (uint256);`

此函数返回1个抵押代币以usd报价的价格。\
\
还有一个函数：

`function getPrice(MarketParams calldata marketParams) external view returns (uint256);`

此函数返回1单位抵押代币以贷款代币报价的价格，适当调整以考虑代币之间的小数差异。

### 与Lista Lending兼容的Oracle类型

可以在Lista Lending市场中使用各种oracle实现：

1. 价格提供Oracle：利用外部价格提供（如Chainlink, Redstone, API3, Pyth, Chronicle）来计算资产汇率。
2. 汇率Oracle：专为包装代币或重定基代币设计，其中汇率是确定性的（如wstETH/stETH）。
3. 固定价格Oracle：用于具有已知或预定义汇率的资产，例如与同一价值挂钩的稳定币。

### Lista Lending市场中的关键Oracle特性

* 不可变：市场部署后，其oracle地址不能修改
* 独立：每个oracle独立运行，可以使用不同的定价来源
* 灵活实现：策展人可以利用各种数据来源，同时保持一致的接口

### 市场策展人选择Oracle

市场策展人（非Lista）负责为其市场选择和实施合适的oracle。每个Lista Lending市场在市场参数中指定其oracle：

CollateralAsset/LoanAsset（LLTV%，OracleAddress，IRMAddress）

### Oracle安全考虑

Oracle的安全性对Lista Lending市场的安全至关重要。用户应：

* 验证他们互动的任何市场的oracle实现
* 了解正在使用的价格来源
* 考虑潜在的操纵向量或故障模式

Lista Lending市场的不可变性意味着oracle选择是一个永久的决定，定义了市场的风险概况。

### Oracle社区部分

一些社区成员贡献了可以插入到oracle中的适配器。

* Lista或仓库的作者不能对使用此信息可能导致的任何损失或损害负责。
* 用户建议进行自己的研究，并在应用任何策略或方法时谨慎行事。