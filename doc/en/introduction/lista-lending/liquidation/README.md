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

#### Smart Lending Liquidation

Liquidation at Smart Lending works similarly but the value of collateral is calculated slightly differently. Refer to [this article](https://blog.lista.org/everything-you-need-to-know-about-liquidation-on-lista-smart-lending) for more details.
