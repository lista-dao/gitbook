# Mechanics

### ListaStakeManager Introduction

slisBNB is the yield bearing & liquid staking token for Lista. Users can get slisBNB by staking their BNB through ListaStakeManager smart contract which handles the BNB liquid staking on BSC.

\


Here are the functionalities provided by ListaStakeManager:

<figure><img src="../../.gitbook/assets/image (9).png" alt=""><figcaption></figcaption></figure>

### Stake BNB

Users can stake BNB through ListaStakeManager. In return, they receive a corresponding amount of slisBNB as the liquid staking token (LST), representing their staked assets

\


### Minting LST

Upon staking, ListaStakeManager mints slisBNB. slisBNB can be freely traded, transferred, or used in DeFi applications, providing users with liquidity while their original assets remain staked.

\


### Earning Rewards from Multiple Validators

The staked BNB generate rewards from multiple validators, which are then aggregated and distributed proportionally to LST holders. This ensures that users benefit from the performance of various validators, potentially increasing the overall yield.

\


<figure><img src="../../.gitbook/assets/image (12).png" alt=""><figcaption><p>Unstaking</p></figcaption></figure>

<figure><img src="../../.gitbook/assets/image (13).png" alt=""><figcaption><p>Withdraw</p></figcaption></figure>

### Unstaking and Withdraw

Users can initiate withdrawal requests to unstake their assets through the smart contract. Upon receiving a withdrawal request, a bot sends a request to unbond BNB from the validators. After the 7-day unbonding period, the slisBNB tokens will be burned, and users can claim the released BNB through the ListaStakeManager.



### Rebalance

&#x20;ListaStakeManager allows Bot to periodically rebalance the staked BNB across validators to optimize reliability and reward rates.
