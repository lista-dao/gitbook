# Delegation

When depositing collateral and triggering mint, the depositor can optionally set a delegate address to receive `slisBNBx` instead of the depositor address.

This is useful when users want Launchpool rewards to accrue to another wallet, such as a Binance Web3 wallet.

## Rules

* Only one delegate address can be set per depositor at mint time.
* Once assigned for a position, delegate address cannot be changed or transferred.
* `slisBNBx` remains non-transferable even in delegated accounts.
* On withdrawal, burn is executed from the delegated holder address.

## Operational Impact

* Deposit path can credit certificate ownership to a separate reward wallet.
* Withdrawal path must burn from that same delegated holder.
* Delegation affects who holds the certificate, not collateral ownership rules in Moolah.
