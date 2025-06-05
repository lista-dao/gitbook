# Gauge Voting for veLISTA

## What is a gauge? <a href="#id-7f1f" id="id-7f1f"></a>

You may think of any products (excluding veLISTA holder emissions) that require LISTA emissions as a series of gauges. This includes whitelisted LPs found under our rewards section, lisUSD single staking, and lisUSD borrowing.

## Gauge voting <a href="#a42c" id="a42c"></a>

Gauge voting allows veLISTA holders (those who have locked their LISTA tokens for voting power) to vote on where LISTA emissions are directed towards. The more veLISTA a gauge accumulates through Gauges Voting, the more LISTA emissions will be allocated to the underlying liquidity pool, which effectively decides which pools receive more support and rewards.

The votes in each epoch (N) determine the LISTA emission for the next epoch (N+1), and these changes take effect only after the current epoch concludes.

To safeguard the system against potential manipulation by large holders, an emission cap will be introduced for each liquidity pool, ensuring a fair and balanced allocation of rewards.

## How Gauge Voting Works <a href="#e8d4" id="e8d4"></a>

1. **Voting Cycle**: Each voting period spans one week. Votes cast during week N influence the distribution of LISTA tokens in week N+1. So, if you vote in week 1, your votes will impact the token allocations for week 2.
2. **Voting** **Process**: During the voting period, veLISTA holders can assign a percentage of their voting weight to various LP pools. You can allocate up to 100% of your voting power, spreading it across different pools as you wish. At the end of the week, a snapshot is taken to finalize the allocations based on the total votes in each pool.
3. **Distribution**: After voting ends, LISTA tokens are deposited into each pool according to the voting results. For example, if Pool A received 20% of the total votes, it will receive 20% of the weekly LISTA emissions.
4. **Resetting** **Votes**: At the start of each new voting cycle, all voting weights reset to zero, so users need to cast new votes each week to influence the upcoming distribution.

## Key Things to Know <a href="#id-8e60" id="id-8e60"></a>

* **Dynamic Allocations**: The amount of LISTA each pool receives will vary each week based on the voting results. This means your voting power can directly impact the rewards distributed to specific LPs.
* **Weekly** **Commitment**: Because votes reset each week, active participation is encouraged to maintain influence over the allocations. Remember to revisit and adjust your votes regularly.
* **Strategic** **Voting**: Consider which pools are most likely to benefit the ecosystem or offer the best returns based on your interests. Pools with higher votes receive more tokens, increasing the potential rewards for users who participate in those LPs.

Gauge voting on Lista DAO makes it easy for veLISTA holders to have a direct impact on the platform’s token distribution. By participating in this community-driven process, you’re not only enhancing your potential rewards but also helping to shape a thriving, balanced ecosystem on Lista DAO.
