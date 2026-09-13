# Mechanics

### ListaStakeManager Introduction

slisBNB is the yield bearing & liquid staking token for Lista. Users can get slisBNB by staking their BNB through ListaStakeManager smart contract which handles the BNB liquid staking on BSC.

<br>

Here are the functionalities provided by ListaStakeManager:

<figure><img src="../../.gitbook/assets/image (9) (1).png" alt=""><figcaption></figcaption></figure>

### Stake BNB

Users can stake BNB through ListaStakeManager. In return, they receive a corresponding amount of slisBNB as the liquid staking token (LST), representing their staked assets

<br>

### Minting LST

Upon staking, ListaStakeManager mints slisBNB. slisBNB is a transferable ERC-20, so the staked position stays liquid and can be used as collateral elsewhere — including as Moolah collateral, where it is provider-gated (see [Providers](../lista-lending/providers.md)).

<br>

### Earning Rewards from Multiple Validators

The staked BNB generate rewards from multiple validators, which are then aggregated and distributed proportionally to LST holders. This ensures that users benefit from the performance of various validators, potentially increasing the overall yield.

<br>

<figure><img src="../../.gitbook/assets/image (10) (1).png" alt=""><figcaption><p>Unstaking</p></figcaption></figure>

<figure><img src="../../.gitbook/assets/image (13) (1).png" alt=""><figcaption><p>Withdraw</p></figcaption></figure>

### Unstaking and Withdraw

Users can initiate withdrawal requests to unstake their assets through the smart contract. Upon receiving a withdrawal request, a bot sends a request to unbond BNB from the validators. After the 7-day unbonding period, the slisBNB tokens will be burned, and users can claim the released BNB through the ListaStakeManager.

### Rebalance

ListaStakeManager allows Bot to periodically rebalance the staked BNB across validators to optimize reliability and reward rates.

## Interface

The three state-changing calls and four views below are all user-callable on `ListaStakeManager`; the address is on [Smart Contract](smart-contract.md).

```solidity
function deposit() external payable;                    // stake BNB, receive slisBNB
function requestWithdraw(uint256 amountInSlisBnb) external;
function claimWithdraw(uint256 idx) external;           // idx into getUserWithdrawalRequests(you)

function getUserWithdrawalRequests(address user) external view returns (WithdrawalRequest[] memory);
function getUserRequestStatus(address user, uint256 idx) external view returns (bool isClaimable, uint256 amount);
function convertBnbToSnBnb(uint256 amount) external view returns (uint256);
function convertSnBnbToBnb(uint256 amountInSlisBnb) external view returns (uint256);
```

Points worth building around:

* **The amount is `msg.value`.** `deposit()` takes no argument.
* **Approve `ListaStakeManager` on the slisBNB token before `requestWithdraw`.** It pulls your slisBNB with `safeTransferFrom`. The transfer is the last statement in the function, so a missing allowance surfaces only after the amount and `minBnb` checks have passed.
* **Withdrawal is two transactions, and the gap is not yours to control.** `requestWithdraw` queues; a bot unbonds from validators; only after the 7-day unbonding period does `getUserRequestStatus` report `isClaimable`. Poll it rather than assuming a deadline.
* **`requestWithdraw` reverts on dust.** The requested amount must convert to more than the contract's `minBnb`.
* **`claimWithdraw` takes an index, not an id.** It indexes the array returned by `getUserWithdrawalRequests` for the caller, so re-read that array rather than caching positions across claims.
* **slisBNB is yield-bearing by exchange rate, not by rebase.** Your balance does not grow; `convertSnBnbToBnb` does. Quote value through it.
