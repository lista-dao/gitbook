# Bot Operations

Bots operate on `RWAAdapter` to bridge between `RWAEarnPool` and asynchronous vault settlement.

## Deposit Path

1. `requestDepositToVault`
2. Wait settlement window (typically 1-2 business days)
3. `depositToVault`

## Withdraw Path

1. `requestWithdrawFromVault`
2. Wait settlement window (typically 1-2 business days)
3. `withdrawFromVault`
4. `finishEarnPoolWithdraw` to fund user requests in `RWAEarnPool`

## Earnings Update

Bots call `notifyInterest` daily so earnings are reflected in share NAV growth over time.

## Methods

| Method | Description |
| --- | --- |
| `requestDepositToVault` | Calls AsyncVault `requestDeposit` and transfers funds toward vault subscription. |
| `depositToVault` | Finalizes mint after async settlement and receives vault shares. |
| `requestWithdrawFromVault` | Submits batched redemption request to AsyncVault. |
| `withdrawFromVault` | Finalizes redemption after async settlement and receives funds. |
| `finishEarnPoolWithdraw` | Transfers redeemed funds to `RWAEarnPool` to satisfy pending user withdrawals. |
