# 机制

### ListaStakeManager 简介

slisBNB 是 Lista 的收益型和流动性质押代币。用户可以通过 ListaStakeManager 智能合约质押他们的 BNB，从而获得 slisBNB，该合约负责在 BSC 上进行 BNB 的流动性质押。

<br>

`ListaStakeManager` 是用于质押、排队提现和领取的调用对象：

<figure><img src="../../.gitbook/assets/image (9) (1).png" alt=""><figcaption></figcaption></figure>

### 质押 BNB

用户可以通过 ListaStakeManager 质押 BNB。作为回报，他们会收到相应数量的 slisBNB 作为流动性质押代币 (LST)，代表他们的质押资产。

<br>

### 铸造 LST

在质押时，ListaStakeManager 会铸造 slisBNB。slisBNB 是可转让的 ERC-20，因此质押头寸保持流动性，并可以在其他地方用作抵押品——包括作为 Moolah 抵押品，在那里它是由提供者控制的（参见 [Providers](../lista-lending/providers.md)）。

<br>

### 从多个验证者中赚取奖励

质押的 BNB 从多个验证者中产生奖励，这些奖励随后被汇总并按比例分配给 LST 持有者。这确保了用户可以从各种验证者的表现中受益，可能会增加整体收益。

<br>

<figure><img src="../../.gitbook/assets/image (10) (1).png" alt=""><figcaption><p>解除质押</p></figcaption></figure>

<figure><img src="../../.gitbook/assets/image (13) (1).png" alt=""><figcaption><p>提现</p></figcaption></figure>

### 解除质押和提现

用户可以通过智能合约发起提现请求以解除质押他们的资产。在收到提现请求后，一个机器人会发送请求以从验证者中解绑 BNB。在 7 天的解绑期后，slisBNB 代币将被销毁，用户可以通过 ListaStakeManager 领取释放的 BNB。

### 再平衡

ListaStakeManager 允许机器人定期重新平衡验证者之间的质押 BNB，以优化可靠性和奖励率。

## 接口

所有这些都可以在 `ListaStakeManager` 上由用户调用；地址在 [Smart Contract](smart-contract.md) 上。

```solidity
function deposit() external payable;                    // 质押 BNB，接收 slisBNB
function requestWithdraw(uint256 amountInSlisBnb) external;
function claimWithdraw(uint256 idx) external;           // idx 进入 getUserWithdrawalRequests(you)

function getUserWithdrawalRequests(address user) external view returns (WithdrawalRequest[] memory);
function getUserRequestStatus(address user, uint256 idx) external view returns (bool isClaimable, uint256 amount);
function convertBnbToSnBnb(uint256 amount) external view returns (uint256);
function convertSnBnbToBnb(uint256 amountInSlisBnb) external view returns (uint256);
```

当你构建时：

* **金额是 `msg.value`。** `deposit()` 不接受参数。
* **在 `requestWithdraw` 之前批准 `ListaStakeManager` 对 slisBNB 代币的操作。** 它通过 `safeTransferFrom` 拉取你的 slisBNB。
* **提现是两个交易，间隔不是你能控制的。** `requestWithdraw` 排队；一个机器人从验证者中解绑；只有在 7 天解绑期后，`getUserRequestStatus` 才会报告 `isClaimable`。轮询它而不是假设一个截止日期。
* **`requestWithdraw` 在尘埃上回滚。** 请求的金额必须至少转换为合约的 `minBnb`。
* **`claimWithdraw` 接受索引，而不是 ID。** 它索引调用者的 `getUserWithdrawalRequests` 返回的数组，因此重新读取该数组而不是在多个领取中缓存位置。
* **slisBNB 是通过汇率而不是重基获得收益的。** 你的余额不会增长；`convertSnBnbToBnb` 会。通过它引用价值。