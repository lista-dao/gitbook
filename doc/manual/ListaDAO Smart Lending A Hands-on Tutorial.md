ListaDAO’s Smart Lending: A Hands-on Tutorial
=============================================

As the latest innovation by ListaDAO, Smart Lending opens up a brand new revenue stream for your assets by providing liquidity for Lista’s…

* * *

### ListaDAO’s Smart Lending: A Hands-on Tutorial

As the latest innovation by ListaDAO, Smart Lending opens up a brand new revenue stream for your assets by providing liquidity for Lista’s decentralized exchanges. In this article, we’ll take a quick look at the latest offering from one of the largest DeFi protocols on the BNB Chain.

Take our slisBNB/BNB vault for example and assume we are borrowing USD1. Select ‘Smart Lending Zone’ under ‘Lending’ on the top navigation bar. Or, on [Lista’s Lending page](https://lista.org/lending/borrow?onlySmartLending=1), toggle ‘Smart Lending’ and select [this vault](https://lista.org/lending/smart-market/bsc/0x9ae45397a8063220d4cdb41ad9268d4c173dd18ca778171e9dee0644dfbe4cbd?tab=market).

![](https://cdn-images-1.medium.com/max/800/1*LvDs-d-QsD16eB4gxfR9bg.png)

### Deposit Collateral and Borrow

1.  Deposit collateral (slisBNB, BNB, or both):

Your assets are deposited into an LP for Lista’s DEX and you can choose to supply any one of them or both at a certain ratio.

*   **Switch to Custom Ratio** to deposit slisBNB and/or BNB at any ratio. Lista will automatically rebalance before depositing them into the LP.
*   **Switch Fixed Ratio** to deposit slisBNB and BNB based at the same ratio as the LP. If a deposit risks imbalancing the pool beyond itsthresholds (e.g., an excess of one asset), then **Fixed Ratio** will become mandatory, requiring deposits of both slisBNB and BNB in the exact same ratio as in the LP to maintain pool stability.

![](https://cdn-images-1.medium.com/max/800/1*I3-Xk4NGhLHL2pIKp_P8XQ.png)

2\. Set your slippage tolerance. Then enter the amount of USD1 you wish to borrow, click on ‘Supply & Borrow’, and approve & deposit your assets. Upon successful deposit, you will receive your loan.

3\. You can also just supply collateral without borrowing any asset. This way, you will be able to enjoy maximal return from this vault. Remember you can always come back and borrow against your collateral.

![](https://cdn-images-1.medium.com/max/800/1*BhYCVn65cc_Gkay82AtUKg.png)

Note that when you supply your collateral, assets may be swapped via DEX aggregators to fulfill the request. If you’re supplying assets with Custom Ratio and your slippage tolerance is too low, our smart contract may not be able to make the swap and your deposit will fail.

### Repay and Withdraw

1.  First, repay your borrowed assets in part or in full.

![](https://cdn-images-1.medium.com/max/800/1*5I9yY-6cNtcPQfvcQguwXA.png)

2\. Choose to withdraw both assets at the same ratio as in the LP or at a custom ratio by switching between Fixed Ratio and Custom Ratio. Click on ‘Repay & Withdraw’ to repay your loan and withdraw your collateral.

If one of the assets in the LP is in short supply, that is, below a certain percentage threshold, withdrawals will be restricted to Fixed Ratio, or the other asset only.

![](https://cdn-images-1.medium.com/max/800/1*uDFM_hA4HVTJX0UV9Hhz9g.png)

3\. You can also or just repay your loan and let your collateral keep generating interest for you.

Note that when you withdraw, assets may be swapped via DEX aggregators to fulfill the request.

Technically, you can also swap assets via Smart Lending by depositing just one asset as collateral and withdrawing just the other without taking any loan.

### Liquidation

When you take out a loan on your collateral, please pay close attention to price fluctuations because whenever your LTV is below a certain threshold, Lista’s liquidation process will be triggered and a portion of your collateral will be sold to cover your loan. Refer to our [liquidation documentation](https://docs.bsc.lista.org/introduction/lista-lending/liquidation) for more information.

By [Lista DAO](https://medium.com/@ListaDAO) on [November 10, 2025](https://medium.com/p/be7836b2fcca).

[Canonical link](https://medium.com/@ListaDAO/listadaos-smart-lending-a-hands-on-tutorial-be7836b2fcca)

Exported from [Medium](https://medium.com) on January 15, 2026.