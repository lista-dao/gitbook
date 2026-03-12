# 智能合约

## 合约与角色

| 合约 | 角色 |
| --- | --- |
| `CreditBroker` | 核心经纪合约，用于发起、还款、黑名单检查和与Moolah的交互。 |
| `CreditToken` | 不可转让的信用额度代币（`1 token = 1 USD` 借款能力）。 |
| `CreditBrokerInterestRelayer` | 将收集的利息路由到Credit Vault。 |
| `MoolahVault (Credit Vault)` | Credit Loans使用的流动性金库。 |
| `LendingRewardsDistributorV2` | 向符合条件的用户分发`LISTA`排放。 |
| `CreditBrokerInfo` | 面向读取的辅助合约，用于经纪数据查询。 |

## BNB智能链地址

| 合约 | 地址 |
| --- | --- |
| `CreditToken` | [0x1f9831626CE85909794eEaA5C35BF34DB3eB52d8](https://bscscan.com/address/0x1f9831626CE85909794eEaA5C35BF34DB3eB52d8) |
| `CreditBroker` | [0x2A6704D56BDedF4c7564C9534D7fa8D8D204D578](https://bscscan.com/address/0x2A6704D56BDedF4c7564C9534D7fa8D8D204D578) |
| `CreditBrokerInterestRelayer` | [0xBd94C4E931c1a15941B6273A952Af322891adC47](https://bscscan.com/address/0xBd94C4E931c1a15941B6273A952Af322891adC47) |
| `CreditBrokerInfo` | [0x8E58Eb6Eba37ff00BF920Da0DD7Dd63a6576dD63](https://bscscan.com/address/0x8E58Eb6Eba37ff00BF920Da0DD7Dd63a6576dD63#readProxyContract) |
| `LendingRewardsDistributorV2` | [0xC003fb7485ec58a24F26abcAf7646707AbC4886C](https://bscscan.com/address/0xC003fb7485ec58a24F26abcAf7646707AbC4886C) |
| `MoolahVault (Credit Vault)` | [0x4E82Fa869F8D05c8F94900d4652Fdb82f3C7A004](https://bscscan.com/address/0x4E82Fa869F8D05c8F94900d4652Fdb82f3C7A004#readProxyContract) |