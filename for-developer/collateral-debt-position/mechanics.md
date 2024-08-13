# Mechanics

In the Lista mechanism, users can earn rewards by strategically utilizing their assets, which may include BNB, ETH, slisBNB, wBETH, and BTCB. The process begins with users depositing these assets into the Interaction (CDP) module, where they are used as collateral to borrow LisUSD.\


In addition to depositing assets and borrowing LisUSD, users can earn rewards by staking LisUSD and BNB within the Lista ecosystem. By participating in these staking activities, they accrue interest and additional rewards, significantly enhancing their overall earnings.

\


### Fees

1. Borrowing interest — an interest paid to Lista for borrowing lisUSD. The rate is a fixed number set by the Lista governance platform.
2. Liquidation penalty — percentage subtracted in the form of lisUSD when selling user's collateral in a Dutch action during the liquidation process.

### Collateral ratio

Collateral ratio is a percentage of the user's collateral value that determines the maximum borrowing limit for the user; it is calculated as follows: (total amount of lisUSD minted / total value of the collateral \* 100). Different assets will have different collateral ratios, depending on asset volatility. Collateral ratio is used as a liquidation bar to decide when a liquidation event should happen.

\


### CDP Module

The following sections will introduce the functions of the CDP Module one by one, explaining how users can borrow LisUSD by providing collateral and the interactions between different involved contracts.

\


**a. Deposit Collateral**

<figure><img src="../../.gitbook/assets/image (42).png" alt=""><figcaption></figcaption></figure>

1. User Deposits Collateral: The user initiates the deposit process by transferring their collateral to the Interaction contract.
2. Interaction: It moves the collateral to the GemJoin (like a Treasury).
3. GemJoin: receives the collateral from Interaction.
4. Vat: The Vat contract, which is the core of the CDP engine. It records the user’s collateral information and ensures that the collateral enters the system.

\


This process ensures that the user’s collateral is securely deposited and recorded within the CDP Module, allowing them to proceed with borrowing LisUSD against their collateral.

\


**b. Borrow LisUSD**

<figure><img src="../../.gitbook/assets/image (40).png" alt=""><figcaption></figcaption></figure>

1. User Initiates Borrowing: The user requests to borrow a specific amount of LisUSD against their deposited collateral by calling borrow().
2. Interaction: This request is processed by the Interaction, which then communicates with Vat. The user also pays interest during the process, the interest rate is a fixed number set by the Lista governance platform.
3. Vat: records an increase in the user's debt corresponding to the borrowed LisUSD against the specific collateral.&#x20;
4. HayJoin: Interaction calls the \`exit()\` to mint the specified amount of LisUSD and sends it to the user.
5. ListaDistributor: Interaction calls ListaDistributor contract’s snapshot method to record user’s debt value against the collateral for calculating and distributing future rewards to the user.

\


This sequence ensures that the user's debt is accurately recorded, the borrowed LisUSD is successfully minted and transferred to the user, and interest payments are made according to the fixed rate determined by Lista governance.

\


**c. Payback LisUSD**

<figure><img src="../../.gitbook/assets/image (39).png" alt=""><figcaption></figcaption></figure>

1. User Initiates Payback: The user initiates the payback process by specifying the amount of LisUSD to be repaid against the specific collateral.
2. Interaction: This payback request is processed by the Interaction
3. Vat: It updates the user’s debt, reducing it by the amount of LisUSD repaid. If the user fully repays their debt, the CDP (Collateralized Debt Position) is closed
4. HayJoin: Interaction calls the \`join()\` method, which burns LisUSD from the user’s account
5. ListaDistributor: Interaction calls ListaDistributor contract’s snapshot method to record user’s debt value against the collateral for calculating and distributing future rewards to the user.

\


This process ensures that the user’s debt is accurately reduced or cleared, and the corresponding amount of LisUSD is burned, effectively removing it from circulation.

\


**d. Withdraw Collateral**\


<figure><img src="../../.gitbook/assets/image (38).png" alt=""><figcaption></figcaption></figure>

1. User Initiates Withdrawal: The user initiates the withdrawal process by specifying the amount of collateral they wish to withdraw.
2. Interaction: The withdrawal request is processed by the Interaction contract. Please note that if the user has borrowed LisUSD and has not yet paid it back, the amount of collateral they can withdraw is less than the original deposit amount, as some collateral must remain to secure the outstanding debt.
3. GemJoin: Interaction calls the \`exit()\` method, which transfers the specified amount of collateral from GemJoin back to the user.
4. Vat: It records the user's collateral information, updating the system to reflect that the collateral has left the system

\


This process ensures that the user's collateral is accurately withdrawn and returned, while the system records the change in collateral status.

\


**e. Stake LisUSD**



<figure><img src="../../.gitbook/assets/image (34).png" alt=""><figcaption></figcaption></figure>

\


1. User Initiates Staking: The user calls the \`join()\` method to stake a specified amount of LisUSD. This amount of LisUSD is then transferred to the Jar contract.
2. Jar: The Jar contract records the following information:
   1. The user’s staked LisUSD balance.
   2. Increase the total amount of LisUSD staked by all users.
   3. The time when the user staked the LisUSD.
3. ListaDistributor: ListaDistributor takes a snapshot of the user’s balance from the Jar. it will be used for calculating and distributing future rewards to the user.

\


**f. Unstake LisUSD**

<figure><img src="../../.gitbook/assets/image (33).png" alt=""><figcaption></figcaption></figure>

1. User Initiates Unstaking: The user calls the \`exit()\` method to unstake a specified amount of LisUSD.&#x20;
2. Jar: This amount of LisUSD, plus any rewarded amount, is transferred back to the user. It also records the following information:
   1. The user’s staked LisUSD balance is reduced by the unstaked amount X.
   2. The total staked amount of LisUSD is reduced by the unstaked amount X.
   3. A record of the withdrawal is saved.
3. ListaDistributor: The ListaDistributor takes a snapshot of the user’s balance and records the user's staked LisUSD balance for future reward calculations.

\


This process user will only interact with the Jar contract, it is responsible for managing and distributing interest to the participants of who stakes LisUSD.

\


**g. Liquidation**

<figure><img src="../../.gitbook/assets/image (6).png" alt=""><figcaption></figcaption></figure>

The flowchart shows how an auction is being kick started.

**g.1 How an auction get started**

Determine Price and Ratio:

* Price of 1 unit of collateral: $2
* Collateral ratio: 66%
* Collateral price based on collateral ratio: 2∗0.66=$1.322

User Deposit and Borrow Limit:

* Assume User deposits 10 units of collateral: 10∗2=$20
* Borrow limit: 20∗0.66=$13.2
* Assume User borrows $13.2 of lisUSD: 13.2 lisUSD

Monitor Collateral Price Decrease:

* Assume the price of 1 unit of collateral decreases to: $1.8
* Collateral unit price with safety margin: 1.8∗0.66=$1.188
* Current worth of collateral with safety margin: 1.188∗10=$11.88
* Determine liquidation status:
  * 13.2−11.88=$1.32 (positive difference indicates liquidation)

Liquidation Auction Preparation:

* Amount of collateral that goes to Dutch auction: 10 units
* Liquidation penalty (fixed by Lista governance): 13% of the debt
* Debt to cover in the auction: 13.2∗1.13=$14.916
* Buffer (percentage similar to liquidation penalty, fixed by Lista governance): 2%
* Starting auction price (top): 1.8∗1.02=$1.836

Trigger Auction:

* Somebody triggers the auction and gets a tip + chip as a reward (details described later).

\


**g.2 Buy from Auction**

<figure><img src="../../.gitbook/assets/image (7).png" alt=""><figcaption></figcaption></figure>

The flowchart shows how the user buys collateral from an auction.

\


Example:

Auction Start and Price Decrease:

* Auction starts, and the price gradually decreases.
* Liquidator can participate to buy a customized amount of liquidated collateral.
* Linear decrease of price (subject to disruption by specific conditions):
  * Formula:  $$f(x) = x * e^{2 pi i \xi x}$$
  * Example: 1.836∗((3600-600)/3600)=$1.53

Conditions to Pause Auction:

* The auction can pause because of one of two conditions:
  * Tail (specific amount of time elapsed, fixed by Lista governance)
  * Cusp (% of price drop; 40% start auction price, fixed by Lista governance)
* Once either requirement is met, the auction will be restarted.

\


**g.3 Restart Auction**

Wait until someone restarts the auction. The restarter gets a tip + chip as a reward.

* Tip (flat fee, fixed by Lista governance): 5 lisUSD
* Chip (dynamic fee, fixed by Lista governance): 0 lisUSD
