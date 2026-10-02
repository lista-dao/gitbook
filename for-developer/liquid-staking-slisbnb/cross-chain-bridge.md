# Cross-Chain Bridge

slisBNB 在 BNB Smart Chain 和 Ethereum 之间作为 **LayerZero OFT** 移动。部署的地址和端点 ID 在 [Smart Contract](smart-contract.md) 上。

## 架构

供应永不重复：代币在其主链上被锁定，并在目标链上铸造为代表。

| Contract | Chain | Role |
| --- | --- | --- |
| `ListaOFTAdapter` | BNB Smart Chain | 在转出时锁定 slisBNB，在返回时释放。slisBNB 本身是一个普通的 ERC-20——适配器将其包装，而不是代币本身具有 OFT 感知。 |
| `ListaOFT` | Ethereum | 到达时铸造，返回时销毁。这里的供应始终由适配器中锁定的数量支持。 |
| LayerZero Endpoint | both | 消息传输。 |

双方都有两个相同的控制：一个 **transfer limiter** 和一个 **emergency pause**。限制器是五个独立的界限，而不是一个——见下文。

## 转移路径

<div data-full-width="true"><figure><img src="../../.gitbook/assets/image (8) (1).png" alt=""><figcaption></figcaption></figure></div>

**BSC → Ethereum.** 您将 `amount` 发送到 `ListaOFTAdapter`；它应用转移限制器和暂停检查，**锁定**代币，并将消息传递给 BSC 上的 LayerZero Endpoint。DVN 验证它，Executor 在 Ethereum 上的 Endpoint 上调用 `lzReceive()`，然后 `ListaOFT` **铸造**等值代币到您的地址。

**Ethereum → BSC.** 镜像：`ListaOFT` 检查其自身的限制器和暂停，**销毁**代币，消息沿相同的 DVN/Executor 路径反向传输，`ListaOFTAdapter` **解锁** BSC 上的等值代币。

两个方向都通过相同的两个 Lista 侧门——限制器和暂停——因此任何会违反其中之一的转移都会在源链上失败，然后才发送任何消息。

## 信任模型

当源交易确认时，转移并不是最终的。LayerZero 的 **DVN** 验证目标链上的消息，并通过调用 `lzReceive` 由 **Executor** 传递；目标铸造仅在那时发生。因此，桥继承了 LayerZero 的验证假设，加上一个 Lista 侧暂停：`pause()` 只能由 `multiSig()` 中的地址调用——两个链上相同的 Gnosis Safe——而 `unpause()` 只能由 `owner()` 调用，这是一个不同的地址。

实际的结果是，转移可以在源链上被接受，但仍然不能立即结算——将目标到达视为异步，并确认它，而不是从发送中推断。

## 调用

使用 LayerZero 自己的 `SendParam` / `quoteSend` 接口；调用形状没有任何 Lista 特定的内容。两个 Lista 侧条件使 `send()` 回滚，并且都不会出现在 LayerZero 报价中：

* **Dust.** OFT 使用 `sharedDecimals = 6`，因此原始金额被截断为 `1e12` 的倍数。传递一个已经去除尘埃的 `amountLD` 和 `minAmountLD`，否则截断的金额低于 `minAmountLD`，调用将回滚。
* **Limiter or pause.** 任何在暂停期间的转移都会回滚。任何违反五个独立界限之一的转移也会回滚，所有这些都会引发 `TransferLimitExceeded()`，并且都在去除尘埃的金额上进行评估：

| Bound | Reverts when |
| --- | --- |
| `singleTransferUpperLimit` | 金额高于此 |
| `singleTransferLowerLimit` | 金额**低于**此——小额转移也会失败 |
| `maxDailyTransferAmount` | 超过全局累计量 |
| `dailyTransferAmountPerAddress` | 超过发送者的累计量 |
| `dailyTransferAttemptPerAddress` | 超过发送者的累计尝试次数 |

不要自己建模计数器——它们的重置规则不是固定窗口。在报价之前立即读取 `transferLimitConfigs(dstEid)` 以获取界限和 `dailyTransferAmount` / `userDailyTransferAmount` / `userDailyAttempt` 以获取当前使用情况。

## 另请参阅

* [LayerZero OFT 文档](https://docs.layerzero.network/v2/developers/evm/oft/quickstart) — `SendParam`，`quoteSend` 和消息模型。