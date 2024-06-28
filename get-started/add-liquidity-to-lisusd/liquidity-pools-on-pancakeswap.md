# Liquidity Pools on PancakeSwap

Follow the steps below to add liquidity to a token pair containing lisUSD on PancakeSwap.

### **Adding Liquidity** <a href="#v3gkh990tmq9" id="v3gkh990tmq9"></a>

1. **Find** lisUSD **Liquidity Pools:** Visit PancakeSwap and go to [Trade > Liquidity](https://pancakeswap.finance/liquidity).
2. **Connect Wallet:** Click **Connect Wallet** in the top right corner and choose your wallet.
3. **Add Liquidity:** Click the **Add Liquidity** button.
4. **Select Tokens:** Choose lisUSD and the pair you'd like to provide liquidity for. Input the amount of each token you'd like to deposit.
5. **Choose a Liquidity Model**
   1. **V2:** Adding liquidity to a token pair will generate a fungible LP token. There must be a balance of values between both tokens. LP tokens can later be staked on yield farms.
   2. **V3:** Concentrated liquidity. You can choose which swap price range between the tokens to provide liquidity. Each position is unique and will generate a non-fungible token representing the token pair's liquidity position.
   3. **StableSwap:** A liquidity model that allows you to trade stable pairs with a lower slippage based on an invariant curve slippage function. It is designed to swap specific assets that are priced closely.
6. **Confirm Liquidity Supply:** Click **Confirm Supply** and review the details. Confirm the transaction in your wallet. You'll receive LP tokens representing your share of the liquidity pool.

### **Removing Liquidity** <a href="#tikzx6hdkw43" id="tikzx6hdkw43"></a>

1. **Find Your Liquidity Positions:** Visit PancakeSwap, connect your wallet and go to [Trade > Liquidity](https://pancakeswap.finance/liquidity).
2. **Select the Pool:** Find your desired liquidity pool and click **Remove**.
3. **Choose Removal Percentage:** Select the percentage of liquidity you'd like to remove (e.g., 25%, 50%, 100%).
4. **Approve Removal:** If necessary, click **Approve** and confirm the transaction in your wallet.
5. **Confirm Removal:** Click **Remove** to confirm your wallet's transaction. Your tokens will be returned to your wallet, and your LP tokens will be burned.
