# User Operations

Users call only `RWAEarnPool` methods for subscription and redemption.

## Flow

1. User deposits `USDT` into `RWAEarnPool`.
2. Pool mints shares to user.
3. Funds are routed to `RWAAdapter` and then to external vault flow.
4. For redemption, user requests withdrawal first, then claims when funds are available.

## Methods

| Method | Description |
| --- | --- |
| `deposit` | Mints shares to `receiver` and transfers assets from `msg.sender`. |
| `requestWithdraw` | Burns shares from `msg.sender`, records requested receiver and amount for asynchronous payout. |
| `claimWithdraw` | Transfers assets to receiver after adapter-funded liquidity is available in `RWAEarnPool`. |

## Withdrawal Lifecycle

Withdrawal is asynchronous:

* `requestWithdraw` creates pending request
* Redemption is settled against the external vault
* Funds are returned to the earn pool
* User calls `claimWithdraw`

The settlement leg runs on the **external vault's redemption cycle**, not on a schedule the contract enforces, so there is no on-chain deadline by which a pending request becomes claimable. Poll for claimable liquidity rather than assuming a fixed delay. Interest accrues into share NAV as it is reported, so a share's value grows over the holding period rather than paying out separately.
