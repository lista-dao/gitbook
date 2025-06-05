# veLISTA Locking mechanics

Participating in Lista DAO’s governance requires that a user lock an amount of LISTA tokens. Once locked, the user will receive veLISTA, which is used in determining voting power.

Lista's token locking into veLISTA is inspired by, and functions similarly to, the popular veToken model created by Curve.

## How Locking Works

1. Users receive veLISTA by locking LISTA for a number of weeks. "Weeks" refers to the number of weeks that must pass before the tokens can be withdrawn. The maximum duration for a lock is 52 weeks.
2. The longer the lock duration, the more veLISTA the user receives.
3. Each address can only have 1 lock with 1 unlock duration.
4. It is possible to increase the amount of veLISTA locked, as well as extending the duration of an existing lock.
5. Every Wednesday at UTC+0, the number of weeks for a lock decreases by 1. When the lock duration reaches 0 weeks, the tokens may be withdrawn at any time.
6. Users will have to lock their LISTA into veLISTA **1 day prior to the rewards distribution before they can start claiming rewards.** \
   Example: User A will have to lock his LISTA into veLISTA **before** July 31 (Wednesday) at 00:00 UTC to be eligible for the rewards that will be distributed on August 1 (Thursday).

## Withdrawing early from Locked Positions

It is possible to exit a locked position early by paying an Early Unlock fee.  The fee to exit early starts at 100% and decays linearly based on the number of weeks remaining until the tokens unlock. The exact calculation used is:

**Early Unlock Fee = (total\_Locked\_amount \* weeks\_to\_unlock)/52**
