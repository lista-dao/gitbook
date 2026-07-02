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

This may occur due to:

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

<table data-header-hidden><thead><tr><th width="95.890625"></th><th width="80.01953125"></th><th width="125.59375"></th><th width="113.46875"></th><th></th></tr></thead><tbody><tr><td>Collateral</td><td>Loan</td><td>Original LLTV</td><td>New LLTV</td><td>Market Hash</td></tr><tr><td>BTCB</td><td>U</td><td>86%</td><td>92%</td><td>0x6ef28e9f52ffd5e66b14ba95f3da17b782ce8c4a592218fa32f917ca10f4f054</td></tr><tr><td>BTCB</td><td>USD1</td><td>86%</td><td>92%</td><td>0x8de2e1f3e3935024a2667d8203983bdff70a1aee0c91665760e02c257d53032f</td></tr><tr><td>BTCB</td><td>USDT</td><td>80%</td><td>92%</td><td>0xea00a233473bc0585326eec959623a054798b7543205c5079bab49015a2bf810</td></tr><tr><td>slisBNB</td><td>BNB</td><td>96.5%</td><td>97%</td><td>0x2bb68bc7f70186f3d4f16db6a19986df6c6cdea3e589c1ae3d30b56b0632c5ec</td></tr><tr><td>slisBNB</td><td>lisUSD</td><td>85%</td><td>92%</td><td>0x7fe248d8459a88e50e8582c71219edbce1079437e58190aeab41ac503694f0a5</td></tr><tr><td>slisBNB</td><td>USD1</td><td>86%</td><td>92%</td><td>0x95f93825819b67a64610e6adb9ac5f70d5108f5121b9df6551e23a4a7a801b5b</td></tr><tr><td>slisBNB</td><td>U</td><td>86%</td><td>92%</td><td>0xaaf06d7c7fd32ac1b478bdf6f068d707ea32982f299b684ef79b1023a51ad3db</td></tr><tr><td>slisBNB</td><td>BNB</td><td>96.5%</td><td>97%</td><td>0x226935103b730aefad53849e4cf7d92f30083cc417222f395478dabdd9ff3cac</td></tr><tr><td>USD1</td><td>BNB</td><td>80%</td><td>92%</td><td>0xd384584abf6504425c9873f34a63372625d46cd1f2e79aeedc77475cacaca922</td></tr><tr><td>USD1</td><td>U</td><td>96.5%</td><td>97%</td><td>0x17230b8678f7efac75e99f4d9db9b2e5e74aabc1f34156b574b676a8e4e8e6f1</td></tr><tr><td>USDT</td><td>BNB</td><td>85%</td><td>92%</td><td>0xf4859576d776ccbc5c7848228da8edd47902d351b1195787742bf5a2927dfe8c</td></tr><tr><td>ETH</td><td>lisUSD</td><td>80%</td><td>92%</td><td></td></tr><tr><td>wBETH</td><td>lisUSD</td><td>80%</td><td>92%</td><td></td></tr></tbody></table>

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
