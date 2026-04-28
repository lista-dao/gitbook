# Liquidation

Liquidation at Lista Lending is a vital risk management tool that safeguards lenders’ capital by ensuring borrowers maintain sufficient collateralization. This mechanism enables full or partial liquidation of a borrower’s position when their Loan-To-Value (LTV) exceeds the market’s Liquidation Loan-To-Value (LLTV) threshold, ensuring market stability while supporting its vault-centric, permissionless lending model.

### Understanding Loan-To-Value (LTV) Ratio

The Loan-To-Value (LTV) ratio is the ratio between the value of your loan and your collateral. It is a critical metric assessing a position’s risk by comparing debt to collateral value.

**How to Calculate LTV**

$$
LTV = \frac{Loan\ Asset\ Amount}{Collateral\ Asset\ Amount\times \frac{Oracle\ Price}{Oracle\ Price\ Scale}}\times100\%
$$

Where:

Oracle Price is represented in the ratio between the prices of collateral asset and loan asset.

Oracle Price Scale is $$10^{36}$$ and is used for price normalization.

Example:

At Lista's BNB/USDT market, if you deposit 1 BNB and borrow out 500 USDT.

At a certain time, the price of BNB/USDT Lista fetches from the oracles is $$8\times10^{38}$$. Divide this number by $$10^{36}$$, we will get the normalized price of BNB: 800 USDT.

Then the LTV of this loan is $$\frac{500}{800}\times 100\% = 62.5\%$$

### Standard Liquidation

Standard liquidation is Lista Lending’s primary defense against borrower defaults, embedded in the protocol’s core contracts. Each market comes with its own liquidation loan-to-value (LLTV) ratio, an arbitraty number used as trigger for liquidation.

#### **When Is a Position Liquidatable?**

A position becomes liquidatable when its LTV exceeds the LLTV of its corresponding market.

This may occurs due to:

* A drop in collateral value (e.g., BTCB price falls).
* An increase in debt from accrued interest.
* A combination of both.

#### **How Liquidation Works**

When a liquidation is triggered, any external party can repay part or all of the borrower’s debt and become the liquidator, receiving collateral of equivalent value plus a bonus determined by the Liquidation Incentive Factor (LIF).

LIF varies from market to market and is determined by a market's LLTV:

$$
LIF=min(M,\ \frac{1}{\beta\times LLTV+(1-\beta)})
$$

Where:

* $$\beta$$ is a constant, 0.3.
* $$M$$ is the maximum incentive factor, 1.15.

When a market has an LLTV of 80%, LIF ≈ 1.06 (6% bonus). Currently, Lista DAO sets a minimum LIF of 1.048.

To incentivize timely liquidation, all LIF bonus goes to the liquidator; Lista charges no fee.

#### **A Step-by-Step Example**

Let's say you deposited 100 USDT and borrowed out 91.5 USD1. This market has an LLTV of 91.5%.

Your LTV is $$91.5/100 = 91.5\%$$, so the moment interest starts accruing, your LTV will exceed the LLTV. A liquidation will be triggered and a liquidator will step in to repay the debt. (This is also why we do not recommend borrowing close to LLTV)

Now, a liquidator can either repay this loan in part or in full and receive some of the collateral plus bonus determined by the LIF. With an LLTV of 91.5%, the LIF for this market is:

$$
LIF=min(M,\ \frac{1}{\beta\times 0.915+(1-\beta)})=1.026
$$

This is smaller than the minimum LIF, 1.048 so $$LIF=1.048$$.

This means a certain amount of collateral will be seized:

$$
Seized\ Collateral\ Value = Outstanding\ Loan\ Value\times LIF
$$

The outstanding loan is 91.5 USD1 (plus a minuscule amount of interest). If the oracle dictates 1 USD1 = 1 USDT, then the amount of collateral seized will be:

$$
91.5\times LIF = 91.5\times 1.048 = 95.892\ USDT
$$

If the loan is repaid in full, which means the liquidator pays 91.5 USD1 plus a minuscule amount of interest, they will then receive slightly more than 95.892 USDT. Their profit is: $$95.892\ USDT-91.5\ USD1\approx$4.392$$ minus gas fees.

### Delayed Liquidation

Following the approval of [LIP-024](https://snapshot.org/#/s:listavote.eth/proposal/0x1a15347f6b452049212bdf51ff1a46c0a7edf7ca8efe1004b32c15c2965f0f3b), delayed liquidation is launched for selected markets as the first benefit for LISTA holders.

Normally, when a position’s LTV exceeds its LLTV on Lista, a liquidation will be triggered. With delayed liquidation, eligible borrowers will get a buffer - a higher, new LLTV threshold to protect your positions for 24 hours for selected markets:

| Collateral | Loan   | Original LLTV | New LLTV |
| ---------- | ------ | ------------- | -------- |
| BTCB       | U      | 86%           | 92%      |
| BTCB       | USD1   | 86%           | 92%      |
| BTCB       | USDT   | 80%           | 92%      |
| slisBNB    | BNB    | 96.5%         | 97%      |
| slisBNB    | lisUSD | 85%           | 92%      |
| slisBNB    | USD1   | 86%           | 92%      |
| slisBNB    | U      | 86%           | 92%      |
| slisBNB    | BNB    | 96.5%         | 97%      |
| USD1       | BNB    | 80%           | 92%      |
| USD1       | U      | 96.5%         | 97%      |
| USDT       | BNB    | 85%           | 92%      |
| ETH        | lisUSD | 80%           | 92%      |
| wBETH      | lisUSD | 80%           | 92%      |

For these markets, the total size of protected positions depends on the 7-day average LISTA holding:

<table data-header-hidden><thead><tr><th width="92.8984375"></th><th></th><th></th></tr></thead><tbody><tr><td>Tier</td><td>7-day Weighted Average LISTA Holding</td><td>Total Protected Position Size</td></tr><tr><td>1</td><td>≥ 10,000 LISTA</td><td>≤ $10,000</td></tr><tr><td>2</td><td>≥ 50,000 LISTA</td><td>≤ $50,000</td></tr><tr><td>3</td><td>≥ 200,000 LISTA</td><td>≤ $200,000</td></tr><tr><td>4</td><td>≥ 1,000,000 LISTA</td><td>≤ $1,000,000</td></tr><tr><td>5</td><td>≥ 5,000,000 LISTA</td><td>≤ $10,000,000</td></tr><tr><td>6</td><td>≥ 15,000,000 LISTA</td><td>≤ $50,000,000</td></tr></tbody></table>

With delayed liquidation, eligible borrowers' positions will be one of the following statuses:

* **Guarded**: LTV is below the original LLTV. The position is healthy and pre-qualified for protection if the market moves against you.
* **Protected**: LTV is between the original and the new LLTV. A 24-hour grace period begins. Consider repaying your loan or adding collateral to bring its LTV down.
* **Out of Guard**: Delayed liquidation is not active either due to insufficient $LISTA holdings or the remaining tier capacity was exhausted when its LTV crossed the original LLTV. A liquidation will be triggered.

Protected positions will get 24 hours to be repaid or added with more collateral to bring its LTV down. If after 24 hours, the LTV is still above the original LLTV threshold, a liquidation will still be triggered as usual.

If a position's LTV crosses the original LLTV, but its size exceeds the remaining tier capacity, a partial or full liquidations will still be triggered. After 1 or more liquidations, if the total size of all positions pending liquidation is below the maximum protected size, these positions will be Protected once again.

### Smart Lending Liquidation

Liquidation at Smart Lending works similarly but the value of collateral is calculated slightly differently. Refer to [this article](https://blog.lista.org/everything-you-need-to-know-about-liquidation-on-lista-smart-lending) for more details.
