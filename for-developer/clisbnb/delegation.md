# 委托

`slisBNBx` 是一种不可转让的凭证，因此持有人无法通过正常的 ERC-20 `transfer` 进行转移。相反，该协议允许账户选择**哪个钱包持有代表其铸造的 `slisBNBx`**。这被称为委托，它是用于将一个仓位的 `slisBNBx`（因此其 Binance Launchpool 资格）路由到另一个钱包（例如 Binance Web3 MPC 钱包）的机制。

委托由 `SlisBNBxMinter` 管理，这是 `slisBNBx` 的铸造和销毁引擎，部署在 BNB Smart Chain 上，地址为 [`0x2959c423bfe5Cc6E41516599D982A29C0773F11a`](https://bscscan.com/address/0x2959c423bfe5Cc6E41516599D982A29C0773F11a)。有关其他 `slisBNBx` 地址，请参见 [Lista Lending BSC Core](../lista-lending/smart-contract-bsc-core.md) — 本页的[智能合约](smart-contract.md)仅列出 Launchpool/提供者合约，而不包括 `SlisBNBxMinter`。

## 委托模型

| 属性 | 行为 |
| --- | --- |
| 范围 | **每个账户，而不是每个仓位。** 单个受托人持有账户在所有抵押模块（`slisBNB` 提供者和 `slisBNB/BNB` LP 提供者）中的全部记录 `slisBNBx` 仓位。请注意，这仅是**用户的部分** — 每个模块会铸造一部分费用给 Lista 钱包，这不属于委托金额的一部分。 |
| 细粒度 | **通过铸造器无法进行部分委托。** `SlisBNBxMinter.delegateAllTo` 是全有或全无的。传统的 CDP 提供者是一个独立的、仍然活跃的路径，支持按金额委托 — 请参见下面的说明。 |
| 默认值 | 如果账户从未设置过受托人，则持有人默认为**账户本身**。请注意，此默认值是延迟应用的：`delegation[account]` 在第一次余额变化的再平衡期间写入，因此**在此之前读取会返回 `address(0)`，而不是账户**。将零结果视为“委托给自己”，而不是未设置和损坏。 |
| 可变性 | **可以随时通过 `delegateAllTo` 更改。** 它不是在铸造时固定的。 |
| 对抵押品的影响 | 委托仅更改**谁持有 `slisBNBx` 凭证**。它不会移动、重新拥有或以其他方式影响 Moolah 中的基础抵押品。 |

铸造器将委托存储为单个映射，`delegation[account] => delegatee`，并在 `userTotalBalance[account]` 中跟踪每个账户在每个模块中的 `slisBNBx`（用户部分，不包括铸造给 Lista 的每个模块的费用部分）。两者都是只读的，并且可以在链上查询。

## 更改受托人

重新分配受托人是**原子的**：铸造器从旧持有人处销毁账户记录的 `userTotalBalance`，并在一次调用中将相同数量铸造给新的受托人（一个受托人可能为多个账户持有，因此这不一定是他们的全部余额）。在切换期间不会对抵押品进行再平衡 — 只有持有人发生变化。

### `delegateAllTo`（由账户调用）

```solidity
function delegateAllTo(address newDelegatee) external;
```

由账户本身调用（`msg.sender`）。它将账户的整个 `slisBNBx` 余额委托给 `newDelegatee`。

* 如果 `newDelegatee` 已经等于当前受托人，则无操作（此相等性检查首先运行）。
* 否则，零地址作为新受托人被拒绝。
* 内部：读取 `userTotalBalance[account]`，从当前持有人（旧受托人，或如果未设置则为账户本身）销毁该金额，记录 `delegation[account] = newDelegatee`，然后将销毁的金额铸造给 `newDelegatee`。

模块专用变体 `syncDelegatee(address account, address newDelegatee)` 从注册的抵押模块执行相同操作。它不能由集成商调用。

## 传统的 `SlisBNBProvider.delegateAllTo` 已禁用

`SlisBNBProvider` 抵押模块还从早期设计中公开 `delegateAllTo(address)`。一旦该提供者连接到铸造器，其自身的 `delegateAllTo` **将以 `"not supported"` 失败**，并且必须通过 `SlisBNBxMinter.delegateAllTo` 进行委托。

> 同一个 `slisBNBx` 代币有多个铸造器，传统的 CDP 提供者仍然活跃且未暂停。它们支持**按金额**委托，并且不受铸造器限制，因此“所有委托都通过铸造器”适用于铸造器拥有的模块，而不适用于整个代币。在假设适用哪个路径之前，请阅读特定提供者。

```solidity
// SlisBNBProvider.delegateAllTo — 传统路径，一旦设置铸造器即关闭
require(slisBNBxMinter == address(0), "not supported");
```

## 事件

这些事件跟踪委托和由此产生的凭证移动。请注意，**它们的参数都没有被 `indexed`**，因此您无法在节点上按账户过滤 — 按地址和 topic0 获取，然后在客户端侧过滤：

| 事件 | 由...发出 | 签名 | 含义 |
| --- | --- | --- | --- |
| `ChangeDelegateTo` | `SlisBNBxMinter` | `ChangeDelegateTo(address account, address oldDelegatee, address newDelegatee, uint256 amount)` | 受托人重新分配；`amount` 是实际从旧持有人销毁并铸造给新持有人的 `slisBNBx`。 |
| `UserModuleRebalanced` | `SlisBNBxMinter` | `UserModuleRebalanced(address account, address module, uint256 userPart, uint256 feePart)` | 在再平衡期间为账户重新计算的每个模块的 `slisBNBx`。 |
| `Rebalance` | `SlisBNBxMinter` | `Rebalance(address account, uint256 latestModuleBalance, address module, uint256 latestTotalBalance)` | 模块触发了再平衡；`latestTotalBalance` 是账户在各模块中的新总额。 |

> `SlisBNBProvider` 合约仅从传统的、现已禁用的路径发出其自身的 `ChangeDelegateTo(address account, address oldDelegatee, address newDelegatee)`（注意：**没有 `amount` 字段**）。对于当前的铸造器架构，请监听上面的 `SlisBNBxMinter` 事件。

## 集成注意事项

* **读取，不要期望转移。** `slisBNBx` 是不可转让的。要查找账户的凭证持有人，请读取 `delegation[account]` — 零结果意味着账户本身，而不是错误；要查找账户自己的金额，请读取 `userTotalBalance[account]`。
* **提款从持有人处销毁，而不是从您处销毁。** 当抵押品离开 Moolah 时，铸造器从当前持有它的钱包中销毁 `slisBNBx` — 如果您设置了受托人，则从受托人处销毁。您不需要持有凭证或控制该钱包即可提款。如果持有人的余额不足以销毁所需金额，铸造器会销毁现有的部分而不是失败，因此提款在凭证方面永远不会失败。
* **委托不会自动再平衡。** `delegateAllTo` 按原样移动现有余额。后续的抵押品供应/提款将凭证重新平衡到*当前*受托人。
* **新持有人获得 Launchpool 资格。** 因为资格是根据 `slisBNBx` 余额在链下计算的，所以委托后持有凭证的钱包是获得奖励的。