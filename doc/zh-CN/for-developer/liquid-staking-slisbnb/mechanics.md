# 机制

### ListaStakeManager 介绍

slisBNB 是 Lista 的产出和流动性质押代币。用户可以通过 ListaStakeManager 智能合约质押他们的 BNB 来获取 slisBNB，该合约处理 BSC 上的 BNB 流动性质押。

\\

以下是 ListaStakeManager 提供的功能：

<figure><img src="../../.gitbook/assets/image (9).png" alt=""><figcaption></figcaption></figure>

### 质押 BNB

用户可以通过 ListaStakeManager 质押 BNB。作为回报，他们会收到相应数量的 slisBNB 作为流动性质押代币（LST），代表他们的质押资产。

\\

### 铸造 LST（slisBNB）

在质押时，ListaStakeManager 会铸造 slisBNB。slisBNB 可以自由交易、转移或用于 DeFi 应用，为用户提供流动性，同时他们的原始资产仍然被质押。

\\

### 从多个验证者那里获得奖励

质押的 BNB 会从多个验证者那里产生奖励，这些奖励然后被聚合并按比例分配给 LST （slisBNB）持有者。这确保了用户能够从各种验证者的表现中获益，可能会增加总体收益。

<figure><img src="../../.gitbook/assets/image (12).png" alt=""><figcaption><p>取消质押</p></figcaption></figure>

<figure><img src="../../.gitbook/assets/image (13).png" alt=""><figcaption><p>提取</p></figcaption></figure>

### 取消质押和提取

用户可以通过智能合约发起提款请求，取消质押他们的资产。收到提款请求后，一个机器人会发送请求，解除 BNB 与验证者的绑定。在 7 天的解绑期后，slisBNB 代币将被销毁，用户可以通过 ListaStakeManager 提取已释放的 BNB。

\\

### 重新平衡

ListaStakeManager 允许 Bot 定期在各验证者之间重新平衡质押的 BNB，以优化系统的可靠性和奖励率。
