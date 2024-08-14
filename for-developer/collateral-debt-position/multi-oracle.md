# 多Oracle

## **弹性Oracle简介**

以前，ListaDAO仅依赖于Binance Oracle，ChainLink Price Feed，RedStone Oracle和API3 Oracle来获取价格数据。虽然这种设置大多数情况下都是可靠的，但它呈现了一个单点故障。如果没有备份验证系统，错误的或过时的价格可能会导致不必要的清算或通胀的借款金额。

为了减轻这些风险，我们实施了弹性价格Oracle，这是一个更先进的系统，它从多个来源聚合数据进行交叉验证。这个新的oracle使用一种算法来比较和验证来自不同来源的价格，确保更大的准确性和可靠性。ListaDAO上的抵押资产正在逐步过渡到弹性Oracle解决方案。

此外，升级的oracle基础设施允许实时添加新的价格oracle，并提供了根据需要激活或停用特定代币的oracle的灵活性。

<figure><img src="../../.gitbook/assets/image (28).png" alt=""><figcaption></figcaption></figure>

## 配置

**BNB链**

> 弹性Oracle地址：0xf3afD82A4071f272F403dC176916141f44E6c750

A. 正在等待过渡到弹性Oracle的抵押品

| 资产   | 价格源            | Oracle地址                               | 价格源                                                                                                                                                                |
| ------- | ------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BNB     | Chainlink          | 0xf81748d12171de989a5bbf2d76bf10bfbbaec596 | 0x0567f2323251f0aab15c8dfb1967e4e8a7d42aee                                                                                                                                |
| ETH     | Chainlink          | 0x9945e33be177b5fccb90710fee59c548cac8acba | 0xfc3069296a691250ffdf21fe51340fdd415a76ed                                                                                                                                |
| WBETH   | Binance Oracle     | 0x25787055964a8d2a0de4387d6ec9ebc0dc139dd5 | 0xbb339c70136b30389a6ff8af619116c672963768                                                                                                                                |
| BUSD    | Chainlink          | 0x1736759cf80b4c877c0dbc4591b97fc06b0370b8 | 0xcbb98864ef56e9042e7d2efef76141f15731b82f                                                                                                                                |
| ezETH   | Binance Oracle     | 0xE859f3f6EE5532313C33A02283150E201290F45F | 0x763c59a3D23936CD7B73571112744f2cFc2537F8                                                                                                                                |
| weETH   | RedStone/Chainlink | 0xE514851E324B54f152F7D9631ACe1A0a87248b46 | <p>weETH/eETH(RedStone): 0x9b2C948dbA5952A1f5Ab6fA16101c1392b8da1ab <br>*假设eETH:ETH为1:1</p><p>ETH/USD(Chainlink): 0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e</p> |
| STONE   | API3/Chainlink     | 0xDF5A8e190CF63D74a4Ec743253fA26D4C7539Be8 | <p>STONE/ETH(API3): 0xADCc15cE3900A2Fc8544e26fD89897C0484e98Fc</p><p>ETH/USD(ChainLink): 0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e</p>                                   |
| solvBTC | Binance Oracle     | 0xb7A753f3776282976c1f2b0bcB2fF0d13d48Af85 | 0x2e00b5C80428f94A0e526BAfc526F19eC9c5c37B                                                                                                                                |





B. 使用弹性Oracle的抵押品

| 资产                                                                                                                                               | 代币                                       | Oracle/调用者                                                                  | 主要oracle                                                     | 枢轴oracle                                                         | 备用oracle                                                | BoundValidator                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------- |
| BTCB                                                                                                                                                | 0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c  | 0x2eeDc4723b1ED2f24afCD9c0e3665061bD2D5642                                     | 0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf (ChainLink)          | 0x83968bCa5874D11e02fD80444cDDB431a1DbEc0f (Binance Oracle)          | 0xa51738d1937FFc553d5070f43300B385AA2D9F55 (RedStone)          | 上限：1.1 下限：0.99                |
| solvBTC                                                                                                                                             | 0x4aae823a6a0b376De6A78e74eCC5b079d38cBCf7  | 0xb7A753f3776282976c1f2b0bcB2fF0d13d48Af85                                     | 0x2e00b5C80428f94A0e526BAfc526F19eC9c5c37B(Binance Oracle)      | -                                                                    | -                                                              | -                                               |
| BBTC                                                                                                                                                | 0xF5e11df1ebCf78b6b6D26E04FF19cD786a1e81dC  | 0x2Ea16e082cA50eB6017BBFCB967CC7c6E2b8fB5A                                     | 0x58d32eC0158049BED439fD668C99a4949e6881c3 (Binace Oracle)      | -                                                                    | -                                                              | -                                               |
| LisUSD                                                                                                                                              | 0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5  | <p>0x873339A8214657175D9B128dDd57A2f2c23256FA <br>(DynamicDutyCalculator) </p> | 0x871bA946C7FFB1364ca11FE3032F02ad3dd3991E                      | -                                                                    | -                                                              | -                                               |
| slisBNB(SnBNB) \* slisBNB/BNB的汇率来自[StakeManager](https://bscscan.com/address/0x1adB950d8bB3dA4bE104211D5AB038628e477fE6#readProxyContract) | 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c  | 0x8ecf78fb59e5a4c26cb218d34db29c4696af89f6                                     | 0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE (ChainLink: BNB/USD) | 0xC5A35FC58EFDC4B88DDCA51AcACd2E8F593504bE (Binance Oracle: BNB/USD) | 0x8dd2D85C7c28F43F965AE4d9545189C7D022ED0e (RedStone: BNB/USD) | <p>上限：1.1 </p><p>下限：0.99</p> |