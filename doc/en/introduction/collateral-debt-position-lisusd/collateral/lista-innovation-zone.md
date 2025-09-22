# Lista Innovation Zone

The Lista Innovation Zone is a new initiative by Lista DAO designed to integrate new Liquid Restaking Tokens (LRTs) and Liquid Staking Derivatives (LSDs) into our ecosystem, by listing them as potential collateral options for borrowing lisUSD. This move reflects our commitment to keeping pace with the rapid innovations in the crypto and DeFi landscapes, ensuring that Lista does not fall behind in adopting new technologies and asset classes.

However, we are also aware of the increased risks associated with these new assets which could compromise the stability and security of Lista’s platform. Hence, assets that are listed under Lista’s innovation zone will be subjected to more stringent security checks, and higher collateral ratio requirements.

Below is the list of assets under the Lista Innovation Zone:

* USD1 (World Liberty Finance)
* solvBTC (Solv Protocol)
* SolvBTC.BNN (Babylon)
* Stone (Stakestone)
* sUSDX (Stables Labs)
* pumpBTC (PumpBTC)
* mBTC (Magpie)
* mCAKE (Magpie)
* mwBETH (EigenPie)
* USDF (Astherus)
* asUSDF (Astherus)

### Pancake Swap LP Collateral

Users can also utilize their PancakeSwap LP positions to borrow lisUSD under our innovation zone while maintaining exposure to yield opportunities.

In phase 1, the following LP pairs that will be supported are as follows:

* USDT/WBNB V3 5bp
* USDT/USDC V3

#### Key Features of the Integration <a href="#id-6149" id="id-6149"></a>

**Supported LP Tokens**: The integration supports PancakeSwap’s V2, V3, Infinity, and StableSwap LP tokens, starting with those holding the highest Total Value Locked (TVL) in Phase 1, with plans for gradual expansion.

**Collateral Valuation**: Since there is no direct market for pricing LP tokens, our custom LP Oracle and LP Manager system will provide accurate valuation of the LP tokens with built-in safety factors to mitigate under collateralization and liquidation risks.

**Risk Management**: To safeguard the protocol, we’ve implemented the following risk management

1. Conservative safety factors in our LP price calculation using LP Oracle & LP manager. This means that we will have a
2. borrowing caps per LP type, and circuit breakers that pause borrowing if major tokens (BTC, ETH, BNB) experience a price drop of more than 5% within 10 minutes.

**Liquidation Process**: In the event of collateral value falling below the Loan-to-Value (LTV) threshold, our system supports LP redemption before triggering a Dutch auction, maximizing recovery value for users.

**Profit Sharing**: To strengthen our partnership with PancakeSwap, 50% of borrow interest and liquidation fees generated from lisUSD borrowed against LP tokens will be shared with PancakeSwap, fostering mutual growth and ecosystem benefits.

#### Example <a href="#id-8ec5" id="id-8ec5"></a>

Here is a video example of how users can borrow lisUSD using Pancake swap LP tokens under our CDP zone. In this example, we will be using USDT/USDC V3 LP tokens as an example.

{% embed url="https://www.loom.com/share/96cac51ad21f497a9edaa9d2506b07ce" %}
