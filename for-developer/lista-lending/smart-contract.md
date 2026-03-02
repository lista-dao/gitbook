# 智能合约

Lista Lending 是一个去中心化借贷协议，允许用户借贷各种资产。以下合约管理核心借贷功能、利率模型、金库操作和协议中的奖励分配。

#### BNB 智能链

| 合约                             | 地址                                        |
| ------------------------------ | ------------------------------------------ |
| Moolah                         | 0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C |
| InterestRateModel              | 0xFe7dAe87Ebb11a7BEB9F534BB23267992d9cDe7c |
| VaultAllocator                 | 0x9ECF66f016FCaA853FdA24d223bdb4276E5b524a |
| Liquidator                     | 0x6a87C15598929B2db22cF68a9a0dDE5Bf297a59a |
| LendingRevenueDistributor      | 0xea55952a51ddd771d6eBc45Bd0B512276dd0b866 |
| LendingRewardsDistributor      | 0x665410ee5Ea96aa729589491bADC11E0FE163d29 |
| OracleAdaptor                  | 0x21650E416dC6C89486B2E654c86cC2c36c597b58 |
| Lending TimeLock               | 0x2e2807F88C381Cb0CC55c808a751fC1E3fcCbb85 |
| LendingFeeRecipient            | 0x2E2Eed557FAb1d2E11fEA1E1a23FF8f1b23551f3 |
| MoolahVault(WBNB)              | 0x57134a64B7cD9F9eb72F8255A671F5Bf2fe3E2d0 |
| MoolahVault(USD1)              | 0xfa27f172e0b6ebcEF9c51ABf817E2cb142FbE627 |
| SlisBNBProvider                | 0x33f7A980a246f9B8FEA2254E3065576E127D4D5f |
| BNBProvider (MEV WBNB Vault)   | 0x501bE17CcA1d8a009753Da271D6714C18c1A35c9 |
| BNBProvider (Lista WBNB Vault) | 0x367384C54756a25340c63057D87eA22d47Fd5701 |
| MoolahVaultFactory             | 0x2a0Cb6401FD3c6196750dc6b46702040761D9671 |
| LendingRewardsDistributorV2    | 0x2993E9eA76f5839A20673e1B3cf6666ab5B3aE76 |
| RewardsRouter                  | 0xCb571b4ac0dB9c64B9ADdD2e6f3d1c7A84E5bfF4 |

#### Ethereum

| 合约                                                      | 地址                                        |
| ------------------------------------------------------- | ------------------------------------------ |
| Moolah                                                  | 0xf820fB4680712CD7263a0D3D024D5b5aEA82Fd70 |
| MoolahVault(USD1)                                       | 0x1A9BeE2F5c85F6b4a0221fB1C733246AF5306Ae3 |
| IRM                                                     | 0x8b7d334d243b74D63C4b963893267A0F5240F990 |
| FixedRateIRM                                            | 0x9A7cA2CfB886132B6024789163e770979E4222e1 |
| Liquidator                                              | 0x5Bf5c3B5f5c29dBC647d2557Cc22B00ED29f301C |
| PublicLiquidator                                        | 0x796302e041d1715a8b1f16Fd7d7CBA38bb031DE5 |
| Manager TimeLock                                        | 0x375fdA2Bf66f4CE85EAB29AB6407dCd4a4C428BA |
| Admin TimeLock                                          | 0xa18ae79AEDA3e711E0CD64cfe1Cd06402d400D61 |
| LendingFeeRecipient                                     | 0xd10a024602E042dcb9C19e21682c3b896c8B0d30 |
| <p>PTLinearDiscountOracle<br>(PT-USDe-27NOV2025 / USD1)</p> | 0xb169d2459F51d02d7fC8A39498ec2801652b594c |
| ResilientOracle                                         | 0xA64FE284EB8279B9b63946DD51813b0116099301 |
| BoundValidator                                          | 0x3127b40bd2E591BFa088CA98b92ED9a41dD370a1 |
| ETHProvider                                             | 0xFe34BF713F3C2499026cdFA5af43eb22AA2d1aDb |

智能借贷

| 合约                                                      | 地址                                        |
| ------------------------------------------------------- | ------------------------------------------ |
| StableSwapFactory                                       | 0xDE9c8E1536989d8c3817afDabC37C0fb44cB49b4 |
| StableSwapPoolInfo                                      | 0x73D2623C8497421B55234e6B25fB744625557a1A |
| <p>StableSwapLPCollateral<br>(slisBNB / BNB)</p>        | 0x719f6445cdAC08B84611D0F19d733F57214bcfee |
| <p>StableSwapLPCollateral<br>(solvBTC / BTCB)</p>       | 0x6f4d7532A402D76F552E1F047Ff7e23bFe1A9f03 |
| <p>StableSwapPool<br>(slisBNB / BNB)</p>                | 0x3DcEA6AFBA8af84b25F1f8947058AF1ac4c06131 |
| <p>StableSwapPool<br>(solvBTC / BTCB)</p>               | 0x45409865870f0CBC71c01CC00fF8c0b2DE3EB7D9 |
| <p>StableSwapLP<br>(slisBNB / BNB)</p>                  | 0x1bc8b041c1b89b0109E56f2Eb197B5c09BCC1Cf0 |
| <p>StableSwapLP<br>(solvBTC / BTCB)</p>                 | 0x3F5AF48B4A3Ac89177cA6aFb59E5469F7ef5cE45 |
| <p>SmartProvider<br>(slisBNB / BNB)</p>                 | 0xC3be83DE4b19aFC4F6021Ea5011B75a3542024dE |
| <p>SmartProvider<br>(solvBTC / BTCB)</p>                | 0xA5F53ca56d87d7d4fEC508665D23f29bfb2749DB |