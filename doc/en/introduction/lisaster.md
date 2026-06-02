# lisAster

lisAster is Lista's ASTER staking aggregator that lets any ASTER holder access the best possible staking rewards.

lisAster is received on a 1:1 ratio by depositing ASTER on Lista. lisAster is a standard ERC-20 token - it can be freely transferred and staked. In the future, it can also be used for lending, trading, and other DeFi activities.

Note that lisAster must be staked to start generating rewards. Rewards are accrued hourly based on your proportional share of staked lisAster, and settled each epoch. Rewards from epoch N are claimable from epoch N+1 onwards. When lisAster is unstaked, rewards will also stop accumulating.

In line with Aster Chain’s epoch rules, Lista will batch process all deposited ASTER every week. Your deposit takes effect in the current epoch; staking rewards are claimable from the following epoch (Monday 00:00 UTC → Sunday 00:00 UTC) and are claimable in the next. lisAster’s first reward-generating epoch starts on June 1, 2026.

### Reward Structure

Aster Chain distributes two reward streams every epoch:

| Stream          | Weekly Pool   | Distribution Basis                         |
| --------------- | ------------- | ------------------------------------------ |
| Base APY        | 150,000 ASTER | Pro-rata across all stakers by veASTER     |
| Loyalty Rewards | 300,000 ASTER | Pro-rata by Power (veASTER × Volume Boost) |

By targeting maximum veASTER weight and the highest Volume Boost, lisAster positions depositors to capture a disproportionate share of both pools - particularly the larger Loyalty Rewards stream.

Theoretical maximum power advantage vs. a short-term solo staker:

Lista Power  = max veASTER (4x) × max Volume Boost (1.25x) = 5x

Solo Power   = min veASTER (1x) × no boost (1.0x)          = 1x

Depending on a user's solo staking parameters, the effective power improvement through lisAster can be up to 5x.

### Exiting lisAster

Because the underlying ASTER is permanently locked in the Aster staking contract, Lista does not offer a direct redemption mechanism. However, as lisAster can be freely transferred, it should be possible to exchange it into ASTER or even other tokens on the secondary market.
