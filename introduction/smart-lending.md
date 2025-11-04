# Smart Lending

### Introduction

Smart Lending introduces a new stream of income for Lista DAO’s users - depositing their collateral into liquidity pools (LPs) on Lista’s decentralized exchanges (DEX).

By seamlessly integrating collateral into a DEX LP, Smart Lending generates trading fees that are redistributed back to collateral providers. For the first time, users can leverage their debt and collateral as liquidity for trading, turning their idle assets into productive capital.

Traditionally, DEXs often suffer from risks like impermanent loss. Smart Lending addresses this by limiting withdrawals with imbalanced collateral ratio, maintaining pool stability.

Key benefits:

* Higher Yields: Your collateral earns LP fees from DEX trading activity.
* Flexible Asset Utilization: Explore a variety of strategies, creating customized collateral and debt combinations and in effect, reduces borrowing costs.
* Seamless Integration: Deposit collateral, borrow assets, and earn LP fees, all on the same page, at the same time.
* Risk Mitigation: Built-in controls prevent pool imbalances and impermanent loss.

Available Smart Lending markets at launch:

| Vault Market | Collateral Assets | Borrowable Assets |
| ------------ | ----------------- | ----------------- |
| USD1         | BTCB & solvBTC    | USD1              |
| BNB          | BTCB & solvBTC    | BNB               |
| USD1         | slisBNB & BNB     | USD1              |
| BNB          | slisBNB & BNB     | BNB               |

### How It Works

#### Deposit & Borrow

Just like on any other market at Lista Lending, users must first deposit their collateral before borrowing. Collateral assets deposited via Smart Lending will be sent into an LP on Lista.

As with most liquidity pools, there are 2 assets and traders can swap any one asset for the other at a certain price and trading fee. The prices of the assets are represented in the ratio between their volumes. If the prices of both assets remain unchanged, the ratio between them will also be fixed. Therefore, whenever collateral assets are deposited, they must be of the same ratio.

If assets are deposited under Fixed Ratio mode, Lista will calculate the exact amount of both assets based on their volume ratio in the pool and make the deposit. When under Custom Ratio mode, however, Lista will swap the excess asset for the other to rebalance them to the same volume ratio before sending them into the pool.

When the collateral is successfully deposited, users can start borrowing assets from the vault at a certain rate.

#### Repay & Withdraw

When a loan is repaid in part or in full, a certain amount of collateral will be available for withdrawal.

Collateral withdrawal works just like deposit. Under Fixed Ratio mode, the amount of assets withdrawn will be of the same ratio as they are in the pool. Under Custom Ratio mode, Lista will swap one asset into the other to the custom ratio.

#### Liquidation

Just like other products on Lista Lending, Smart Lending loans face the risk of liquidation. Whenever the loan to value ratio (LTV) falls below a certain threshold, Lista will take over the position and start the liquidation process. The corresponding amount of collateral will be withdrawn from the pool and swapped into other assets to cover the loan.

Please refer to our [liquidation documentation](https://docs.bsc.lista.org/introduction/lista-lending/liquidation) for more details.

### FAQ

(1) How does Smart Lending differ from traditional collateral loans?

Smart Lending allows using one or both assets as collateral borrowing, and the assets are also added to a DEX LP, earning DEX fees that scales with trading volume.

In contrast, traditional loans require locking a single asset, which can't be reused, leading to lower capital efficiency.

(2) How does Smart Lending differ from Lista CDP and Lista Lending single-collateral loans?

The main differences are:

1）Lower borrowing costs: In its early stages, Smart Lending will offer more attractive interest rates compared to other Lista markets, helping users utilize funds more efficiently. Plus, you can earn DEX trading fees, which further lowers borrowing costs.

2）Asset lending limits: The assets you can borrow depend on supply availability, both in Smart Lending and other Lista Lending categories. CDP loans have fewer restrictions and generally support continuous borrowing of lisUSD.

3）Collateral options: Lista CDP supports mainstream assets and some innovative assets (including LP tokens) as collateral. Lista Lending supports both mainstream and certain innovative assets, but both only support single-asset collateralization. Smart Lending allows you to borrow using one or both assets in the collateral pool and at launch, fewer tokens are supported.

(3) Can I deposit either of the two assets for borrowing?

Yes. Generally, you can collateralize either asset in a vault, or both at the same time. However, if one of the assets in the pool exceeds a certain threshold, you won’t be able to add more of that asset and will need to deposit the other.

Similarly, when withdrawing, if one asset is relatively low in volume, you will only be able to withdraw the other.

(4) What are the risks of Smart Lending?

In extreme cases, i.e, when DEX pools severely deviate from the equilibrium, your position may become extremely imbalanced and suffer from impermanent loss.

(5) What’s the difference between Fixed Ratio and Custom Ratio modes?

Under Fixed Ratio mode, you add collateral at a fixed ratio based on the ratio in the liquidity pool.

Custom Ratio mode: You can add collateral at any ratio according to your preference.

(6) How is the collateral value of LP tokens calculated?

To mitigate flash-loan price manipulation, tokens aren’t only recorded in their relative swap rate but also their USD value. Lista will first read the pool’s virtual price to know how many units of the underlying asset one LP token represents, and then convert it into the denominating currency (e.g. USD).

Using the slisBNB/BNB smart LP as an example:

1. The virtual price tells us: 1 LP = X BNB\
   e.g. if virtual price = 10, then 1 LP = 10 BNB.
2. If the lending system is denominated in USD, we then convert BNB to USD:\
   LP value (in USD) = virtual price (in BNB) × BNB price (in USD)

If currently, 1 BNB = 1,000 USD, then:

1 LP = 10 BNB × 1,000 USD per BNB = 10,000 USD

\
