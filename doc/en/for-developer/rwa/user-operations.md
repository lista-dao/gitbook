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
* Bot completes external vault redemption through adapter
* Adapter funds are returned to earn pool
* User calls `claimWithdraw`
