# 事件与回调

Moolah 通过两种方式将控制权交还给您：

- **回调** — 同步的、在交易中的钩子，Moolah 在执行中途（在提取其应得的代币之前）调用调用者，启用原子流，如杠杆循环、闪电清算和头寸迁移。
- **事件** — Moolah、IRM 和保险库层为链下索引器、子图和监控发出的日志。

有关函数签名、结构体和下面引用的 `Id`/`MarketParams` 类型，请参阅[合约与接口参考](contract-reference.md)。有关更高级别的提供者/经纪人模型，请参阅[集成模式](integration-patterns.md)。

---

## 回调

Moolah 遵循 Morpho 风格的回调模式：几个核心入口点在更新内部会计后可选择回调到 `msg.sender`，但在转入调用者所欠的资产之前。这允许集成商在同一交易中获取这些资产——例如，铸造/交换抵押品，或从被扣押的抵押品中偿还贷款——因此整个操作是原子的，如果任何步骤失败，则作为一个单元回滚。

### 触发规则

每个入口点都接受一个尾随的 `bytes data` 参数。对于 **supply**、**repay**、**supplyCollateral** 和 **liquidate**，仅当 `data` 非空时（`data.length > 0`）才触发回调；传递空的 `data` 以跳过它。**`flashLoan` 是例外**：其回调始终被调用，因为没有它，闪电贷款没有意义。

回调始终在 `msg.sender` 上进行，因此调用 Moolah 的合约必须是实现接口的合约。

### 回调接口

所有五个接口都在 `moolah/interfaces/IMoolahCallbacks.sol` 中声明。

| 接口 | 方法 | 触发者 | 触发条件 |
| --- | --- | --- | --- |
| `IMoolahSupplyCallback` | `onMoolahSupply(uint256 assets, bytes data)` | `supply` | `data` 非空 |
| `IMoolahRepayCallback` | `onMoolahRepay(uint256 assets, bytes data)` | `repay` | `data` 非空 |
| `IMoolahSupplyCollateralCallback` | `onMoolahSupplyCollateral(uint256 assets, bytes data)` | `supplyCollateral` | `data` 非空 |
| `IMoolahLiquidateCallback` | `onMoolahLiquidate(uint256 repaidAssets, bytes data)` | `liquidate` | `data` 非空 |
| `IMoolahFlashLoanCallback` | `onMoolahFlashLoan(uint256 assets, bytes data)` | `flashLoan` | 始终 |

第一个参数是该操作的结算金额：供应/偿还/作为抵押品供应的资产，`repaidAssets` 用于清算，或闪电贷款的金额。`data` 参数是您传入原始调用的相同不透明负载，因此您可以在回调中编码路线、目标市场或步骤参数并解码它们。

### 执行顺序（原子窗口）

在原始调用中，Moolah：

1. 更新其自身的会计。
2. 发出相应的事件（`Supply`、`Repay`、`SupplyCollateral`、`Liquidate`、`FlashLoan`）。
3. 对于 Moolah 欠**您**资产的操作，现在将其转出——`liquidate` 的被扣押抵押品，`flashLoan` 的贷款代币。（`supply`、`repay` 和 `supplyCollateral` 没有出站转移；您是支付方。）
4. 回调到 `msg.sender`（受上述触发规则限制），在头寸更新中途将控制权交给您。
5. 返回时，通过 `transferFrom` 拉入您所欠的资产（供应/偿还/抵押代币，或闪电贷款金额加零费用）。如果您的余额或授权不足，整个交易将回滚。

您的回调主体在步骤 4 中运行，因此它必须让 `msg.sender` 持有足够的入站代币（以及对 Moolah 的授权）以便步骤 5 成功。

### 典型的原子流

> **在设计流之前阅读此内容。** Moolah 继承了一个**全局单一**的重入保护，并且八个入口点携带它——`supply`、`withdraw`、`borrow`、`repay`、`supplyCollateral`、`withdrawCollateral`、`liquidate` 和 `liquidateBrokerPosition`。`flashLoan` 是**唯一**没有它的回调入口点。因此，从 `onMoolahSupply`、`onMoolahRepay`、`onMoolahSupplyCollateral` 或 `onMoolahLiquidate` 内部，您**不能重新进入这八个中的任何一个**——它们会回滚 `ReentrancyGuardReentrantCall()`。视图、`accrueInterest` 和 `flashLoan` 不携带保护并保持可调用，但不可能进行头寸变更的组合。多步骤的 Moolah 组合仅可能从 `onMoolahFlashLoan` 开始。这是与上游 Morpho Blue 的故意分歧，在那里等效的流是可行的，因此不要不加改变地携带 Morpho 设计。

| 流 | 使用的回调 | 草图 |
| --- | --- | --- |
| **杠杆循环** | `onMoolahFlashLoan` | 闪电贷款贷款代币；在回调中将其交换为抵押品，`supplyCollateral`，然后 `borrow` 足够的金额以偿还闪电贷款。必须基于 `flashLoan` 构建——`supplyCollateral` 回调无法借款。 |
| **闪电清算** | `onMoolahLiquidate` | 使用 `data` 调用 `liquidate`；Moolah 首先将扣押的抵押品发送给您，然后回调。在**外部**场所交换该抵押品以筹集偿还资金。回调中不需要 Moolah 调用，这就是为什么这个可行。 |
| **债务/头寸迁移** | `onMoolahFlashLoan` | 闪电贷款贷款代币，用它来偿还其他地方的头寸，提取释放的抵押品，移动它，并重新借款以偿还闪电贷款。 |
| **零资本去杠杆** | `onMoolahFlashLoan` | 闪电贷款贷款代币，用它 `repay`，`withdrawCollateral`，将部分抵押品交换回贷款代币并偿还闪电贷款。不可通过 `onMoolahRepay` 获得，后者无法调用 `withdrawCollateral`。 |

> 回调是一个低级原语。如果您在 TypeScript 中进行集成且不需要自定义原子路由，[Moolah Lending SDK](../sdk.md) 为您构建标准的供应/借款/偿还交易。

---

## 事件

### 核心市场事件（`Moolah`）

签名和索引参数在 `moolah/libraries/EventsLib.sol` 中——从那里或从 ABI 中读取它们。`Id` 是市场标识符（`MarketParams` 的 keccak 哈希）。在从这些日志重建状态时，有五件事会让您感到困惑：

- **头寸重建。** 供应者的余额通过 `Supply`/`Withdraw` 演变；借款人的通过 `Borrow`/`Repay`/`Liquidate` 演变；抵押品通过 `SupplyCollateral`/`WithdrawCollateral` 演变。所有这些都由索引的 `Id` 和索引的 `onBehalf`（或 `borrower`）地址键控。
- **利息。** `AccrueInterest` 包含用于已过期间的 `prevBorrowRate`，添加到市场的 `interest`，以及铸造给费用接收者的 `feeShares`。注意，费用接收者在累积期间可以接收股份**而不**发生 `Supply` 事件，因此从 `AccrueInterest` 而不是 `Supply` 重建费用接收者余额。
- **偿还/清算舍入。** 偿还金额——`Repay` 上的 `assets`，`Liquidate` 上的 `repaidAssets`——可能因舍入而超过市场的 `totalBorrowAssets` 1。对账时请考虑这一点。
- **坏账。** 在 `Liquidate` 上，非零的 `badDebtAssets`/`badDebtShares` 意味着头寸处于水下，损失被社会化给该市场的供应者。
- **授权。** 观察 `SetAuthorization`（以及基于签名的授权的 `IncrementNonce`）以跟踪哪些管理者可以通过 `authorized`/`onBehalf` 模型对头寸进行操作。

Lista 特定的管理事件（提供者/经纪人连接、白名单、黑名单、最小贷款、默认费用）也在相同的 `EventsLib` 中声明，并在发出它们的函数旁边记录在[合约与接口参考](contract-reference.md)中。

### 利率模型事件（`InterestRateModel`）

IRM 发出自己的事件，并且**其中三个由两个 IRM 发出，具有字节相同的签名**，因此它们共享一个 `topic0`——`BorrowRateCapUpdate`、`BorrowRateFloorUpdate` 和 `MinCapUpdate` 来自 `InterestRateModel` 或 `FixedRateIrm`。按发出地址过滤，而不是仅按主题，否则您将把固定利率经纪市场日志归档为自适应曲线事件。只有 `BorrowRateUpdate` 是自适应曲线独有的（`FixedRateIrm` 声明它但从不发出它，因为其 `borrowRate` 是 `view`）。每次 Moolah 对使用此 IRM 的市场累积利息时（Moolah 在 `_accrueInterest` 中调用 `IIrm.borrowRate`），都会发出 `BorrowRateUpdate`，因此它是可用的最细粒度的利率信号给索引器。

`avgBorrowRate` 是在累积间隔内应用的平均每秒利率（按 WAD 缩放）；`rateAtTarget` 是更新后目标利用率的模型利率。固定利率经纪市场使用单独的 `FixedRateIrm`，当其利率设置时，发出 `SetBorrowRate(Id indexed id, int256 newBorrowRate)`。

### 保险库事件（`MoolahVault`）

ERC-4626 管理保险库层发出标准的 `Deposit`/`Withdraw`/`Transfer` 事件以及其自己的生命周期和配置集，在 `moolah-vault/libraries/EventsLib.sol` 中声明。两个声明的事件组需要特殊处理：

**不要索引保险库的 `Submit*` / `Revoke*` 事件。** `SubmitCap`、`SubmitTimelock`、`SetTimelock`、`SubmitGuardian`、`SetGuardian`、`SubmitMarketRemoval` 和 `RevokePending*` 系列都在 `EventsLib` 中声明但**没有**在任何地方发出。它们是继承的声明；Lista 使用每个保险库的两个外部 OpenZeppelin `TimelockController` 而不是合约内的待定/时间锁机制。它们的地址出现在 `CreateMoolahVault` 中作为 `managerTimeLock` 和 `curatorTimeLock`；观察这些以获取 `CallScheduled` / `CallExecuted` / `Cancelled`。`SetCap` 直接由保险库发出，没有先前的 `SubmitCap`。

`SetCurator` 和 `SetIsAllocator` 在同一库中声明并同样从未发出。保险库使用 OpenZeppelin `AccessControl`，因此角色更改以 `RoleGranted` / `RoleRevoked` 形式出现，过滤在 `CURATOR` / `ALLOCATOR` 角色哈希上。

要重建保险库如何在底层 Moolah 市场中分配存款，请跟踪 `SetSupplyQueue`/`SetWithdrawQueue` 以获取排序，`SetCap` 以获取每个市场的限制，以及 `ReallocateSupply`/`ReallocateWithdraw` 以获取实际移动。

### 保险库分配器事件（`VaultAllocator`）

公共重新分配助手（`src/vault-allocator/VaultAllocator.sol`）在 `vault-allocator/libraries/EventsLib.sol` 中声明其事件。

公共重新分配为其从中提取的每个市场发出一个 `PublicWithdrawal`，并为其供应的市场发出一个 `PublicReallocateTo`，所有这些都由索引的 `vault` 关联。

---

## 另请参阅

- [智能合约](smart-contract.md) — 部署的合约地址。