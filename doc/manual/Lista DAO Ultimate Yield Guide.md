Lista DAO Ultimate Yield Guide
================

Lista DAO, with $2 billion in TVL, is one of the leaders in the BNBFi ecosystem. It offers diverse yield opportunities through products like lisUSD CDP, slisBNB LST, Lista Lending, and Smart Lending.

* * *

### Lista DAO Ultimate Yield Guide

![](https://cdn-images-1.medium.com/max/800/1*kbIphL6Y8fKZRDM8ca44Mw.png)

Lista DAO, with $2 billion in TVL, is one of the leaders in the BNBFi ecosystem. It offers diverse yield opportunities through products like lisUSD CDP, slisBNB LST, Lista Lending, and Smart Lending.

Today, let's explore effective yield strategies on Lista DAO. Whether you're a beginner or an experienced user, you can safely earn stable returns on Lista.

### Overview

### The Potential of slisBNB and clisBNB

Most high-yield strategies on Lista DAO start or end with liquid staking—converting BNB to slisBNB, then minting clisBNB to participate in Binance Launchpool.

The steps are as follows:

*   [Stake BNB on the Lista DAO platform](https://lista.org/liquid-staking/BNB) to get slisBNB, a liquid staking token with approximately 1–3% annual yield.
*   Use slisBNB or BNB to mint clisBNB—this can be obtained by [depositing slisBNB or BNB into Lista's CDP](https://lista.org/cdp/dashboard), [depositing slisBNB into Lista Lending](https://lista.org/lending/market/0x2bb68bc7f70186f3d4f16db6a19986df6c6cdea3e589c1ae3d30b56b0632c5ec), or [minting slisBNB/BNB LP tokens](https://lista.org/rewards#thena_slisBNB_BNB_correlated_LP_STAKE_POOL). Depositing slisBNB into CDP allows users to borrow our native stablecoin lisUSD.
*   At the same time, clisBNB allows users to participate in Binance Launchpool rewards while maintaining their collateral on Lista DAO or Lista Lending.
*   In this way, users can simultaneously earn staking/collateral yields and Binance Launchpool new token rewards.

Next are more advanced strategies.

1.  slisBNB Loop Strategy

**Principle:**

*   Perform BNB liquid staking on [Lista Liquid Staking](https://lista.org/liquid-staking/BNB) to get slisBNB.
*   Use slisBNB as collateral on Lista Lending to borrow more BNB.
*   Repeat steps 1–2 to loop the strategy, gradually amplifying the position.

**Estimated APY**: Approximately 10% per loop (around 18% from Launchpool rewards and liquid staking rewards, minus around 10% in borrowing interest).

**Maximum APR after looping**: This strategy can theoretically be looped up to 28 times, with APR reaching over 100%. The actual number of loops and returns depend on market conditions and borrowing rates.

**Risks**:

*   **Interest rate volatility**: Rising borrowing rates on Lista Lending may erode profits. When Vault utilization exceeds 90%, borrowing rates will increase significantly.
*   **Withdrawal and repayment timing**: Each loop repayment needs to be priced in BNB; converting slisBNB back to BNB has a 7-day waiting period. slisBNB can also be directly swapped back to BNB on PancakeSwap, but pay attention to the exchange rate when trading volume is high.

2\. PT-clisBNB Fixed-Rate Loop Strategy

Combining Lista DAO's liquid staking and lending capabilities with Pendle Finance's fixed-rate tokens to create a high-yield, efficient loop.

**Principle:**

*   Stake BNB on [Lista Liquid Staking](https://lista.org/liquid-staking/BNB) to get slisBNB.
*   Swap slisBNB to PT-clisBNB (Pendle's principal token) on [Pendle Finance](https://app.pendle.finance/trade/pools/0xbd577ddabb5a1672d3c786726b87a175de652b96/zap/in?chain=bnbchain) to lock in the yield rate.
*   [Use PT-clisBNB as collateral](https://lista.org/lending/market/0x0e9ce37ed19824e0698b8cf1855bef55cefdc82f37c321c3812d90135f476709) on Lista Lending to borrow more BNB.
*   Repeat steps 1–3 to loop the strategy, gradually amplifying the position.

**Estimated APY**: Approximately 8–10% per loop (from PT-clisBNB's fixed yield of 8–10%).

**Maximum APR after looping**: Up to 4 loops, APR can reach approximately 30–40%, depending on market conditions and borrowing rates.

**Highlights**: PT-clisBNB provides stable returns through Pendle's fixed-rate mechanism. When amplifying yields through collateralized borrowing on Lista Lending, this strategy is more stable than using more volatile assets, suitable for risk-averse investors seeking stable returns.

**Risks:**

*   **Interest rate volatility**: Rising borrowing rates on Lista Lending may erode profits. When Vault utilization exceeds 90%, borrowing rates will increase significantly.
*   **Liquidation risk**: Each loop increases leverage. If the collateral (PT-clisBNB) value decreases or the borrowed BNB value increases, liquidation risk will rise.
*   **Expiration date**: Pendle PT assets have expiration dates. Users need to repay and roll into new Pendle pools by the expiration date for subsequent operations.

3\. USD1 Binance Launchpool Strategy

Collateralize USD1 on Lista Lending to borrow BNB, then perform liquid staking on BNB to get slisBNB and participate in Binance Launchpool.

Principle:

*   Deposit USD1 (stablecoin) into [Lista Lending's BNB market](https://lista.org/lending/market/0xd384584abf6504425c9873f34a63372625d46cd1f2e79aeedc77475cacaca922).
*   Collateralize USD1 to borrow BNB.
*   [Perform liquid staking on BNB to get slisBNB](https://lista.org/liquid-staking/BNB) and earn liquid staking rewards and Binance Launchpool rewards. Note that Launchpool participation requires using Binance MPC wallet.
*   Alternatively, loop by swapping slisBNB to PT-clisBNB on Pendle, collateralize PT-clisBNB to borrow BNB, then repeat step 3.

**Estimated APR**: Approximately 18% (BNB liquid staking + Binance Launchpool rewards).

**Maximum APR after looping**: No loops, this is a single-deposit strategy.

**Highlights**: Simple and low-risk strategy, suitable for beginners or those seeking stable returns and risk avoidance.

**Risks**:

*   **USD1 depegging risk**: Although the probability is low, if USD1 depegs, it may lead to loan liquidation.
*   **Interest rate volatility**: Rising borrowing rates on Lista Lending may reduce profitability, especially after utilization exceeds 90%, when rates will increase significantly.

4\. Collateralize BTC or Other Assets to Borrow BNB for Staking/Launchpool

Collateralize BTC (BTCB) or ETH on Lista Lending to borrow BNB, and perform liquid staking on slisBNB to earn stable staking rewards and Binance Launchpool rewards. No loops.

Principle:

*   Deposit [BTC](https://lista.org/lending/market/bsc/0x9a7d48f4d5a39353ff9d34c4cefc2dc933bcc11e8be1a503db0910678763c394?tab=market) or its derivative assets (mBTC, SolvBTC, etc.) into Lista Lending market to borrow BNB.
*   [Perform liquid staking on BNB to get slisBNB](https://lista.org/liquid-staking/BNB).
*   Hold slisBNB while earning staking rewards and Binance Launchpool rewards.

**Estimated APR**: 17–18% (slisBNB's APR minus the interest rate from borrowing using BTC and other assets as collateral).

**Maximum APR after looping**: No loops, this is a single-deposit strategy.

**Highlights**: Using BTC and its derivative assets to borrow BNB maintains exposure to high-value assets with lower volatility than other coins. While pursuing certain BNB returns, you retain ownership of mainstream assets.

Risks:

*   Price volatility risk: BTC or ETH price declines may lead to liquidation, even though the lending itself is relatively low risk.

By [Lista DAO](https://medium.com/@ListaDAO) on [November 10, 2025](https://medium.com/p/0f6ffc4bae05).

[Canonical link](https://medium.com/@ListaDAO/lista-dao-%E7%BB%88%E6%9E%81%E7%BE%8A%E6%AF%9B%E6%8C%87%E5%8D%97-0f6ffc4bae05)

Exported from [Medium](https://medium.com) on January 15, 2026.
