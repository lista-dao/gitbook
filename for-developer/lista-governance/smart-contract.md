# 智能合约

> **veLISTA 正在根据 LIP-024 退役。** 链上开关为 `freePenaltyStartTime` = **2026-04-07 08:20 UTC**。从那一刻起，`lock`、`relockUnclaimed`、`increaseAmount` / `increaseAmountFor` 和 `extendWeek` 都会因 `free penalty period start` 而回退，并且 `getPenalty(address)` 对于每个账户返回 `0` **当 `block.timestamp` 在 `[freePenaltyStartTime, freePenaltyEndTime]` 之间时** — 在依赖于此之前，请参阅下面的有界窗口警告。`enableAutoLock` / `disableAutoLock` 仍然可以在现有位置上调用。治理投票已转移到 Snapshot 上的普通 LISTA，之前分配给 veLISTA 质押者的协议收入现在用于 LISTA 回购。
>
> 现有锁定仍然可以无惩罚退出。没有 `withdraw` 函数，两个退出是**互斥的**：
>
> * `claim()` — 仅在锁定期限已过**且**位置未自动锁定时。否则它会回退 `no claimable tokens`。
> * `earlyClaim()` — 仅在位置仍然锁定或自动锁定时。否则它会回退 `cannot claim with penalty`。
>
> 有两个警告。无惩罚期是一个可以由 `MANAGER` 更改的有界窗口 — 在依赖于此之前读取 `freePenaltyEndTime`。并且 `earlyClaim` 在任何其他操作之前检查一个独立的 `earlyClaimBlacklist`。因此，被列入黑名单的自动锁定位置无法使用 `earlyClaim()`，而 `claim()` 在自动锁定开启时被阻止 — 但退出是**延迟的，而不是移除的**：`disableAutoLock()` 不受无惩罚修饰符的限制，并且不进行黑名单检查，它将位置转换为一个固定期限，结束于 `lockWeeks` 周后，此后 `claim()` 可以无惩罚地工作。最坏的情况是等待 52 周。
>
> 下面的 `veLista*` 合约仍然可以在链上读取，现有位置仍然可以通过它们退出，但不应用于新的集成。

## 主合约

<table><thead><tr><th width="289">名称</th><th>合约地址</th></tr></thead><tbody><tr><td>veLista <em>(退役 · LIP-024)</em></td><td><a href="https://bscscan.com/address/0xd0C380D31DB43CD291E2bbE2Da2fD6dc877b87b3">0xd0C380D31DB43CD291E2bbE2Da2fD6dc877b87b3</a></td></tr><tr><td>veListaDistributor <em>(退役 · LIP-024)</em></td><td><a href="https://bscscan.com/address/0x45aAc046Bc656991c52cf25E783c6942425ce40C">0x45aAc046Bc656991c52cf25E783c6942425ce40C</a></td></tr><tr><td>LISTA</td><td><a href="https://bscscan.com/address/0xFceB31A79F71AC9CBDCF853519c1b12D379EdC46">0xFceB31A79F71AC9CBDCF853519c1b12D379EdC46</a></td></tr><tr><td>Lista Airdrop <em>(关闭)</em></td><td><a href="https://bscscan.com/address/0x2ed866Ca9C33bf695C78af222d61Bd4D9cB558d3">0x2ed866Ca9C33bf695C78af222d61Bd4D9cB558d3</a></td></tr><tr><td>ListaVault</td><td><a href="https://bscscan.com/address/0x307d13267f360f78005f476fa913f8848f30292a">0x307d13267f360f78005f476Fa913F8848F30292A</a></td></tr><tr><td>OracleCenter</td><td><a href="https://bscscan.com/address/0x946a68b29149f819FBcE866cED3632e0C9F7C53b">0x946a68b29149f819FBcE866cED3632e0C9F7C53b</a></td></tr><tr><td>BorrowLisUSDListaDistributor</td><td><a href="https://bscscan.com/address/0x0aed860ca496600f6976219cb1acec435d7f4f3b">0x0AED860cA496600F6976219Cb1acEc435d7F4f3B</a></td></tr><tr><td>StakeLisUSDListaDistributor</td><td><a href="https://bscscan.com/address/0xFeB28443692216f66D14C7be4a449a765E2BDbAc">0xFeB28443692216f66D14C7be4a449a765E2BDbAc</a></td></tr><tr><td>EmissionVoting <em>(退役 · LIP-024)</em></td><td><a href="https://bscscan.com/address/0xfc136f286805a7922d9bf04317068964b231336c#code">0xfc136f286805a7922d9bf04317068964b231336c</a></td></tr><tr><td>VeListaRevenueDistributor <em>(退役 · LIP-024)</em></td><td><a href="https://bscscan.com/address/0xE4153Eb04417bE05b8d6B2222E4Cdd8AE674ee76">0xE4153Eb04417bE05b8d6B2222E4Cdd8AE674ee76</a></td></tr><tr><td>VeListaInterestRebater <em>(退役 · LIP-024)</em></td><td><a href="https://bscscan.com/address/0xda1E93d58CCCC9683f9Cb051cAEC5CF2F01B3253">0xda1E93d58CCCC9683f9Cb051cAEC5CF2F01B3253</a></td></tr></tbody></table>

## LP 质押

LISTA 发放通过每个池的**分发者**合约到达质押池，这些合约由 `ListaVault` 提供资金。分发者集在链上并随时间变化，因此从 vault 中读取而不是从此处的列表中读取：

```solidity
// ListaVault — 地址在上面的主表中
function distributorId() external view returns (uint16);   // 到目前为止发出的最高 id
function idToDistributor(uint16 id) external view returns (address);
function getDistributorWeeklyEmissions(uint16 id, uint16 week) external view returns (uint256);
function getWeek(uint256 timestamp) external view returns (uint16);
function distributorBlacklist(uint16 id) external view returns (bool);
```

Id 从 `1` 顺序发出且从不重用，因此 `idToDistributor(i)` 对于 `i` 在 `1..distributorId()` 范围内是完整的注册表。分发者的**注册并不意味着它正在被资助** — 检查 `getDistributorWeeklyEmissions(id, getWeek(block.timestamp))` 以获取您关心的那一周；如果那里是 `0`，则意味着该周没有分配给它的发放。`claimableList(account, distributors)` 在一次调用中返回用户每个分发者的可领取金额。

### 质押和 vault 基础设施

| 名称           | 地址                                    |
| -------------- | ---------------------------------------- |
| PancakeStaking | 0xE31f0BcE1F825A8e27f2Cc30B54af19DA2978f10 |
| ThenaStaking   | 0xFA5B482882F9e025facCcE558c2F72c6c50AC719 |
| PancakeVault   | 0x62DfeC5C9518fE2e0ba483833d1BAD94ecF68153 |
| ThenaVault     | 0xF40D0d497966fe198765877484FFf08c2D2004ad |
| LpProxy        | 0x5A0E3291514F5F1797A0C7eFefdac81eeC70ec01 |