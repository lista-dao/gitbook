Everything You Need to Know About Liquidation on Lista Smart Lending
====================================================================

Lista DAO operates a sophisticated liquidation system designed to maintain the stability and solvency of its lending protocol. As Smart…

* * *

### Everything You Need to Know About Liquidation on Lista Smart Lending

![](https://cdn-images-1.medium.com/max/800/1*_2V6YRgrDlFi1PHJBaDOvA.jpeg)

Lista DAO operates a sophisticated liquidation system designed to maintain the stability and solvency of its lending protocol. As Smart Lending — an innovative cross between lending protocol and decentralized exchange — goes live, Lista’s liquidation system also receives an update. In this article, we will take a look at how this liquidation mechanism works and how it safeguards Smart Lending.

### About Liquidation

Liquidation is the process of selling a certain amount of assets in exchange for liquidity. When a position’s loan-to-value (LTV) ratio rises above a certain threshold — typically due to price fluctuations in the collateral and/or increasing debt from accumulated interest — the position becomes eligible for (forced) liquidation.

### How Liquidation Works on Lista Smart Lending

For every vault, Lista will actively monitor the price of its collateral by calculating its value every 5 minutes or every 1% in price movement. Whenever a position’s LTV rises above the liquidation loan-to-value (LLTV) ratio, Lista’s smart contract will take over a portion of the position and try to liquidate it.

In Smart Lending, collateral assets are also deposited into a liquidity pool on Lista’s decentralized exchange. Thus, when a liquidation is triggered, a certain portion of its corresponding LP will be withdrawn from the pool. Then, one collateral asset with the lower price will be swapped into the other and, eventually, swapped into the loan asset to repay the loan.

![](https://cdn-images-1.medium.com/max/800/1*hm1zkYroJqhG9w8APM28xg.png)

Take our slisBNB/BNB — USD1 vault for example. Assume we deposited 0.5 BNB and 0.5 slisBNB when BNB is at $1,000 and took out a 700 USD1 loan. For safety reasons, the collateral value is calculated in the asset with the lower price so our total collateral value is 1 BNB.

![](https://cdn-images-1.medium.com/max/800/1*69CQLjV-TLqsrIP0Xo7eRA.png)

Assume that over time, our loan plus interest increases to 750 USD1 and the price of BNB suddenly drops to $900. Since this vault’s LLTV is 75% and our current LTV is 750/900 = 83.3%, a liquidation will be triggered.

Lista’s smart contract will first calculate the position size we must take out to repay our loan and bring our LTV down. Assume the value of this portion is $X, then:

(750 — X)/(900 — X) = 75%

X = 300

This means at least $300 worth of BNB (300/900 = 0.333 BNB) should be sold into USD1 to repay the loan. If currently, the liquidity pool consists of the same amount of BNB and slisBNB, then the same amount of both will be withdrawn and converted into the asset with the higher value — slisBNB. Then these slisBNB will be converted into USD1 to repay the loan. When this is done, and if we ignore the cost of gas fees, trading fees, and slippage, our position will become:

![](https://cdn-images-1.medium.com/max/800/1*Fum5vN73ya0BhgB9y3ypjA.png)

In reality, the liquidation process may experience problems such as liquidity issues with the collateral asset. When Lista’s smart contract can not complete the liquidation process and repay the loan, the position will be listed in Lista’s [Liquidation Zone](https://lista.org/lending/liquidation), available for everyone to purchase. You’ll notice from the example that the amount withdrawn from the pool (0.167 slisBNB +0.167 BNB) is worth a little more than $300. This difference between their values will go to the liquidator as their profit and reward for assuming the risk.

### Closing Thoughts

Understanding Lista Smart Lending’s liquidation mechanics is essential for all protocol participants. Borrowers must actively monitor their positions — we recommend subscribing to our Telegram bot — and maintain sufficient collateralization buffers to avoid liquidation penalties, especially during times of turmoil. Liquidators also play a crucial role in maintaining system stability by closing risky positions. Together, these participants and mechanisms create a resilient lending ecosystem that balances risk and reward across all stakeholders.

By [Lista DAO](https://medium.com/@ListaDAO) on [November 18, 2025](https://medium.com/p/dbb339994f30).

[Canonical link](https://medium.com/@ListaDAO/everything-you-need-to-know-about-liquidation-on-lista-smart-lending-dbb339994f30)

Exported from [Medium](https://medium.com) on January 15, 2026.