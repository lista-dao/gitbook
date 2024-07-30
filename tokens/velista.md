# veLISTA

LISTA is the governance token for Lista DAO, it is distributed to users of the protocol for performing a variety of actions, and can be locked to mint veLISTA which allows users to participate in protocol governance, such as raising proposals and voting on them on Lista DAO’s [Snapshot platform](https://snapshot.org/#/listavote.eth).

veLISTA Summary\



<table data-header-hidden><thead><tr><th width="213"></th><th></th></tr></thead><tbody><tr><td>Item</td><td>Description</td></tr><tr><td>Ticker Symbol</td><td>veLISTA</td></tr><tr><td>Features</td><td>Cannot be transferred</td></tr><tr><td>How to get</td><td>Lock LISTA to get veLISTA</td></tr><tr><td>Locking period</td><td>From 1 week to 52 weeks</td></tr><tr><td>Lock exchange rate</td><td><p>1 LISTA (Lock 52 weeks) = 52 veLISTA</p><p>1 LISTA (Lock 20 weeks) = 20 veLISTA</p><p>1 LISTA (Lock 1 Week) = 1 veLISTA</p></td></tr><tr><td>Will veLISTA holdings be fixed after locking? </td><td><p>No, veLISTA will decrease linearly every week. Locking period is updated every Wednesday 00:00 UTC +0. If users do not turn on the auto locking feature, their veLISTA holdings will decrease every wednesday UTC+0.<br></p><p>Example:<br></p><p>1. Alice locks 1 LISTA for 52 weeks on Thursday. She receive 1* 52= 52 veLISTA.<br></p><p>2. Next Wednesday，her veLISTA = 1*(52 -1) = 51veLISTA.<br><br>3. Next N weeks on Wednesday，veLISTA= 1*(52 -N) </p><p>Next 52 Weeks Wednesday, veLISTA = 0. </p><p><br>4. Alice will be able to fully claim her LISTA tokens without any early Unlock fees.</p></td></tr><tr><td>Extending veLISTA Locking period</td><td><p>Users will be able to extend their locking period (in weeks) for LISTA at any point of time, up to a maximum of 52 weeks.<br></p><p>All LISTA locks will share 1 Lock ETA.<br></p><p>Example:</p><p>1. Alice locks 1 LISTA for 10 weeks, and the unlocking date is set at July 15.  </p><p><br>3. After 3 weeks, Alice wants to lock another 1 LISTA. <br></p><p>4. However Alice is only allowed to lock her 1 LISTA for 7 weeks, so that the unlocking date will still be set at July 15.<br></p><p>5. Alice, however, has the choice to extend her locking period to beyond July 15, up to a maximum of 52 weeks.  </p><p><br></p></td></tr><tr><td>Claiming LISTA before the unlock</td><td><p>Users will be able to claim their LISTA token before the unlocking period by paying an Early Unlock Fee.<br><br>The Early Unlock Fee to exit early starts at 100% and decays linearly based on the number of weeks remaining until the tokens unlock.<br><br>Formula: </p><p>Early Unlock Fee<br>= (total_Locked_amount * weeks_to_unlock)/52<br></p><p>Example 1</p><p>Alice locks 100 LISTA for 52 weeks. If Alice decides to claim her LISTA immediately:</p><p>Early Unlock Fee = 100 * 52 / 52 = 100 LISTA<br>Alice will receive：100 LISTA - 100 LISTA = 0 LISTA<br><br>Example 2<br>Alice locks 100 LISTA for 52 weeks. If she decides to claim  her LISTA after 26 weeks</p><p>Early Unlock Fee = 100 * (52-26) / 52 = 50 LISTA<br>Alice will receive：100 LISTA - 50 LISTA = 50 LISTA </p></td></tr><tr><td>veLISTA utility</td><td><p>Governance rights:<br></p><p>1. Vote on proposals: Users can vote on proposals raised on Lista DAO’s snapshot platform as long as they hold veLISTA in their wallets<br></p><p>2. Submitting proposals: Only the Lista core team can submit proposals for voting. The team will consider the most discussed topics by users and submit proposals on their behalf.</p></td></tr><tr><td>Minimum voting required veLISTA </td><td>0</td></tr><tr><td>Minimum Proposal required veLISTA </td><td>Currently, only the Lista core team can submit proposals for voting. However, the community is encouraged to suggest proposals, which the core team will review and consider before submitting them for a vote. In the future, Lista DAO will progressively allow the community to submit proposals directly.</td></tr><tr><td>Voting tools</td><td>Snapshot</td></tr></tbody></table>

## veLISTA Locking mechanics

Participating in Lista DAO’s governance requires that a user lock an amount of LISTA tokens. Once locked, the user will receive veLISTA, which is used in determining voting power.

Lista's token locking into veLISTA is inspired by, and functions similarly to, the popular veToken model created by Curve.

### How Locking Works

1. Users receive veLISTA by locking LISTA for a number of weeks. "Weeks" refers to the number of weeks that must pass before the tokens can be withdrawn. The maximum duration for a lock is 52 weeks.
2. The longer the lock duration, the more veLISTA the user receives.
3. Each address can only have 1 lock with 1 unlock duration.
4. It is possible to increase the amount of veLISTA locked, as well as extending the duration of an existing lock.
5. Every Wednesday at UTC+0, the number of weeks for a lock decreases by 1. When the lock duration reaches 0 weeks, the tokens may be withdrawn at any time.

### Withdrawing early from Locked Positions

It is possible to exit a locked position early by paying an Early Unlock fee.  The fee to exit early starts at 100% and decays linearly based on the number of weeks remaining until the tokens unlock. The exact calculation used is:

Early Unlock Fee = (total\_Locked\_amount \* weeks\_to\_unlock)/52

## Governance

### Scope

Voting empowers the Lista DAO community, allowing members to influence and shape the future development of Lista DAO. As Lista DAO matures, more power will be gradually transferred to the DAO. Our ultimate goal is to fully transition into a DAO where governance holds absolute power.

Explore Lista DAO’s native voting portal on Snapshot [here](https://snapshot.org/#/listavote.eth).

veLISTA holders possess voting rights within Lista’s governance system. As Lista DAO matures, more topics will be added into the scope for governance. The following topics currently falls within the scope of governance:

(1) Modifying fees rate: withdrawal fees, early Unlock fees for veLISTA

(2) Adding or removing a collateral

(3) Increase and decrease Collateral Rate and collateral debt cap

(4) Protocol fee sharing for veLISTA holder

(5) Voting on the share of LISTA Emission on Liquidity Pool

All governance proposals must be voted on by veLISTA holders, while only the Lista DAO Core team can submit proposals. The results of proposals will be implemented by the Lista DAO team.

Community proposals, posted by the Lista DAO community, are used to propose ideas and express the community’s point of view. The Lista DAO team will incorporate well-supported ideas or designs into Core proposals. Additionally, community members can provide feedback and make suggestions on our Forum, contributing to the ongoing development of the protocol.

### Voting Threshold

Governance of Lista DAO operates under specific rules & conditions:

1. Voting Eligibility: Users with any amount of veLISTA are entitled to vote on proposals. Their voting power is directly proportional to the amount of veLISTA they hold relative to other veLISTA holders.
2. Proposal Submission: Only core team members can submit proposals for voting.
3. Voting period: Each proposal’s voting period will last for a period of 3 days, before the final results are tallied.
4. Proposal Approval: A proposal is considered approved when it receives support from over 50% of the veLISTA tokens cast in the vote.
5. Implementation: Once a proposal is passed, it will be implemented within 1 to 2 weeks. If there are delays due to special circumstances, the Lista core team will provide an explanation.

### Veto

The Lista DAO Core Team has always prioritized the best interests of Lista DAO. That said, the team retains veto rights and can take corrective actions to ensure the security and proper functioning of the protocol without a Snapshot poll. In any veto action, the Lista Core Team will provide a detailed explanation to the community.

Possible actions include, but are not limited to:

* Pausing relevant smart contracts to fix a critical bug in the protocol
* Rejecting a successfully added gauge if the token(s) in question are deemed unsafe, malicious, and/or detrimental to the Lista’s ecosystem

## Weekly Rewards

veLISTA holders will also be eligible for weekly rewards given out in the form of the following tokens:

1. lisUSD rewards
2. WBETH liquid staking rewards
3. slisBNB liquid staking rewards
4. LISTA emission rewards

### Lista DAO’s Primary Revenue Sources

Lista DAO’s primary revenue includes (but not limited to) the following:

1. veLISTA early Unlock fees
2. lisUSD borrowing fees
3. ETH withdrawal fees
4. LST rewards and operation Commission fees

<table data-header-hidden><thead><tr><th></th><th width="92"></th><th width="236"></th><th width="204"></th><th></th></tr></thead><tbody><tr><td>Asset</td><td>Item</td><td>Description</td><td>Will veLISTA Holders earn a share?</td><td>Status</td></tr><tr><td>LISTA</td><td>Early Unlock Fee</td><td>Users pay a premium in order to claim their locked LISTA before the locking period ends.</td><td>Yes</td><td>Live</td></tr><tr><td>lisUSD</td><td>Minting Fee</td><td><p>When users borrow lisUSD, a one-time borrow fee will be charged.</p><p><br></p><p>Example:<br>If users borrow 101 lisUSD, users will receive 100lisUSD, the borrowing fee is calculated based on 101 lisUSD</p></td><td>Yes</td><td>Coming soon</td></tr><tr><td>lisUSD</td><td>Borrowing Fee</td><td>When users borrow lisUSD, they incur borrowing fees in the form of interest rates. The longer they hold the borrowed amount, the more interest they accumulate over time.</td><td>Yes</td><td>Live</td></tr><tr><td>ETH</td><td>Withdrawal Fees</td><td>If users wish to withdraw ETH immediately without waiting 7-8 days, they must pay a withdrawal fee.</td><td>Yes</td><td>ETH: Live</td></tr><tr><td>slisBNB</td><td>Liquid staking rewards and operation Commission fees</td><td>Lista DAO earns a share of liquid staking rewards that comes from slisBNB. Lista DAO also charges a small operation commission fee when slisBNB is minted</td><td>Yes</td><td>Live</td></tr></tbody></table>

### Lista DAO’s General Operational Cost

Lista DAO’s operational costs includes (but may not be limited) to the following:

1. lisUSD single staking pool
2. Risk buffer fund
3. Operational cost

| Asset     | Item                       | Description                                                                                                                                                                                       | Status |
| --------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| lisUSD    | lisUSD Single staking pool | <p>Users who stake lisUSD in this pool will earn lisUSD rewards. <br></p><p>By the end of August 2024, LISTA token emissions will be used instead of lisUSD to incentivize this pool instead.</p> | Live   |
| lisUSD    | Risk Buffer Fund           | A risk buffer for lisUSD is set aside, which serves to cover any potential shortfalls that may happen during black swan events.                                                                   | Live   |
| Lista DAO | Operational cost           | A portion of Lista DAO’s revenue will be set aside for operational costs, which will be calculated manually.                                                                                      | Live   |
