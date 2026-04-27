# 机制

### ListaStakeManager 介绍

slisBNB 是 Lista 的收益型和流动性质押代币。用户可以通过通过 ListaStakeManager 智能合约质押他们的 BNB 来获得 slisBNB，该合约处理 BSC 上的 BNB 流动性质押。

<br>

以下是 ListaStakeManager 提供的功能：

<figure><img src="../../.gitbook/assets/image (9) (1).png" alt=""><figcaption></figcaption></figure>

### 质押 BNB

用户可以通过 ListaStakeManager 质押 BNB。作为回报，他们将获得相应数量的 slisBNB 作为流动性质押代币（LST），代表他们的质押资产。

<br>

### 铸造 LST

质押后，ListaStakeManager 将铸造 slisBNB。slisBNB 可以自由交易、转移或用于 DeFi 应用，为用户提供流动性，同时他们的原始资产仍然被质押。

<br>

### 从多个验证者赚取奖励

质押的 BNB 从多个验证者那里获得奖励，这些奖励随后被汇总并按比例分配给 LST 持有者。这确保用户从各种验证者的表现中受益，可能增加总体收益。

<br>

<figure><img src="../../.gitbook/assets/image (10) (1).png" alt=""><figcaption><p>取消质押</p></figcaption></figure>

<figure><img src="../../.gitbook/assets/image (13) (1).png" alt=""><figcaption><p>提取</p></figcaption></figure>

### 取消质押和提取

用户可以通过智能合约发起提取请求来取消质押他们的资产。收到提取请求后，一个机器人会发送请求给验证者解绑 BNB。在 7 天解绑期后，slisBNB 代币将被销毁，用户可以通过 ListaStakeManager 索取释放的 BNB。

### 重新平衡

ListaStakeManager 允许机器人定期重新平衡质押的 BNB，跨验证者优化可靠性和奖励率。