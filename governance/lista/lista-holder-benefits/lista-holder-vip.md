# LISTA Holder VIP

LISTA VIP rewards LISTA holders with additional LISTA emissions when they supply to or borrow from Lista Lending. Your VIP tier is determined by how much LISTA you hold in your wallet.

Your tier also unlocks other holder benefits, including [delayed liquidation](../../../introduction/lista-lending/liquidation/#delayed-liquidation).&#x20;

### How you qualify

Hold LISTA in your wallet. Your balance is snapshotted every hour, and your tier is based on a **7-day arithmetic average** of those snapshots:

* For each of the previous 6 days, the final hourly snapshot of that day is taken as the day's value
* For the current day, the most recent hourly snapshot is used
* Your tier is the average of those 7 values, recalculated every hour

Because the average is rolling, a tier is earned gradually and lost gradually. Buying LISTA does not grant a tier instantly, and a single dip in balance does not remove one. If your 7-day average falls below a threshold, your tier downgrades automatically at the next hourly calculation.

### Tiers

| Tier | LISTA required (7-day average) | Supply Boost Cap | Borrow Boost Cap | Tier Weight |
| ---- | ------------------------------ | ---------------- | ---------------- | ----------- |
| 1    | 10,000                         | $500             | $500             | 1.0x        |
| 2    | 50,000                         | $1,500           | $1,500           | 1.2x        |
| 3    | 200,000                        | $3,000           | $3,000           | 1.5x        |
| 4    | 1,000,000                      | $4,000           | $4,000           | 2.0x        |
| 5    | 5,000,000                      | $5,000           | $5,000           | 2.5x        |
| 6    | 15,000,000                     | $5,000           | $5,000           | 3.0x        |

Below 10,000 LISTA there is no tier and no boost. Base supply and borrow APY are unaffected and continue to apply to everyone.

### What a tier gives you

Each tier sets two independent values.

1. **Boost Position Cap:** the maximum amount of your position that is eligible for bonus emissions, in USD. At Tier 1, $500 of your position earns the bonus. Position above your cap is not penalized; it simply earns the base APY with no bonus attached.
2. **Tier Weight:** a multiplier applied to your share of the emissions pool. At Tier 3 your eligible position counts for 1.5x as much as the same position held by a Tier 1 user.

The two compound. A Tier 6 user at their full cap carries 30x the weight of a Tier 1 user at theirs

| Tier | Boost Cap × Tier Weight | Effective weight | vs. Tier 1 |
| ---- | ----------------------- | ---------------- | ---------- |
| 1    | $500 × 1.0              | 500              | 1x         |
| 2    | $1,500 × 1.2            | 1,800            | 3.6x       |
| 3    | $3,000 × 1.5            | 4,500            | 9x         |
| 4    | $4,000 × 2.0            | 8,000            | 16x        |
| 5    | $5,000 × 2.5            | 12,500           | 25x        |
| 6    | $5,000 × 3.0            | 15,000           | 30x        |

The Boost Position Cap stops rising at Tier 5. Above that, additional value comes from Tier Weight and from the other holder benefits the tier unlocks.

**Supply and borrow caps are separate.** A Tier 2 user has $1,500 of supply eligibility _and_ $1,500 of borrow eligibility. Using one does not consume the other, and each side is calculated independently.

### Featured vaults and markets

Bonus emissions are not paid on every vault and market. Each week the team allocates that week's LISTA emission budget across a selected set of **featured vaults** (supply side) and **featured markets** (borrow side).

The featured list changes weekly. A vault that earned bonus emissions last week may not be featured this week, and your tier does not carry a boost into vaults that aren't on the current list. The current [featured list](https://lista.org/lista-holder?tab=holder-boost) is shown in the app, check it before depositing if the bonus is the reason you're depositing.

Rewards accrue daily and are distributed **every Thursday**.

### How your boost is calculated

Your Boost Position Cap applies to your **total position across all featured vaults**, not to each vault separately.

If your combined position across featured vaults is at or below your cap, all of it is boosted.

If your combined position exceeds your cap, the eligible amount is allocated across your vaults proportionally. Each vault's boosted amount shrinks by the same ratio, and your boosted total equals your cap exactly:

ratio = min(1, Cap / total\_position)&#x20;

vault\_boosted = vault\_position × ratio&#x20;

vault\_weight = vault\_boosted × Tier Weight

Your share of a vault's emissions is your weight in that vault divided by the total weight of all boosted users in it, accumulated daily and settled weekly.

Position values are measured in USD using the oracle of the relevant vault or market, at the time of the daily snapshot.
