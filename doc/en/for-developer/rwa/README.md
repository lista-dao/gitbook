# RWA

## Overview

Lista DAO RWA market provides users access to U.S. short-term Treasury and corporate mortgage bond strategies.

Users subscribe with `USDT` and receive shares that represent pool ownership. Funds are allocated to underlying bond strategies, and earnings are reflected continuously in pool value.

## Design Detail

Users interact with `RWAEarnPool` for deposit and withdrawal requests:

* `deposit` mints pool shares
* `requestWithdraw` burns shares and queues withdrawal
* `claimWithdraw` receives assets after liquidity is returned

`RWAEarnPool` routes funds to `RWAAdapter`, which handles asynchronous vault operations through Centrifuge `AsyncVault`.

Bots periodically execute vault deposit/withdraw request-confirm flows and call `notifyInterest` to keep share NAV growth updated.

## Contents

* [User Operations](user-operations.md)
* [Bot Operations](bot-operations.md)
* [Smart Contract](smart-contract.md)
