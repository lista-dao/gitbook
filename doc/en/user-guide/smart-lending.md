# Smart Lending

Take our slisBNB/BNB vault for example and assume we are borrowing USD1. Select ‘Smart Lending Zone’ under ‘Lending’ on the top navigation bar. Or, on [Lista’s Lending page](https://lista.org/lending/borrow?onlySmartLending=1&utm_source=gitbook&utm_medium=article&utm_campaign=smart-lending), toggle ‘Smart Lending’ and select [this vault](https://lista.org/lending/smart-market/bsc/0x9ae45397a8063220d4cdb41ad9268d4c173dd18ca778171e9dee0644dfbe4cbd?tab=market&utm_source=gitbook&utm_medium=article&utm_campaign=smart-lending).

<figure><img src="../.gitbook/assets/Smart Lending.png" alt=""><figcaption></figcaption></figure>

#### Supply Collateral and Borrow

1. Supply collateral (slisBNB, BNB, or both):

Your assets are deposited into an LP for Lista’s DEX and you can choose to supply any one of them or both at a certain ratio.

* Switch to Custom Ratio to supply slisBNB and/or BNB at any ratio. Lista will automatically rebalance before depositing them into the LP.
* Switch Fixed Ratio to supply slisBNB and BNB based at the same ratio as the LP. If a deposit risks imbalancing the pool beyond its thresholds (e.g., an excess of one asset), then Fixed Ratio will become mandatory, requiring deposits of both slisBNB and BNB in the exact same ratio as in the LP to maintain pool stability.

![](<../.gitbook/assets/unknown (1).png>)![](<../.gitbook/assets/unknown (2).png>)

2. Set your slippage tolerance. Then enter the amount of USD1 you wish to borrow, click on ‘Supply & Borrow’, and approve & transfer your assets. Upon successful deposit, you will receive your loan.
3. You can also just supply collateral without borrowing any asset. This way, you will be able to enjoy maximal return from this vault. Remember you can always come back and borrow against your collateral.&#x20;

![](<../.gitbook/assets/unknown (3).png>)

Note that when you supply your collateral, assets may be swapped via DEX aggregators to fulfill the request. If you’re supplying assets with Custom Ratio and your slippage tolerance is too low, Lista's smart contract may not be able to make the swap and your transaction will fail.

#### Repay and Withdraw

1. First, repay your borrowed assets in part or in full. The amount of collateral available for withdrawal depends on your outstanding loan.

![](<../.gitbook/assets/unknown (4).png>)

2. Choose to withdraw both assets at the same ratio as in the LP or at a custom ratio by switching between Fixed Ratio and Custom Ratio. Click on ‘Repay & Withdraw’ to repay your loan and withdraw your collateral.

If one of the assets in the LP is in short supply, that is, below a certain percentage threshold, withdrawals will be restricted to Fixed Ratio, or the other asset only.

![](<../.gitbook/assets/unknown (5).png>)![](<../.gitbook/assets/unknown (6).png>)

3. You can also just repay your loan and let your collateral keep generating interest for you.

Note that when you withdraw, assets may be swapped via DEX aggregators to fulfill the request.

Technically, you can also swap assets via Smart Lending by depositing just one asset as collateral and withdrawing just the other without taking any loan.&#x20;

#### Liquidation

When you take out a loan on your collateral, please pay close attention to price fluctuations because whenever your LTV is below a certain threshold, Lista’s liquidation process will be triggered and a portion of your collateral will be sold to cover your loan. Refer to our [liquidation documentation](https://docs.bsc.lista.org/introduction/lista-lending/liquidation) for more information.

\
<br>
