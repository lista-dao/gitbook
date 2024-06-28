# Multi-Oracle

## **Intro of Resilient Oracle**

Previously, ListaDAO solely depended on the Binance Oracle, ChainLink Price Feed, RedStone Oracle and API3 Oracle for price data. While this setup was mostly reliable, it presented a single point of failure. Without a backup verification system, incorrect or outdated prices could cause issues like unnecessary liquidations or inflated borrowing amounts.

To mitigate these risks, we have implemented the Resilient Price Oracle, a more advanced system that aggregates data from multiple sources for cross-verification. This new oracle uses an algorithm to compare and validate prices from different sources, ensuring greater accuracy and reliability. And collateral assets on ListaDAO are gradually transitioning to the Resilient Oracle solution.

Moreover, the upgraded oracle infrastructure allows for the real-time addition of new price oracles and offers the flexibility to activate or deactivate oracles for specific tokens as needed.

<figure><img src="../.gitbook/assets/image (57).png" alt=""><figcaption></figcaption></figure>

## Configuration

**BNB Chain**

> Resilient Oracle Address: 0xf3afD82A4071f272F403dC176916141f44E6c750

A. Collaterals pending transit to the Resilient Oracle

| Asset          | Price Feed         | Oracle Address                             | Price Feed                                                                                                                                                                |
| -------------- | ------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BNB            | Chainlink          | 0xf81748d12171de989a5bbf2d76bf10bfbbaec596 | 0x0567f2323251f0aab15c8dfb1967e4e8a7d42aee                                                                                                                                |
| ETH            | Chainlink          | 0x9945e33be177b5fccb90710fee59c548cac8acba | 0xfc3069296a691250ffdf21fe51340fdd415a76ed                                                                                                                                |
| slisBNB(SnBNB) | Binance Oracle     | 0x8ecf78fb59e5a4c26cb218d34db29c4696af89f6 | 0x74346b944db3df2e6e1d52fc5be5c8fc6274b454                                                                                                                                |
| WBETH          | Binance Oracle     | 0x25787055964a8d2a0de4387d6ec9ebc0dc139dd5 | 0xbb339c70136b30389a6ff8af619116c672963768                                                                                                                                |
| BUSD           | Chainlink          | 0x1736759cf80b4c877c0dbc4591b97fc06b0370b8 | 0xcbb98864ef56e9042e7d2efef76141f15731b82f                                                                                                                                |
| ezETH          | Binance Oracle     | 0xE859f3f6EE5532313C33A02283150E201290F45F | 0x763c59a3D23936CD7B73571112744f2cFc2537F8                                                                                                                                |
| weETH          | RedStone/Chainlink | 0xE514851E324B54f152F7D9631ACe1A0a87248b46 | <p>weETH/eETH(RedStone): 0x9b2C948dbA5952A1f5Ab6fA16101c1392b8da1ab <br>*Assume 1:1 for eETH:ETH</p><p>ETH/USD(Chainlink): 0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e</p> |
| STONE          | API3/Chainlink     | 0xDF5A8e190CF63D74a4Ec743253fA26D4C7539Be8 | <p>STONE/ETH(API3): 0xADCc15cE3900A2Fc8544e26fD89897C0484e98Fc</p><p>ETH/USD(ChainLink): 0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e</p>                                   |
| solvBTC        | Binance Oracle     | 0xb7A753f3776282976c1f2b0bcB2fF0d13d48Af85 | 0x2e00b5C80428f94A0e526BAfc526F19eC9c5c37B                                                                                                                                |





B. Collaterals using Resilient Oracle

| Asset | Token                                      | Oracle                                     | Main oracle                                            | Pivot oracle                                                 | Fallback oracle                                        | Boundaries                         |
| ----- | ------------------------------------------ | ------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------ | ---------------------------------- |
| BTCB  | 0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c | 0x2eeDc4723b1ED2f24afCD9c0e3665061bD2D5642 | 0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf (ChainLink) | 0x83968bCa5874D11e02fD80444cDDB431a1DbEc0f (Binance Oracle)  | 0xa51738d1937FFc553d5070f43300B385AA2D9F55 (RedStone)  | Upperbound: 1.01 Lowerbound: 0.99  |



