# 多源预言机

## **弹性预言机简介**

在之前，ListaDAO 仅依赖 Binance Oracle、ChainLink Price Feed、RedStone Oracle 和 API3 Oracle 来获取价格数据。虽然这种设置大多数时候是可靠的，但它存在单点故障的风险。没有备份验证系统的情况下，错误或过时的价格可能导致不必要的清算或借贷金额膨胀等问题。

为了降低这些风险，我们实施了弹性价格预言机，这是一个更先进的系统，它聚合多个来源的数据进行交叉验证。这个新的预言机使用算法比较和验证来自不同来源的价格，确保更高的准确性和可靠性。ListaDAO 上的抵押资产正在逐步过渡到弹性预言机解决方案。

此外，升级后的预言机基础设施允许实时添加新的价格预言机，并提供灵活性，根据需要激活或停用特定代币的预言机。

<figure><img src="../../.gitbook/assets/image (28).png" alt=""><figcaption></figcaption></figure>

## 配置

**BNB Chain**

> 弹性预言机地址：0xf3afD82A4071f272F403dC176916141f44E6c750

A. 正在转移至弹性预言机的抵押品

| 资产   | 价格源         | 预言机地址                             | 价格源                                                                                                                                                                |
| ------- | ------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BNB     | Chainlink          | 0xf81748d12171de989a5bbf2d76bf10bfbbaec596 | 0x0567f2323251f0aab15c8dfb1967e4e8a7d42aee                                                                                                                                |
| ETH     | Chainlink          | 0x9945e33be177b5fccb90710fee59c548cac8acba | 0xfc3069296a691250ffdf21fe51340fdd415a76ed                                                                                                                                |
| WBETH   | Binance Oracle     | 0x25787055964a8d2a0de4387d6ec9ebc0dc139dd5 | 0xbb339c70136b30389a6ff8af619116c672963768                                                                                                                                |
| BUSD    | Chainlink          | 0x1736759cf80b4c877c0dbc4591b97fc06b0370b8 | 0xcbb98864ef56e9042e7d2efef76141f15731b82f                                                                                                                                |
| ezETH   | Binance Oracle     | 0xE859f3f6EE5532313C33A02283150E201290F45F | 0x763c59a3D23936CD7B73571112744f2cFc2537F8                                                                                                                                |
| weETH   | RedStone/Chainlink | 0xE514851E324B54f152F7D9631ACe1A0a87248b46 | <p>weETH/eETH(RedStone): 0x9b2C948dbA5952A1f5Ab6fA16101c1392b8da1ab <br>*假设 eETH:ETH 为 1:1</p><p>ETH/USD(Chainlink): 0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e</p> |
| STONE   | API3/Chainlink     | 0xDF5A8e190CF63D74a4Ec743253fA26D4C7539Be8 | <p>STONE/ETH(API3): 0xADCc15cE3900A2Fc8544e26fD89897C0484e98Fc</p><p>ETH/USD(ChainLink): 0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e</p>                                   |
| solvBTC | Binance Oracle     | 0xb7A753f3776282976c1f2b0bcB2fF0d13d48Af85 | 0x2e00b5C80428f94A0e526BAfc526F19eC9c5c37B                                                                                                                                |

B. 使用弹性预言机的抵押品

| 资产                                                                                                                                               | 代币                                       | 预言机/调用者                                                                  | 主预言机                                                     | 轴心预言机                                                         | 备用预言机                                                | 边界验证器                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------- |
| BTCB                                                                                                                                                | 0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c  | 0x2eeDc4723b1ED2f24afCD9c0e3665061bD2D5642                                     | 0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf (ChainLink)          | 0x83968bCa5874D11e02fD80444cDDB431a1DbEc0f (Binance Oracle)          | 0xa51738d1937FFc553d5070f43300B385AA2D9F55 (RedStone)          | 上限: 1.1 下限: 0.99                |
| solvBTC                                                                                                                                             | 0x4aae823a6a0b376De6A78e74eCC5b079d38cBCf7  | 0xb7A753f3776282976c1f2b0bcB2fF0d13d48Af85                                     | 0x2e00b5C80428f94A0e526BAfc526F19eC9c5c37B(Binance Oracle)      | -                                                                    | -                                                              | -                                               |
| BBTC                                                                                                                                                | 0xF5e11df1ebCf78b6b6D26E04FF19cD786a1e81dC  | 0x2Ea16e082cA50eB6017BBFCB967CC7c6E2b8fB5A                                     | 0x58d32eC0158049BED439fD668C99a4949e6881c3 (Binace Oracle)      | -                                                                    | -                                                              | -                                               |
| LisUSD                                                                                                                                              | 0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5  | <p>0x873339A8214657175D9B128dDd57A2f2c23256FA <br>(DynamicDutyCalculator) </p> | 0x871bA946C7FFB1364ca11FE3032F02ad3dd3991E                      | -                                                                    | -                                                              | -                                               |
| slisBNB(SnBNB) \* slisBNB/BNB 汇率来自 [StakeManager](https://bscscan.com/address/0x1adB950d8bB3dA4bE104211D5AB038628e477fE6#readProxyContract) | 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c  | 0x8ecf78fb59e5a4c26cb218d34db29c4696af89f6                                     | 0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE (ChainLink: BNB/USD) | 0xC5A35FC58EFDC4B88DDCA51AcACd2E8F593504bE (Binance Oracle: BNB/USD) | 0x8dd2D85C7c28F43F965AE4d9545189C7D022ED0e (RedStone: BNB/USD) | 上限:1.1 下限: 0.99 |
| FDUSD                                                                                                                                               | 0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409  | 0xCF95095394A4838a8ed3478FeCF332dDA978EcD3                                     | 0x390180e80058A8499930F0c13963AD3E0d86Bfc9 (ChainLink)          | 0x665E8ad56f13A8451c1fBE3E679D97e76119A959 (Binance Oracle)          | 0xCF95095394A4838a8ed3478FeCF332dDA978EcD3 (ChainLink)         | 上限: 1.01 下限: 0.99             |
| USDT                                                                                                                                                | 0x55d398326f99059ff775485246999027b3197955  | 0xDF2d4C43F45AC225AbFdE4a92F9fF950F517AE63                                     | 0xB97Ad0E74fa7d920791E90258A6E2085088b4320 (ChainLink)          | 0x2ff737E73556a690A5eeD5215279794194edf2fc (Binance Oracle)          | 0xB97Ad0E74fa7d920791E90258A6E2085088b4320 (ChainLink)         | 上限: 1.01 下限: 0.99             |
| wstETH                                                                                                                                              | 0x26c5e01524d2E6280A48F2c50fF6De7e52E9611C  | 0xc9cA2376ae12e22dCb198EACb17E44168024DDd7                                     | 0xE7e734789954e6CffD8C295CBD0916A0A5747D27 (RedStone)           | -                                                                    | -                                                              | -                                               |