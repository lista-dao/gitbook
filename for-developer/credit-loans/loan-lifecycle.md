# 贷款生命周期

Lista Credit 贷款从信用额度的提供开始，经过借款、还款、宽限期和罚款窗口，以及恢复阶段。每一步都在链上通过 `CreditToken` 和 `CreditBroker` 进行；只有 Merkle **根**是提前提交的。一旦同步，用户的评分就会成为链上的公开状态——`CreditToken.creditScores` 是一个公共映射，同步时会触发 `ScoreSynced`，而信用代币余额本身就是每美元额度对应一个代币。保持在链下的是评分的**输入和模型**，而不是结果评分。

> 宽限期、罚款率、无息窗口和 LISTA 折扣都是链上可由管理者调整的。在需要时读取 `CreditBroker` 上的 `graceConfig()` 和 `listaDiscountRate`，以及 `CreditToken` 上的 `waitingPeriod`——它们都不是固定的产品保证。

## 流程中的角色

| 参与者 | 责任 |
| --- | --- |
| 借款人 | 提供 `CreditToken` 抵押品，借入贷款代币，偿还本金 + 利息（+ 逾期罚款）。 |
| 链下评估 | 在链下计算资格/限制，并仅将**Merkle 根**发布到 `CreditToken`。评分输入和逻辑不在链上。 |
| `BOT` 角色 | 轮换 `CreditToken` Merkle 根（两步，时间锁定）并触发被罚头寸的清算。操作维护者。 |
| `CreditBroker` | 协调抵押品的提供/提取以及针对基础 Moolah 市场的固定期限借款/还款。 |
| `CreditBrokerInterestRelayer` | 从经纪人接收利息和罚款，并将其作为收入提供给 Moolah 信用金库。 |

## 生命周期

| 阶段 | 触发器 | 链上发生的事情 |
| --- | --- | --- |
| 1. 信用额度发布 | 链下评估 → `CreditToken.setPendingMerkleRoot` 然后 `acceptMerkleRoot` (`BOT`) | 一个新的 Merkle 根被暂存，然后在等待期后被接受（`waitingPeriod`，最低为 6 小时）。接受后增加 `versionId`。只有根被发布——而不是底层评分。 |
| 2. 评分同步（铸造/销毁） | `syncCreditScore(user, score, proof)`——也由经纪人操作隐式运行 | 仅当提交的评分或存储的 `versionId` 与已记录的不同时，用户的 `(score, proof)` 才会针对当前根进行验证——未更改的评分接受空证明和 `versionId`。`CreditToken` 铸造到新的评分或销毁到它（1 代币 = 1 美元的信用容量）。 |
| 3. 提供抵押品 | `supplyCollateral(amount, score, proof)` | 经纪人同步评分，从用户处提取 `CreditToken`，并将其作为抵押品提供给经纪人的 Moolah 市场。 |
| 4. 借款（开启固定头寸） | `supplyAndBorrow(collateralAmount, borrowAmount, termId, score, proof)` 或 `borrow(amount, termId, score, proof)` | 受 `noDebt` 和 `userNotPenalized` 保护。借款人收到**全额** `borrowAmount`；在预付利息期限内，整个期限的利息从一开始就欠下，而不是在发放时扣除。创建一个带有期限的 `FixedLoanPosition`，包括 `apr`、`start`、`end` 和 `termType`；经纪人从 Moolah 借款并将贷款代币转给用户。触发 `FixedLoanPositionCreated`。 |
| 5. 利息累积 | 时间 | 利息根据头寸的 `FixedTermType` 增长（见下文）。利息在经纪人处跟踪。对于经纪人市场，`_isHealthy` 完全忽略每用户价格，并将抵押品与**普通市场价格**对比**经纪人的**总债务；每用户价格仅在清算运行时影响扣押数学。因此，Moolah 感知到风险上升。 |
| 6. 还款 | `repay(amount, posId, onBehalf)` / `repayAndWithdraw(...)` / `repayInterestWithLista(...)`（受限——见下文） | 首先偿还利息，然后是本金。利息（和任何罚款）通过中继器提供给信用金库。触发 `RepaidFixedLoanPosition`。 |
| 7. 宽限期 | `end` → `end + graceConfig.period` | 贷款逾期但**尚未适用罚款**。借款人仍然可以正常还款。 |
| 8. 罚款窗口 | 在 `end + graceConfig.period`（`dueTime`）之后 | 头寸被“罚款”。需要 `penaltyRate × (remaining principal + accrued interest) / RATE_SCALE` 的罚款，并且头寸**必须在一次还款中全额偿还**。`graceConfig.penaltyRate` 是 `RATE_SCALE` 缩放的（`1e27`），所以 `3 * 1e25` 读作 3%；`setGraceConfig` 将其上限设为 `RATE_SCALE`。从 `graceConfig()` 读取；源代码中的 `initialize()` 默认值不是部署的值。 |
| 9. 清算/坏账 | `CreditBroker.liquidate(borrower, posId)`（仅限 `BOT`） | 通过 `Moolah.liquidateBrokerPosition` 注销被罚但尚未成为坏账的头寸；头寸被标记为 `isBadDebt`。参见[坏账处理](bad-debt-handling.md)。 |
| 10. 恢复 | 全额偿还被罚/坏账头寸 | 头寸被偿还并移除；当罚款结清时触发 `PaidOffPenalizedPosition`。一旦未偿债务（`CreditToken.debtOf`）被清除，用户可以再次借款。 |

## 固定期限利息模式（`FixedTermType`）

每个固定期限产品都有两种利息模式之一。`CreditBroker` 的 `FixedTermAndRate` **不是** `LendingBroker` 的相同结构：它增加了第四个字段 `termType`，因此两者不能共享 ABI 解码器。模式在借款时固定并存储在头寸上；它决定了如何计算利息。

| 模式 | 枚举 | 如何收取利息 |
| --- | --- | --- |
| 每秒累积 | `ACCRUE_INTEREST` (0) | 利息按**剩余**本金线性累积：`(principal − principalRepaid) × aprPerSecond × elapsed / RATE_SCALE`，其中 `aprPerSecond = (apr − RATE_SCALE) / 365 days`。`elapsed` 从**`lastRepaidTime`** 开始，而不是从头寸开始，部分本金还款将 `lastRepaidTime` 重置为当前区块——因此利息不是整个期限的单次累积。两端都限制在头寸 `end`。没有预付费用。 |
| 预付 | `UPFRONT_INTEREST` (1) | 一旦无息窗口过去，全期利息就欠下：`principal × (apr − RATE_SCALE) × term / (365 days × RATE_SCALE)`。在 `noInterestUntil`（设置为 `start + graceConfig.noInterestPeriod`）内，利息为 0。 |

`apr` 按 `RATE_SCALE = 1e27` 缩放并编码为 `RATE_SCALE + rate`——10% 的 APR 是 `1.10e27`。在上述任一公式中使用前减去 `RATE_SCALE`，而不是 `1`。`apr − RATE_SCALE` 本身仍然是 `RATE_SCALE` 缩放的（10% APR → `1e26`，而不是 `0.1`）——上述两个公式，以及下面的罚款公式，每个都带有显式的 `/ RATE_SCALE` 以去除该缩放；去掉减法或除法中的任何一个，结果将大 1e27 倍。

## 还款规则

* **先利息后本金。** 还款先支付未偿利息，然后是本金。收集的利息通过中继器提供给信用金库。
* **被罚头寸必须全额偿还。** 一旦超过 `dueTime`，还款必须在一次交易中覆盖剩余本金 + 剩余利息 + 罚款，否则将被拒绝。
* **用 LISTA（折扣）偿还利息。** `repayInterestWithLista(loanTokenAmount, listaAmount, posId, onBehalf)` 允许借款人使用 LISTA 以折扣价结清未偿利息。读取 `listaDiscountRate` 以获取利率和 `allowTransferLoan` 以了解路径是否开放——当路径不开放时，它会拒绝 `relayer/transfer-loan-not-allowed`。LISTA 被发送到中继器；等价的贷款代币利息从中继器记入经纪人。
* **最低贷款检查。** 借款仅验证其刚刚在 Moolah 市场上打开的头寸 `minLoan`；还款仅验证其刚刚触及的头寸，且仅在未完全清除时。两者都不清扫账户的其他头寸。Moolah 分别在账户的总借款上执行相同的下限。

## 借款保护

只有在两个经纪人修饰符都通过时，才能打开新的固定头寸：

| 保护 | 条件 | 来源 |
| --- | --- | --- |
| `noDebt` | `CreditToken.debtOf(borrower) == 0`——用户必须没有未偿信用代币债务。这是一个**记账**金额，而不是钱包余额：它计算持有的信用代币加上作为抵押品的代币，因此即使钱包余额为零的地址也可能在此被阻止。 | `CreditBroker._borrow` |
| `userNotPenalized` | 用户没有超过 `dueTime` 的固定头寸。 | `CreditBroker._borrow` |

在借款之前，经纪人调用 `_tryWithdrawAndBurnDebt`，它提取并销毁任何 `CreditToken` 债务，以便满足 `noDebt` 保护。

## 信用额度门控（Merkle 根）

* `CreditToken` 除白名单 `TRANSFERER`（经纪人和 Moolah）外不可转让。`1 CreditToken = 1 USD` 的借款能力。
* 用户的余额在每次 `syncCreditScore` 时与其发布的评分对账：经纪人传递 `(score, proof)`，代币验证叶子 `keccak256(abi.encode(chainid, creditToken, user, score, versionId))` 是否与当前根匹配，然后铸造到或销毁到评分。
* 根由 `BOT` 角色分两步轮换：`setPendingMerkleRoot` → 等待 `waitingPeriod`（最低为 6 小时）→ `acceptMerkleRoot`（增加 `versionId`）。待定根可以由 `MANAGER` 通过 `revokePendingMerkleRoot` 取消。

> 不要从链上流程推断评分输入——产生限制的评估是在链下进行的，只有其输出到达链上。

## 关键事件

| 事件 | 触发时 |
| --- | --- |
| `AcceptMerkleRoot` | 接受新的信用额度 Merkle 根（`CreditToken`）。 |
| `ScoreSynced` | 用户的评分/余额与当前根对账（`CreditToken`）。 |
| `FixedLoanPositionCreated` | 开启新的固定期限头寸。 |
| `RepaidFixedLoanPosition` | 应用还款（事件中的利息/本金/罚款细分）。 |
| `RepayInterestWithLista` | 使用折扣 LISTA 结清利息。 |
| `PaidOffPenalizedPosition` | 被罚头寸全额偿还。 |
| `PositionLiquidate` | 被罚头寸被清算并标记为坏账。 |

## 相关

* [智能合约](smart-contract.md)——合约名册和角色。
* 规范地址：[BSC Credit (Lista Lending)](../lista-lending/smart-contract-bsc-credit.md)。