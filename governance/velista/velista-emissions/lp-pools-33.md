# LP池（33%）

## 合格的LP池（33%）

以下是用户可以提供流动性以赚取LISTA奖励的所有合格池的表格。

| **协议**   | **池名称**                 |
| -------------- | ----------------------------- |
| Lista DAO      | lisUSD单一质押池    |
| Lista DAO      | veLISTA持有者                |
| Lista DAO      | 借用lisUSD                 |
| Lista DAO      | slisBNB持有者                |
| Pancake Swap   | slisBNB/BNB                   |
| Pancake Swap   | lisUSD/WBNB V3                |
| Pancake Swap   | lisUSD/BTCB V3                |
| Pancake Swap   | lisUSD/ETH V3                 |
| Pancake Swap   | lisUSD/USDT V3                |
| Pancake Swap   | lisUSD/USDT Stable Swap       |
| Thena Finance  | slisBNB/BNB相关联        |
| Thena Finance  | lisUSD/FRAX(稳定)           |
| Thena Finance  | lisUSD/USDT(稳定)           |
| Thena Finance  | lisUSD/frxETH窄          |
| Thena Finance  | lisUSD/frxETH宽            |
| Thena Finance  | lisUSD/BNB窄             |
| Thena Finance  | lisUSD/BNB宽               |
| Thena Finance  | lisUSD/BNB ICHI               |
| Venus Protocol | lisUSD隔离借贷池  |
| Venus Protocol | slisBNB隔离借贷池 |

## LP池奖励条件

为了在LP池类别（33%）下有资格获得LISTA奖励，用户必须在我们的[奖励](https://lista.org/rewards)部分下的Lista DAO上质押他们的LP代币。

此外，不同类型的LP需要满足一些条件。

### 对所有外部LP

以下规则适用于所有流动性池：

1. 用户必须在Lista DAO的[奖励](https://lista.org/rewards)部分质押他们的LP代币/NFT，以有资格获得LISTA奖励。
2. LISTA奖励是根据用户质押的LP代币数量相对于该特定LP的总锁定价值（TVL）分配的。
3. LP奖励在LP代币在Lista DAO平台上质押的那一刻开始每1秒发放一次。

例如，如果ThenaFi上的lisUSD/BNB ICHI宽池的总TVL为$1,000,000，如果用户A在ThenaFi下质押价值$10,000的lisUSD/BNB ICHI宽LP代币，用户将有资格获得10,000/1,000,000 = 1%的lisUSD/BNB ICHI宽LP的每周LISTA奖励。

### 1. PancakeSwap V3池（外部）

对于质押PancakeSwap的V3（集中流动性）LP NFT的用户，用户可以灵活地定义他们提供流动性的首选价格范围。年化百分比率（APR）是根据LP NFT的资产价值计算的。有关详细的计算方法，请参考[此链接](https://www.notion.so/2-4-LISTA-Emission-APR-a25606c2417643cfad09172f7112b267?pvs=21)。

**要获得LISTA奖励，必须满足以下条件：**

1. 用户设置的价格范围必须至少与LP资产的当前价格相差10%。
2. 用户只需在Lista DAO的[奖励](https://lista.org/rewards)部分质押他们的LP代币/NFT。

示例：如果用户质押lisUSD-BNB LP并将BNB的价格范围设置在每BNB 400到900 lisUSD之间，而BNB的当前价格为600 lisUSD，那么可接受的范围将是从540到660 lisUSD。由于用户指定的每BNB 400到900 lisUSD的范围包括540到660 lisUSD的可接受范围，他们将有资格获得LISTA奖励。

### 2. V2池（外部）

对于质押V2 LP代币的用户，用户别无选择，只能在0到无穷大之间提供流动性。为了简单起见，任何不是V3的流动性池都被视为V2。

**要获得LISTA奖励，必须满足以下条件：**

1. 用户只需在Lista DAO的[奖励](https://lista.org/rewards)部分质押他们的LP代币/NFT。

## 内部LP

参与Lista DAO的DeFi生态系统的用户将有机会获得LISTA奖励。这些奖励作为我们社区激励中的LP池奖励的一部分分配，占LISTA总供应量的33%。

### 1. lisUSD借款人

lisUSD借款人也有资格获得LISTA奖励。分配给每个用户的奖励与借用的lisUSD金额相比，与所有借用的lisUSD的总价值锁定（TVL）直接成比例。

**规则和条件：**

1. 用户必须在Lista DAO的[平台](https://lista.org/cdp/loans)上借用lisUSD。
2. 奖励在lisUSD代币在Lista DAO平台上被借出的那一刻开始每1秒发放一次。

### 2. lisUSD单一质押池

在Lista DAO的单一质押池中质押他们的lisUSD的用户也将有资格获得LISTA奖励。分配给每个用户的奖励与质押的lisUSD金额相比，与lisUSD单一质押池的总价值锁定（TVL）成比例。

**规则和条件：**

1. 用户必须在Lista DAO的[平台](https://lista.org/cdp/earn)上单独质押lisUSD。
2. 奖励在lisUSD代币在Lista DAO的lisUSD单一质押池中被质押的那一刻开始每1秒发放一次。

### 3. slisBNB持有者

在他们的钱包中持有slisBNB的用户也将有资格获得LISTA奖励。分配给每个用户的奖励与用户持有的slisBNB的日均金额相比，与所有用户持有的slisBNB的总日均金额成比例。slisBNB的总TVL将排除所有被列入黑名单的地址。

**规则和条件：**

1. 所有不在黑名单上的slisBNB持有者都将获得LISTA发放。\
   \
   某些DApps合约被列入黑名单，将不会获得LISTA奖励。这是因为这些DApps合约已经在LISTA奖励的另一个类别下。例如，ThenaFi和PancakeSwap上的slisBNB/BNB池已经在外部LP池类别下，因此，这些池中的slisBNB将不会在此类别下获得LISTA奖励。
2. 奖励每2周（双周）发放一次。\
   \
   每个用户的钱包中的slisBNB余额在每日快照中被记录。在两周的时间内（从第一个星期三到第三个星期三UTC+0），我们计算每个用户持有的slisBNB的平均日均数量。然后根据这个日均数量按比例分配奖励。\
   \
   例如：\
   1\. Alice在两周内每天平均持有10 slisBNB。\
   2\. 共有99个其他slisBNB持有者，每个人在两周内每天平均持有10 slisBNB。\
   3\. 在这两个特定的周内，包括Alice在内的所有用户持有的slisBNB的总日均数量是100x10=1000 slisBNB。\
   4\. Alice将分享10/1000，即这两周内分配给slisBNB持有者的LISTA奖励的1%。