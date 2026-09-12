# User Operations

Users call `RWAEarnPool` methods for subscription and redemption, after a one-time `approve` on the `USDT` token — the pool pulls the asset with `transferFrom`, so the first `deposit` reverts on allowance without it. The spender to approve is `RWAEarnPool`.

## Flow

1. User calls `RWAEarnPool.deposit`. The pool pulls `USDT` from the caller **straight to `RWAAdapter`**, so it holds no deposited principal. The only asset balance it carries is withdrawal liquidity the adapter has pushed back via `finishWithdraw`, waiting to be claimed — do not read the pool's balance as AUM.
2. Pool mints shares to the `receiver` argument (not necessarily `msg.sender`).
3. `RWAAdapter` forwards into the external vault flow.
4. For redemption, user requests withdrawal first, then claims when funds are available.

## Methods

| Method | Description |
| --- | --- |
| `deposit` | Mints shares to `receiver` and transfers assets from `msg.sender` to the adapter. Two gates to know: a **minimum deposit** (`minDeposit`, 1,000 USDT on both pools at the time of writing) that reverts `deposit below minimum` — a small test deposit will fail; and a receiver whitelist that is **open while the set is empty**, which is the case today, but a manager can populate it, after which unlisted deposits and share transfers revert. Read `minDeposit()` and `getWhiteList()` before assuming. |
| `requestWithdraw` | Takes a withdrawal fee in shares (transferred to the fee receiver, **0.1%**, capped at 10% — read `withdrawFeeRate()`), burns the remainder from `msg.sender`, and records the receiver and the amount — which is re-derived from the reduced share count, so the queued payout is below a naive `convertToAssets(shares)`. |
| `claimWithdraw` | Transfers assets to receiver after adapter-funded liquidity is available in `RWAEarnPool`. |

## Withdrawal Lifecycle

Withdrawal is asynchronous:

* `requestWithdraw` creates pending request
* Redemption is settled against the external vault
* Funds are returned to the earn pool
* User calls `claimWithdraw`

The settlement leg runs on the **external vault's redemption cycle**, not on a schedule the contract enforces, so there is no on-chain deadline by which a pending request becomes claimable. Poll for claimable liquidity rather than assuming a fixed delay. Interest accrues into share NAV as it is reported, so a share's value grows over the holding period rather than paying out separately.
