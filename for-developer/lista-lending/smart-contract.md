# 智能合约

Lista Lending 是一个去中心化借贷协议，允许用户借贷各种资产。以下合约管理了核心借贷功能、利率模型、金库操作和整个协议的奖励分配。

#### BNB 智能链

| 合约                             | 地址                                      |
| -------------------------------- | ---------------------------------------- |
| Moolah                           | 0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C |
| InterestRateModel                | 0xFe7dAe87Ebb11a7BEB9F534BB23267992d9cDe7c |
| VaultAllocator                   | 0x9ECF66f016FCaA853FdA24d223bdb4276E5b524a |
| Liquidator                       | 0x6a87C15598929B2db22cF68a9a0dDE5Bf297a59a |
| LendingRevenueDistributor        | 0xea55952a51ddd771d6eBc45Bd0B512276dd0b866 |
| LendingRewardsDistributor        | 0x665410ee5Ea96aa729589491bADC11E0FE163d29 |
| OracleAdaptor                    | 0x21650E416dC6C89486B2E654c86cC2c36c597b58 |
| Lending TimeLock                 | 0x2e2807F88C381Cb0CC55c808a751fC1E3fcCbb85 |
| LendingFeeRecipient              | 0x2E2Eed557FAb1d2E11fEA1E1a23FF8f1b23551f3 |
| MoolahVault(WBNB)                | 0x57134a64B7cD9F9eb72F8255A671F5Bf2fe3E2d0 |
| MoolahVault(USD1)                | 0xfa27f172e0b6ebcEF9c51ABf817E2cb142FbE627 |
| SlisBNBProvider                  | 0x33f7A980a246f9B8FEA2254E3065576E127D4D5f |
| BNBProvider (MEV WBNB Vault)     | 0x501bE17CcA1d8a009753Da271D6714C18c1A35c9 |
| BNBProvider (Lista WBNB Vault)   | 0x367384C54756a25340c63057D87eA22d47Fd5701 |
| MoolahVaultFactory               | 0x2a0Cb6401FD3c6196750dc6b46702040761D9671 |
| LendingRewardsDistributorV2      | 0x2993E9eA76f5839A20673e1B3cf6666ab5B3aE76 |
| RewardsRouter                    | 0xCb571b4ac0dB9c64B9ADdD2e6f3d1c7A84E5bfF4 |

#### 以太坊

| 合约                                                         | 地址                                      |
| ------------------------------------------------------------ | ---------------------------------------- |
| Moolah                                                       | 0xf820fB4680712CD7263a0D3D024D5b5aEA82Fd70 |
| MoolahVault(USD1)                                            | 0x1A9BeE2F5c85F6b4a0221fB1C733246AF5306Ae3 |
| IRM                                                          | 0x8b7d334d243b74D63C4b963893267A0F5240F990 |
| FixedRateIRM                                                 | 0x9A7cA2CfB886132B6024789163e770979E4222e1 |
| Liquidator                                                   | 0x5Bf5c3B5f5c29dBC647d2557Cc22B00ED29f301C |
| PublicLiquidator                                             | 0x796302e041d1715a8b1f16Fd7d7CBA38bb031DE5 |
| Manager TimeLock                                             | 0x375fdA2Bf66f4CE85EAB29AB6407dCd4a4C428BA |
| Admin TimeLock                                               | 0xa18ae79AEDA3e711E0CD64cfe1Cd06402d400D61 |
| LendingFeeRecipient                                          | 0xd10a024602E042dcb9C19e21682c3b896c8B0d30 |
| <p>PTLinearDiscountOracle<br>(PT-USDe-27NOV2025 / USD1)</p>  | 0xb169d2459F51d02d7fC8A39498ec2801652b594c |
| ResilientOracle                                              | 0xA64FE284EB8279B9b63946DD51813b0116099301 |
| BoundValidator                                               | 0x3127b40bd2E591BFa088CA98b92ED9a41dD370a1 |
| ETHProvider                                                  | 0xFe34BF713F3C2499026cdFA5af43eb22AA2d1aDb |

### 借贷经纪人 (BSC)

| 合约                                                         | 经纪人                           | LLTV | 额度  | 市场 ID                                                          | 地址                                      |
| ------------------------------------------------------------ | -------------------------------- | ---- | ----- | ---------------------------------------------------------------- | ---------------------------------------- |
| LendingBroker(WBNB/LisUSD)                                   | WBNB/LisUSD                      | 86%  | 100k  | 0x2a679d85b2c64c6e72dc6d98c63f4ddbdae44dda0be4f93a87391192023f733b | 0x6BAF9648cffB7C9c4cB7275000a27b9a7dBD59Bc |
| LendingBroker(slisBNB/LisUSD)                                | slisBNB/LisUSD                   | 86%  | 100k  | 0x078d06a2c852f94c05f291b7288e5120d104ef0e9aa27632df4cb0b6f03cefdc | 0x0cffd57f93190892ac2dB8A01596304268Bc2014 |
| LendingBroker(BTCB/LisUSD)                                   | BTCB/LisUSD                      | 86%  | 100k  | 0xab3827ad876b82fb5af9af8bf3f0bbc8a01e8602389053a71513db72c5f129f7 | 0x30DDB3A48863E4897AaCDD5D202E23270d75BaE1 |
| LendingBroker(PT-sUSDe 09APR2026 Plasma/USD1)                | PT-sUSDe 09APR2026 Plasma/USD1   | 94.5%| 10M   | 0xc1264ae84203b5660478bba5cfe15d9f579aa98402fb073bff65c31040f12f1a | 0xf7c4701e90867f33745F73d5edF2143f0DE03f9d |
| LendingBroker(PT-sUSDe 09APR2026 Plasma/U)                   | PT-sUSDe 09APR2026 Plasma/U      | 94.5%| 5M    | 0x1fed91636b77dab38fd796e21580718aa51e8cf89e442a0268de786adc544596 | 0xFA25B61ac2c31E82DDE626EE2704700646a2C6E3 |
| LendingBroker(PT-sUSDe 09APR2026 Plasma/USDT)                | PT-sUSDe 09APR2026 Plasma/USDT   | 94.5%| 1M    | 0xca1432913a86b41eb10c66de79fe390b877c811a113755e9efb10f38de862450 | 0xa26488154D61f8977153915510564ce47a5072dD |
| LendingBroker(BTCB/USD1)                                     | BTCB/USD1                        | 86%  | 10M   | 0x8de2e1f3e3935024a2667d8203983bdff70a1aee0c91665760e02c257d53032f | 0x41E2a8C0f0e60ec228735a9ACDe704ff73df7981 |
| LendingBroker(slisBNB/USD1)                                  | slisBNB/USD1                     | 86%  | 10M   | 0x95f93825819b67a64610e6adb9ac5f70d5108f5121b9df6551e23a4a7a801b5b | 0xF07b74724cC734079D9D1aa22fF7591B5A32D9d2 |
| LendingBroker(BTCB/U)                                        | BTCB/U                           | 86%  | 100M  | 0x6ef28e9f52ffd5e66b14ba95f3da17b782ce8c4a592218fa32f917ca10f4f054 | 0xFEb7D3Deb6a4CEE8f5da4F618098Ac943440Ff69 |
| LendingBroker(slisBNB/U)                                     | slisBNB/U                        | 86%  | 100M  | 0xaaf06d7c7fd32ac1b478bdf6f068d707ea32982f299b684ef79b1023a51ad3db | 0xDf05774Cd68cE1FBaE01be3181524c904f91d628 |
| LendingBroker(BTCB/USDT)                                     | BTCB/USDT                        | 86%  | 1M    | 0xea00a233473bc0585326eec959623a054798b7543205c5079bab49015a2bf810 | 0xa94d926937f29553913A50feDC365De69162613d |
| LendingBroker(slisBNB/USDT)                                  | slisBNB/USDT                     | 86%  | 1M    | 0x76d7eaeb9d087629c477c51b13914f2489506ec25e7f494aedecee757ad539c8 | 0xf9502555CC9A4D3ea557BB79b825CA10B3A8344F |
| LendingBroker(USDe/U)                                        | USDe/U                           | 91.5%| 75M   | 0x864a59352d12006ab1b194176c30b0e3f538e98baf78e9ee1c0d36e852727f77 | 0x52ee1F685ef41E8D1158E2508dC46561Ca839864 |
| LendingBroker(USDe/USD1)                                     | USDe/USD1                        | 91.5%| 75M   | 0x3aeffa0dbe7aa8e3f3ae23c56f3aaf183af5f3736745a627e741cffb4ebfd6f3 | 0xFDFc9A306084BCa33885b76d23C885dB9E3a6e72 |
| LendingBroker(USDe/USDT)                                     | USDe/USDT                        | 91.5%| 75M   | 0x4fe11b7007a4e09f1f274bfd152b636d7d64b4637df6b645c1516b05590797db | 0x07b72Adbe196E2E83242C3414eee5Fd7E4c0cD74 |
| LendingBroker(sUSDe/U)                                       | sUSDe/U                          | 91.5%| 75M   | 0xd6fe8c8658b8cc7e0f413b0e45e94646cc2ee9255e9500b0db0ee8c2c1499bff | 0x3350fC3c54CE501083a60707823833e67168bb94 |
| LendingBroker(sUSDe/USD1)                                    | sUSDe/USD1                       | 91.5%| 75M   | 0x212d0a36fccb86ff79994d6094271c21149c6a65e97e5ed797429ee56f44ce64 | 0xCA5929B8fF8B1a4B9B8d77DFc5340977BFa425B3 |
| LendingBroker(sUSDe/USDT)                                    | sUSDe/USDT                       | 91.5%| 75M   | 0x86e6bfa9e590d003ce03e34a79a4986120c4ced545ab62db484e43acb049c6a1 | 0x306b7122adb734bD3976f6Fb7dC5E8fEf57528D7 |
| LendingBroker(slisBNB/WBNB)                                  | slisBNB/WBNB                     | 96.5%| 1M    | 0x226935103b730aefad53849e4cf7d92f30083cc417222f395478dabdd9ff3cac | 0x1Fa26015286D1270343d7526C60bd57aB6bE8b54 |

| 合约                             | 地址                                      |
| -------------------------------- | ---------------------------------------- |
| BrokerInterestRelayer (lisUSD)   | 0xcb2590F10728e3ffc725d7ECf88EcFd0d92c9d6a |
| BrokerInterestRelayer (USD1)     | 0x35720fcA79F33E3817479E0c6abFaD38ea1a9DaC |
| BrokerInterestRelayer (U)        | 0x9348923C2f0AD218A8736Ab28cfAe7D93027E73f |
| BrokerInterestRelayer (USDT)     | 0x2A119f506ce71cF427D5ae88540fAec580840587 |
| BrokerInterestRelayer (BNB)      | 0xF2D18e9201d1fE752e3115c029F0f5Ef2Ec2bdbe |
| Rate Calculator                  | 0xF81A3067ACF683B7f2f40a22bCF17c8310be2330 |
| BrokerLiquidator                 | 0x3AA647a1e902833b61E503DbBFbc58992daa4868 |
| LisUSD Vault                     | 0xE03D86e5Baa3509AC4A059A41737bAa8169B6529 |

### 智能借贷

| 合约                                                         | 地址                                      |
| ------------------------------------------------------------ | ---------------------------------------- |
| StableSwapFactory                                            | 0xDE9c8E1536989d8c3817afDabC37C0fb44cB49b4 |
| StableSwapPoolInfo                                           | 0x73D2623C8497421B55234e6B25fB744625557a1A |
| <p>StableSwapLPCollateral<br>(slisBNB / BNB)</p>             | 0x719f6445cdAC08B84611D0F19d733F57214bcfee |
| <p>StableSwapLPCollateral<br>(solvBTC / BTCB)</p>            | 0x6f4d7532A402D76F552E1F047Ff7e23bFe1A9f03 |
| <p>StableSwapPool<br>(slisBNB / BNB)</p>                     | 0x3DcEA6AFBA8af84b25F1f8947058AF1ac4c06131 |
| <p>StableSwapPool<br>(solvBTC / BTCB)</p>                    | 0x45409865870f0CBC71c01CC00fF8c0b2DE3EB7D9 |
| <p>StableSwapLP<br>(slisBNB / BNB)</p>                       | 0x1bc8b041c1b89b0109E56f2Eb197B5c09BCC1Cf0 |
| <p>StableSwapLP<br>(solvBTC / BTCB)</p>                      | 0x3F5AF48B4A3Ac89177cA6aFb59E5469F7ef5cE45 |
| <p>SmartProvider<br>(slisBNB / BNB)</p>                      | 0xC3be83DE4b19aFC4F6021Ea5011B75a3542024dE |
| <p>SmartProvider<br>(solvBTC / BTCB)</p>                     | 0xA5F53ca56d87d7d4fEC508665D23f29bfb2749DB |