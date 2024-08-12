# LP pools (33%)

## Eligible LP pools (33%)

Below is a table of all eligible pools that users can provide liquidity into to earn LISTA rewards.&#x20;

| **Protocol**   | **Pool Name**                 |
| -------------- | ----------------------------- |
| Lista DAO      | lisUSD single staking pool    |
| Lista DAO      | veLISTA Holder                |
| Lista DAO      | Borrow lisUSD                 |
| Lista DAO      | slisBNB holder                |
| Pancake Swap   | slisBNB/BNB                   |
| Pancake Swap   | lisUSD/WBNB V3                |
| Pancake Swap   | lisUSD/BTCB V3                |
| Pancake Swap   | lisUSD/ETH V3                 |
| Pancake Swap   | lisUSD/USDT V3                |
| Pancake Swap   | lisUSD/USDT Stable Swap       |
| Thena Finance  | slisBNB/BNB correlated        |
| Thena Finance  | lisUSD/FRAX(stable)           |
| Thena Finance  | lisUSD/USDT(stable)           |
| Thena Finance  | lisUSD/frxETH narrow          |
| Thena Finance  | lisUSD/frxETH wide            |
| Thena Finance  | lisUSD/BNB narrow             |
| Thena Finance  | lisUSD/BNB wide               |
| Thena Finance  | lisUSD/BNB ICHI               |
| Venus Protocol | lisUSD isolated lending pool  |
| Venus Protocol | slisBNB isolated lending pool |

## LP pool reward Conditions

In order to be eligible for LISTA rewards under the LP pools' category (33%), users have to stake their LP tokens on Lista DAO under our [rewards](https://lista.org/rewards) section.

Additionally, certain conditions will have to be met for different type of LPs.

### For all external LPs

The following rules will apply to all liquidity pools:

1. Users have to stake their LP tokens/NFTs on Lista DAO's [rewards](https://lista.org/rewards) section in order to be eligible for LISTA rewards.
2. LISTA rewards are distributed proportionally based on the amount of LP tokens staked by users relative to the total value locked (TVL) of that particular LP.
3. LP rewards are given out every 1 second the moment the LP tokens are staked on Lista DAO's platform.\
   \
   For example, if the total TVL of lisUSD/BNB ICHI wide Pool on ThenaFi is $1,000,000, if user A stakes $10,000 worth of lisUSD/BNB ICHI wide LP tokens under ThenaFi, the user will be eligible for 10,000/1,000,000 = 1% of lisUSD/BNB ICHI wide LP's weekly LISTA rewards.&#x20;

### 1. PancakeSwap V3 pools (External)

For users who are staking PancakeSwap’s V3 (concentrated liquidity) LP NFTs, users have the flexibility to define their preferred price range for providing liquidity. The Annual Percentage Rate (APR) is calculated based on the asset value of the LP NFT. For detailed calculation methods, refer to [this link](https://www.notion.so/2-4-LISTA-Emission-APR-a25606c2417643cfad09172f7112b267?pvs=21).

**To qualify for LISTA rewards:**

1. The price range set by users must differ by at least 10% from the current price of the LP asset.
2. Users simply have to stake their LP tokens/NFTs on Lista DAO's [rewards](https://lista.org/rewards) section.

Example: If a user stakes lisUSD-BNB LP and sets the price range for BNB between 400 and 900 lisUSD per BNB, with the current price of BNB at 600 lisUSD, the acceptable range would be from 540 to 660 lisUSD. Since the user’s specified range of 400 to 900 lisUSD per BNB includes the acceptable range of 540 to 660 lisUSD, they will qualify to earn LISTA rewards.

### 2. V2 pools (External)

For users who are staking V2 LP tokens, users have no choice but to provide liquidity between 0 to infinity. For simplicity's sake, any liquidity pools that are not V3 are considered V2.&#x20;

**To qualify for LISTA rewards:**

1. Users simply have to stake their LP tokens/NFTs on Lista DAO's [rewards](https://lista.org/rewards) section.

## Internal LPs

Users who engage in Lista DAO’s DeFi ecosystem will have the opportunity to earn LISTA rewards. These rewards are allocated as part of the LP pools rewards within our community incentives, constituting 33% of LISTA’s total supply.

### 1. lisUSD borrowers

lisUSD borrowers are also eligible for LISTA rewards. The rewards allocated to each user are directly proportional to the amount of lisUSD borrowed compared to the total value locked (TVL) of all lisUSD borrowed.

**Rules and conditions:**

1. Users have to borrow lisUSD on Lista DAO's [platform](https://lista.org/cdp/loans).
2. Rewards are given out every 1 second the moment lisUSD tokens are borrowed out on Lista DAO's platform.

### 2. lisUSD single staking pool

Users who stake their lisUSD on Lista DAO's single staking pool will also be eligible for LISTA rewards. The rewards distributed to each user are proportionate to the amount of lisUSD staked relative to the total value locked (TVL) of the lisUSD single staking pool.

**Rules and conditions::**

1. Users have to single stake lisUSD on Lista DAO's [platform](https://lista.org/cdp/earn).
2. Rewards are given out every 1 second the moment lisUSD tokens has been staked on Lista DAO's lisUSD single staking pool.

### 3. slisBNB holders

Users who hold slisBNB in their wallets will also be eligible for LISTA rewards. The rewards distributed to each user are proportionate to the daily average amount of slisBNB the user hold relative to the total daily average amount of slisBNB held by all users. The total TVL of slisBNB will exclude all blacklisted addresses.

**Rules and conditions:**

1. All slisBNB holders who are not on the blacklist will receive LISTA emissions. \
   \
   Certain DApps contracts are blacklisted and will not receive LISTA rewards. This is because these DApps contracts fall under another category for LISTA rewards. For example, the slisBNB/BNB pools on ThenaFi and PancakeSwap already falls under the external LP pool category, and therefore, the slisBNB in these pools will not receive LISTA rewards under this category.&#x20;
2. Rewards are given out every 2 weeks (Biweekly). \
   \
   Each user’s slisBNB balance in their wallet is recorded daily in a snapshot. Over a two-week period (from the first Wednesday to the third Wednesday UTC+0), we calculate the average daily amount of slisBNB held by each user. Rewards are then distributed proportionally based on this daily average.\
   \
   For example:\
   1\. Alice holds a daily average of 10 slisBNB over two weeks. \
   2\. There are a total of 99 other slisBNB holders, each holding a daily average of 10 slisBNB over two weeks. \
   3\. The total daily average amount of slisBNB held by all users over these 2 particular weeks, including Alice, is 100x10=1000 slisBNB. \
   4\.  Alice will share 10/1000 which is 1% of the LISTA rewards allocated towards slisBNB holders for these two weeks.&#x20;
