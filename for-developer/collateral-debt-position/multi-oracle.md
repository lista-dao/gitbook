# Multi-Oracle

## **Intro of Resilient Oracle**

Previously, ListaDAO solely depended on the Binance Oracle, ChainLink Price Feed, RedStone Oracle and API3 Oracle for price data. While this setup was mostly reliable, it presented a single point of failure. Without a backup verification system, incorrect or outdated prices could cause issues like unnecessary liquidations or inflated borrowing amounts.

To mitigate these risks, we have implemented the Resilient Price Oracle, a more advanced system that aggregates data from multiple sources for cross-verification. This new oracle uses an algorithm to compare and validate prices from different sources, ensuring greater accuracy and reliability. And collateral assets on ListaDAO are gradually transitioning to the Resilient Oracle solution.

Moreover, the upgraded oracle infrastructure allows for the real-time addition of new price oracles and offers the flexibility to activate or deactivate oracles for specific tokens as needed.

<figure><img src="../../.gitbook/assets/image (28).png" alt=""><figcaption></figcaption></figure>

## Configuration

**BNB Chain**

> Resilient Oracle Address: 0xf3afD82A4071f272F403dC176916141f44E6c750

A. Collaterals pending transit to the Resilient Oracle

| Asset   | Price Feed         | Oracle Address                             | Price Feed                                                                                                                                                                |
| ------- | ------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ETH     | Chainlink          | 0x9945e33be177b5fccb90710fee59c548cac8acba | 0xfc3069296a691250ffdf21fe51340fdd415a76ed                                                                                                                                |
| WBETH   | Binance Oracle     | 0x25787055964a8d2a0de4387d6ec9ebc0dc139dd5 | 0xbb339c70136b30389a6ff8af619116c672963768                                                                                                                                |
| BUSD    | Chainlink          | 0x1736759cf80b4c877c0dbc4591b97fc06b0370b8 | 0xcbb98864ef56e9042e7d2efef76141f15731b82f                                                                                                                                |
| ezETH   | Binance Oracle     | 0xE859f3f6EE5532313C33A02283150E201290F45F | 0x763c59a3D23936CD7B73571112744f2cFc2537F8                                                                                                                                |
| weETH   | RedStone/Chainlink | 0xE514851E324B54f152F7D9631ACe1A0a87248b46 | <p>weETH/eETH(RedStone): 0x9b2C948dbA5952A1f5Ab6fA16101c1392b8da1ab <br>*Assume 1:1 for eETH:ETH</p><p>ETH/USD(Chainlink): 0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e</p> |
| STONE   | API3/Chainlink     | 0xDF5A8e190CF63D74a4Ec743253fA26D4C7539Be8 | <p>STONE/ETH(API3): 0xADCc15cE3900A2Fc8544e26fD89897C0484e98Fc</p><p>ETH/USD(ChainLink): 0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e</p>                                   |
| solvBTC | Binance Oracle     | 0xb7A753f3776282976c1f2b0bcB2fF0d13d48Af85 | 0x2e00b5C80428f94A0e526BAfc526F19eC9c5c37B                                                                                                                                |





B. Collaterals using Resilient Oracle

| Asset                                                                                                                                               | Token                                       | Oracle/caller                                                                  | Main oracle                                                     | Pivot oracle                                                         | Fallback oracle                                                 | BoundValidator                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| BNB                                                                                                                                                 | 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c  | 0xf81748d12171de989a5bbf2d76bf10bfbbaec596                                     | 0x8dd2D85C7c28F43F965AE4d9545189C7D022ED0e (RedStone: BNB/USD)  | 0xC5A35FC58EFDC4B88DDCA51AcACd2E8F593504bE (Binance Oracle: BNB/USD) | 0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE (ChainLink: BNB/USD) | Upper Limit: 1.01 Lower Limit: 0.99             |
| slisBNB(SnBNB) \* Rate of slisBNB/BNB from [StakeManager](https://bscscan.com/address/0x1adB950d8bB3dA4bE104211D5AB038628e477fE6#readProxyContract) | 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c  | 0x8ecf78fb59e5a4c26cb218d34db29c4696af89f6                                     | 0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE (ChainLink: BNB/USD) | 0xC5A35FC58EFDC4B88DDCA51AcACd2E8F593504bE (Binance Oracle: BNB/USD) | 0x8dd2D85C7c28F43F965AE4d9545189C7D022ED0e (RedStone: BNB/USD)  | <p>Upper Limit:1.1 </p><p>Lower Limit: 0.99</p> |
| BTCB                                                                                                                                                | 0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c  | 0x2eeDc4723b1ED2f24afCD9c0e3665061bD2D5642                                     | 0xa51738d1937FFc553d5070f43300B385AA2D9F55 (RedStone)           | 0x83968bCa5874D11e02fD80444cDDB431a1DbEc0f (Binance Oracle)          | 0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf (ChainLink)          | Upperbound: 1.1 Lowerbound: 0.99                |
| solvBTC                                                                                                                                             | 0x4aae823a6a0b376De6A78e74eCC5b079d38cBCf7  | 0xb7A753f3776282976c1f2b0bcB2fF0d13d48Af85                                     | 0x2e00b5C80428f94A0e526BAfc526F19eC9c5c37B(Binance Oracle)      | -                                                                    | -                                                               | -                                               |
| BBTC                                                                                                                                                | 0xF5e11df1ebCf78b6b6D26E04FF19cD786a1e81dC  | 0x2Ea16e082cA50eB6017BBFCB967CC7c6E2b8fB5A                                     | 0x58d32eC0158049BED439fD668C99a4949e6881c3 (Binace Oracle)      | -                                                                    | -                                                               | -                                               |
| LisUSD                                                                                                                                              | 0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5  | <p>0x873339A8214657175D9B128dDd57A2f2c23256FA <br>(DynamicDutyCalculator) </p> | 0x871bA946C7FFB1364ca11FE3032F02ad3dd3991E                      | -                                                                    | -                                                               | -                                               |
| FDUSD                                                                                                                                               | 0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409  | 0xCF95095394A4838a8ed3478FeCF332dDA978EcD3                                     | 0x390180e80058A8499930F0c13963AD3E0d86Bfc9 (ChainLink)          | 0x665E8ad56f13A8451c1fBE3E679D97e76119A959 (Binance Oracle)          | 0xCF95095394A4838a8ed3478FeCF332dDA978EcD3 (ChainLink)          | Upper Limit: 1.01 Lower Limit: 0.99             |
| USDT                                                                                                                                                | 0x55d398326f99059ff775485246999027b3197955  | 0xDF2d4C43F45AC225AbFdE4a92F9fF950F517AE63                                     | 0xB97Ad0E74fa7d920791E90258A6E2085088b4320 (ChainLink)          | 0x2ff737E73556a690A5eeD5215279794194edf2fc (Binance Oracle)          | 0xB97Ad0E74fa7d920791E90258A6E2085088b4320 (ChainLink)          | Upper Limit: 1.01 Lower Limit: 0.99             |
| wstETH                                                                                                                                              | 0x26c5e01524d2E6280A48F2c50fF6De7e52E9611C  | 0xc9cA2376ae12e22dCb198EACb17E44168024DDd7                                     | 0xE7e734789954e6CffD8C295CBD0916A0A5747D27 (RedStone)           | -                                                                    | -                                                               | -                                               |



