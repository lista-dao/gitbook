# RWA

## Overview

Lista DAO RWA market provides users access to U.S. short-term Treasury and **AAA-rated collateralized-loan-obligation (CLO)** strategies. The two `RWAEarnPool` pools are `USDT.Treasury`, backed by the Janus Henderson Treasury Fund (JTRSY), and `USDT.AAA`, backed by the Janus Henderson AAA CLO Fund (JAAA). A separate RWA product, **slisXAUE** (Tether Gold on Ethereum), does not use `RWAEarnPool` — its addresses are on [Smart Contract](smart-contract.md).

Users subscribe with `USDT` and receive shares that represent pool ownership. Funds are allocated to underlying bond strategies, and earnings are reflected continuously in pool value.

## Design Detail

Users interact with `RWAEarnPool` for deposit and withdrawal requests:

* `deposit` mints pool shares
* `requestWithdraw` takes a withdrawal fee in shares, burns the remainder, and queues the withdrawal
* `claimWithdraw` receives assets after liquidity is returned

`RWAEarnPool` routes funds to `RWAAdapter`, which handles asynchronous vault operations through Centrifuge `AsyncVault`.

Redemptions settle on the external vault's own cycle rather than on demand — see [User Operations](user-operations.md) for what that means for a caller.

## Contents

* [User Operations](user-operations.md)
* [Smart Contract](smart-contract.md)
