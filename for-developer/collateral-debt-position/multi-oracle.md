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

<table data-full-width="true"><thead><tr><th>Asset</th><th>Price Feed</th><th>Oracle Address</th><th>Price Feed</th></tr></thead><tbody><tr><td>ETH</td><td>Chainlink</td><td>0x9945e33be177b5fccb90710fee59c548cac8acba</td><td>0xfc3069296a691250ffdf21fe51340fdd415a76ed</td></tr><tr><td>WBETH</td><td>Binance Oracle</td><td>0x25787055964a8d2a0de4387d6ec9ebc0dc139dd5</td><td>0xbb339c70136b30389a6ff8af619116c672963768</td></tr><tr><td>BUSD</td><td>Chainlink</td><td>0x1736759cf80b4c877c0dbc4591b97fc06b0370b8</td><td>0xcbb98864ef56e9042e7d2efef76141f15731b82f</td></tr><tr><td>ezETH</td><td>Binance Oracle</td><td>0xE859f3f6EE5532313C33A02283150E201290F45F</td><td>0x763c59a3D23936CD7B73571112744f2cFc2537F8</td></tr><tr><td>weETH</td><td>RedStone/Chainlink</td><td>0xE514851E324B54f152F7D9631ACe1A0a87248b46</td><td><p>weETH/eETH(RedStone): 0x9b2C948dbA5952A1f5Ab6fA16101c1392b8da1ab <br>*Assume 1:1 for eETH:ETH</p><p>ETH/USD(Chainlink): 0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e</p></td></tr><tr><td>STONE</td><td>API3/Chainlink</td><td>0xDF5A8e190CF63D74a4Ec743253fA26D4C7539Be8</td><td><p>STONE/ETH(API3): 0xADCc15cE3900A2Fc8544e26fD89897C0484e98Fc</p><p>ETH/USD(ChainLink): 0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e</p></td></tr><tr><td>solvBTC</td><td>Binance Oracle</td><td>0xb7A753f3776282976c1f2b0bcB2fF0d13d48Af85</td><td>0x2e00b5C80428f94A0e526BAfc526F19eC9c5c37B</td></tr></tbody></table>





B. Collaterals using Resilient Oracle

<table data-full-width="true"><thead><tr><th>Asset</th><th>Token</th><th>Oracle/caller</th><th>Main oracle</th><th>Pivot oracle</th><th>Fallback oracle</th><th>BoundValidator</th></tr></thead><tbody><tr><td>BNB</td><td>0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c</td><td>0xf81748d12171de989a5bbf2d76bf10bfbbaec596</td><td>0x8dd2D85C7c28F43F965AE4d9545189C7D022ED0e (RedStone: BNB/USD)</td><td>0xC5A35FC58EFDC4B88DDCA51AcACd2E8F593504bE (Binance Oracle: BNB/USD)</td><td>0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE (ChainLink: BNB/USD)</td><td>Upper Limit: 1.01 Lower Limit: 0.99</td></tr><tr><td>slisBNB(SnBNB) * Rate of slisBNB/BNB from <a href="https://bscscan.com/address/0x1adB950d8bB3dA4bE104211D5AB038628e477fE6#readProxyContract">StakeManager</a></td><td>0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c</td><td>0x8ecf78fb59e5a4c26cb218d34db29c4696af89f6</td><td>0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE (ChainLink: BNB/USD)</td><td>0xC5A35FC58EFDC4B88DDCA51AcACd2E8F593504bE (Binance Oracle: BNB/USD)</td><td>0x8dd2D85C7c28F43F965AE4d9545189C7D022ED0e (RedStone: BNB/USD)</td><td><p>Upper Limit:1.1 </p><p>Lower Limit: 0.99</p></td></tr><tr><td>BTCB</td><td>0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c</td><td>0x2eeDc4723b1ED2f24afCD9c0e3665061bD2D5642</td><td>0xa51738d1937FFc553d5070f43300B385AA2D9F55 (RedStone)</td><td>0x83968bCa5874D11e02fD80444cDDB431a1DbEc0f (Binance Oracle)</td><td>0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf (ChainLink)</td><td>Upperbound: 1.1 Lowerbound: 0.99 </td></tr><tr><td>solvBTC</td><td>0x4aae823a6a0b376De6A78e74eCC5b079d38cBCf7</td><td>0xb7A753f3776282976c1f2b0bcB2fF0d13d48Af85</td><td>0x2e00b5C80428f94A0e526BAfc526F19eC9c5c37B(Binance Oracle)</td><td>-</td><td>-</td><td>-</td></tr><tr><td>BBTC</td><td>0xF5e11df1ebCf78b6b6D26E04FF19cD786a1e81dC</td><td>0x2Ea16e082cA50eB6017BBFCB967CC7c6E2b8fB5A</td><td>0x58d32eC0158049BED439fD668C99a4949e6881c3 (Binace Oracle)</td><td>-</td><td>-</td><td>-</td></tr><tr><td>LisUSD </td><td>0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5 </td><td>0x873339A8214657175D9B128dDd57A2f2c23256FA <br>(DynamicDutyCalculator) </td><td>0x871bA946C7FFB1364ca11FE3032F02ad3dd3991E </td><td>-</td><td>-</td><td>-</td></tr><tr><td>FDUSD</td><td>0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409</td><td>0xCF95095394A4838a8ed3478FeCF332dDA978EcD3</td><td>0x390180e80058A8499930F0c13963AD3E0d86Bfc9 (ChainLink)</td><td>0x665E8ad56f13A8451c1fBE3E679D97e76119A959 (Binance Oracle)</td><td>0xCF95095394A4838a8ed3478FeCF332dDA978EcD3 (ChainLink)</td><td>Upper Limit: 1.01 Lower Limit: 0.99</td></tr><tr><td>USDT</td><td>0x55d398326f99059ff775485246999027b3197955</td><td>0xDF2d4C43F45AC225AbFdE4a92F9fF950F517AE63</td><td>0xB97Ad0E74fa7d920791E90258A6E2085088b4320 (ChainLink)</td><td>0x2ff737E73556a690A5eeD5215279794194edf2fc (Binance Oracle)</td><td>0xB97Ad0E74fa7d920791E90258A6E2085088b4320 (ChainLink)</td><td>Upper Limit: 1.01 Lower Limit: 0.99</td></tr><tr><td>wstETH</td><td>0x26c5e01524d2E6280A48F2c50fF6De7e52E9611C</td><td>0xc9cA2376ae12e22dCb198EACb17E44168024DDd7</td><td>0xE7e734789954e6CffD8C295CBD0916A0A5747D27 (RedStone)</td><td>-</td><td>-</td><td>-</td></tr></tbody></table>



