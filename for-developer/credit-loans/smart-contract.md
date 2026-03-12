# Smart Contract

## Contracts and Roles

| Contract | Role |
| --- | --- |
| `CreditBroker` | Core broker contract for origination, repayment, blacklist checks, and Moolah interaction. |
| `CreditToken` | Non-transferable credit-limit token (`1 token = 1 USD` borrow capacity). |
| `CreditBrokerInterestRelayer` | Routes collected interest to Credit Vault. |
| `MoolahVault (Credit Vault)` | Liquidity vault used by Credit Loans. |
| `LendingRewardsDistributorV2` | Distributes `LISTA` emissions to eligible users. |
| `CreditBrokerInfo` | Read-oriented helper contract for broker data queries. |

## BNB Smart Chain Addresses

| Contract | Address |
| --- | --- |
| `CreditToken` | [0x1f9831626CE85909794eEaA5C35BF34DB3eB52d8](https://bscscan.com/address/0x1f9831626CE85909794eEaA5C35BF34DB3eB52d8) |
| `CreditBroker` | [0x2A6704D56BDedF4c7564C9534D7fa8D8D204D578](https://bscscan.com/address/0x2A6704D56BDedF4c7564C9534D7fa8D8D204D578) |
| `CreditBrokerInterestRelayer` | [0xBd94C4E931c1a15941B6273A952Af322891adC47](https://bscscan.com/address/0xBd94C4E931c1a15941B6273A952Af322891adC47) |
| `CreditBrokerInfo` | [0x8E58Eb6Eba37ff00BF920Da0DD7Dd63a6576dD63](https://bscscan.com/address/0x8E58Eb6Eba37ff00BF920Da0DD7Dd63a6576dD63#readProxyContract) |
| `LendingRewardsDistributorV2` | [0xC003fb7485ec58a24F26abcAf7646707AbC4886C](https://bscscan.com/address/0xC003fb7485ec58a24F26abcAf7646707AbC4886C) |
| `MoolahVault (Credit Vault)` | [0x4E82Fa869F8D05c8F94900d4652Fdb82f3C7A004](https://bscscan.com/address/0x4E82Fa869F8D05c8F94900d4652Fdb82f3C7A004#readProxyContract) |
