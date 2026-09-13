# Smart Contract

> **veLISTA is being retired under LIP-024.** The on-chain switch is `freePenaltyStartTime` = **2026-04-07 08:20 UTC**. From that moment `lock`, `relockUnclaimed`, `increaseAmount` / `increaseAmountFor` and `extendWeek` all revert with `free penalty period start`, and `getPenalty(address)` returns `0` for every account. `enableAutoLock` / `disableAutoLock` remain callable on existing positions. Governance voting has moved to plain LISTA on Snapshot, and protocol revenue previously distributed to veLISTA stakers now funds LISTA buybacks.
>
> Existing locks can still be exited without penalty. There is no `withdraw` function, and the two exits are **mutually exclusive**:
>
> * `claim()` — only once the lock term has elapsed **and** the position is not auto-locked. Otherwise it reverts `no claimable tokens`.
> * `earlyClaim()` — only while the position is still locked or auto-locked. Otherwise it reverts `cannot claim with penalty`.
>
> Two caveats. The penalty-free period is a bounded window that a `MANAGER` can change — read `freePenaltyEndTime` before relying on it. And `earlyClaim` checks an independent `earlyClaimBlacklist` before anything else. A blacklisted auto-locked position therefore cannot use `earlyClaim()`, and `claim()` is blocked while auto-lock is on — but the exit is **delayed, not removed**: `disableAutoLock()` is not gated by the penalty-free modifier and carries no blacklist check, and it converts the position to a fixed term ending `lockWeeks` weeks later, after which `claim()` works penalty-free. Worst case is a 52-week wait.
>
> The `veLista*` contracts below stay readable on-chain and existing positions can still be exited through them, but they should not be used for new integrations.

## Main

<table><thead><tr><th width="289">Name</th><th>Contract Address</th></tr></thead><tbody><tr><td>veLista <em>(retired · LIP-024)</em></td><td><a href="https://bscscan.com/address/0xd0C380D31DB43CD291E2bbE2Da2fD6dc877b87b3">0xd0C380D31DB43CD291E2bbE2Da2fD6dc877b87b3</a></td></tr><tr><td>veListaDistributor <em>(retired · LIP-024)</em></td><td><a href="https://bscscan.com/address/0x45aAc046Bc656991c52cf25E783c6942425ce40C">0x45aAc046Bc656991c52cf25E783c6942425ce40C</a></td></tr><tr><td>LISTA</td><td><a href="https://bscscan.com/address/0xFceB31A79F71AC9CBDCF853519c1b12D379EdC46">0xFceB31A79F71AC9CBDCF853519c1b12D379EdC46</a></td></tr><tr><td>Lista Airdrop <em>(closed)</em></td><td><a href="https://bscscan.com/address/0x2ed866Ca9C33bf695C78af222d61Bd4D9cB558d3">0x2ed866Ca9C33bf695C78af222d61Bd4D9cB558d3</a></td></tr><tr><td>ListaVault</td><td><a href="https://bscscan.com/address/0x307d13267f360f78005f476fa913f8848f30292a">0x307d13267f360f78005f476Fa913F8848F30292A</a></td></tr><tr><td>OracleCenter</td><td><a href="https://bscscan.com/address/0x946a68b29149f819FBcE866cED3632e0C9F7C53b">0x946a68b29149f819FBcE866cED3632e0C9F7C53b</a></td></tr><tr><td>BorrowLisUSDListaDistributor</td><td><a href="https://bscscan.com/address/0x0aed860ca496600f6976219cb1acec435d7f4f3b">0x0AED860cA496600F6976219Cb1acEc435d7F4f3B</a></td></tr><tr><td>StakeLisUSDListaDistributor</td><td><a href="https://bscscan.com/address/0xFeB28443692216f66D14C7be4a449a765E2BDbAc">0xFeB28443692216f66D14C7be4a449a765E2BDbAc</a></td></tr><tr><td>EmissionVoting <em>(retired · LIP-024)</em></td><td><a href="https://bscscan.com/address/0xfc136f286805a7922d9bf04317068964b231336c#code">0xfc136f286805a7922d9bf04317068964b231336c</a></td></tr><tr><td>VeListaRevenueDistributor <em>(retired · LIP-024)</em></td><td><a href="https://bscscan.com/address/0xE4153Eb04417bE05b8d6B2222E4Cdd8AE674ee76">0xE4153Eb04417bE05b8d6B2222E4Cdd8AE674ee76</a></td></tr><tr><td>VeListaInterestRebater <em>(retired · LIP-024)</em></td><td><a href="https://bscscan.com/address/0xda1E93d58CCCC9683f9Cb051cAEC5CF2F01B3253">0xda1E93d58CCCC9683f9Cb051cAEC5CF2F01B3253</a></td></tr></tbody></table>

## LP Staking

LISTA emissions reach staking pools through per-pool **distributor** contracts fed by `ListaVault`. The set of distributors is on-chain and changes over time, so read it from the vault rather than from a list here:

```solidity
// ListaVault — address in the Main table above
function distributorId() external view returns (uint16);   // highest id issued so far
function idToDistributor(uint16 id) external view returns (address);
function getDistributorWeeklyEmissions(uint16 id, uint16 week) external view returns (uint256);
function getWeek(uint256 timestamp) external view returns (uint16);
function distributorBlacklist(uint16 id) external view returns (bool);
```

Ids are issued sequentially from `1` and never reused, so `idToDistributor(i)` for `i` in `1..distributorId()` is the complete registry. A distributor's **registration does not mean it is being funded** — check `getDistributorWeeklyEmissions(id, getWeek(block.timestamp))` for the week you care about; a `0` there means no emission was allocated to it that week. `claimableList(account, distributors)` returns a user's claimable amount per distributor in one call.

### Staking and vault infrastructure

| Name           | Address                                    |
| -------------- | ------------------------------------------ |
| PancakeStaking | 0xE31f0BcE1F825A8e27f2Cc30B54af19DA2978f10 |
| ThenaStaking   | 0xFA5B482882F9e025facCcE558c2F72c6c50AC719 |
| PancakeVault   | 0x62DfeC5C9518fE2e0ba483833d1BAD94ecF68153 |
| ThenaVault     | 0xF40D0d497966fe198765877484FFf08c2D2004ad |
| LpProxy        | 0x5A0E3291514F5F1797A0C7eFefdac81eeC70ec01 |
