# Stable Pool - Price stability Module (PSM)

## Price Stability Module (PSM)

The Peg Stability Module (PSM) is a critical component designed to maintain the stability and usability of lisUSD by facilitating seamless conversions between centralized stablecoins and lisUSD. Here’s a breakdown of its main features:

### 1. Convert Fee Structure[​](https://helio.money/docs/price-stability#hays-price-stability-mechanism) <a href="#hays-price-stability-mechanism" id="hays-price-stability-mechanism"></a>

With the launch of the PSM, users will be able to mint lisUSD using USDT or USDC at a 1:1 ratio with a 0% mint fee.&#x20;

NOTE: The 0% fee is not permanent. In the future, if lisUSD trades at a premium, a mint fee may be introduced, with fee adjustments made in precise increments of 0.01%.

A) Fee precision: 1 basis point (0.01%)

B) Convert fee will be charged in lisUSD

### 2. PSM Minting Cap

The Peg Stability Module (PSM) will have a cap of 5 million lisUSD at launch, supporting the conversion of up to 5 million centralized stablecoins.

A) Once the cap is reached, adjustments will be made to accommodate additional conversions.

B) Prior to launch, 5 million lisUSD will be pre-minted and deposited into the PSM contract.

### 3. Redeeming Centralized Stablecoins

For users who wish to convert lisUSD back into centralized stablecoins, a daily limit of 500,000 lisUSD will apply, constrained by the available reserves in the vault.&#x20;

These conversions will incur a 2% fee so as to encourage users to swap lisUSD into other stablecoins directly on PancakeSwap for potentially better rates.

The centralized stablecoins acquired via the PSM will play a critical role in maintaining the stability of lisUSD, ensuring its value remains closely pegged to 1 USD.

## lisUSD Stablepool

Through the use of our PSM module, the stablepool is created under our [Earn](https://lista.org/earn) section here:

<figure><img src="../../../.gitbook/assets/image (2) (1) (1).png" alt=""><figcaption></figcaption></figure>

Users can now deposit their USDT to enjoy a yields coming from LISTA token emission, as well as lisUSD saving rate. Through the PSM, the USDT deposited into the USDT Stablepool will be swapped into lisUSD at a 1:1 ratio and deposited into the lisUSD stable pool.

More information on lisUSD saving rate (LSR) can be found [here](lisusd-saving-rate-lsr.md) in the next section.\
