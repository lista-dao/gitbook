# Smart Lending & Swap

## Smart Lending

Smart Lending is Lista’s next generation lending solution where collaterals are deposited into liquidity pools at Lista’s decentralized exchange (DEX). This opens up an entirely new income stream - trading fees.

Traditionally, DEXs often suffer from risks like impermanent loss. Smart Lending addresses this by limiting withdrawals with imbalanced collateral ratio, maintaining pool stability.

### How It Works

#### Deposit & Borrow

Just like on any other market at Lista Lending, users must first deposit their collateral before borrowing. Collateral assets deposited via Smart Lending will be sent into an LP on Lista.

As with most liquidity pools, there are 2 assets and traders can swap any one asset for the other at a certain price and trading fee. The prices of the assets are represented in the ratio between their volumes. If the prices of both assets remain unchanged, the ratio between them will also be fixed. Therefore, whenever collateral assets are deposited, they must be of the same ratio.

If assets are deposited under Fixed Ratio mode, Lista will calculate the exact amount of both assets based on their volume ratio in the pool and make the deposit. When under Custom Ratio mode, however, Lista will swap the excess asset for the other to rebalance them to the same volume ratio before sending them into the pool.

When the collateral is successfully deposited, users can start borrowing assets from the vault at a certain rate.

#### Repay & Withdraw

When a loan is repaid in part or in full, a certain amount of collateral will be available for withdrawal.

Collateral withdrawal works just like deposit. Under Fixed Ratio mode, the amount of assets withdrawn will be of the same ratio as they are in the pool. Under Custom Ratio mode, Lista will swap one asset into the other to the custom ratio.

When 'Pro Mode' is toggled on, liquidity positions can be withdrawn as a standalone token. For instance, you can withdraw your slisBNB/BNB & BNB liquidity position and deposit it into slisBNB/BNB & USD1 market because the collateral is the same.

Sometimes, liquidity positions can not be fully withdrawn (leaving < $0.01 in the pool). When this happens, please switch to Fixed Ratio and you will receive your assets in full.

#### Liquidation

Just like other products on Lista Lending, Smart Lending loans face the risk of liquidation. Whenever the loan to value ratio (LTV) falls below a certain threshold, Lista will take over the position and start the liquidation process. The corresponding amount of collateral will be withdrawn from the pool and swapped into other assets to cover the loan.

Please refer to our [liquidation documentation](https://docs.bsc.lista.org/introduction/lista-lending/liquidation) and [this article](https://medium.com/@ListaDAO/everything-you-need-to-know-about-liquidation-on-lista-smart-lending-dbb339994f30) for more details.

## Smart Swap

Smart Swap is a dedicated front end for Lista’s DEX. This DEX is open for Lista users to swap assets, provide liquidity via Smart Lending, and also available as one of the routes in Binance Swap.

Smart Swap works just like most other DEXs:

<figure><img src="../.gitbook/assets/Swap.png" alt=""><figcaption></figcaption></figure>

where you get to choose the assets you wish to swap and receive, slippage tolerance, minimum received assets, price impact, and trading fee that goes to Smart Lending liquidity providers.
