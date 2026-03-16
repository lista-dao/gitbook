# Markets

A Market is an isolated lending pool that pairs one collateral asset with one loan asset (eg; slisBNB/BNB). Each market operates independently, isolating risks to prevent spillover, and remains immutable after launch. Assets in each vault can be paired with multiple markets. Creating a market is permissionless.

#### Permissionless Market Creation

A standout feature of Lista Lending is its permissionless market creation, enabling users to deploy isolated lending markets with personalized key parameters. This approach diverges from traditional lending platforms and shifts the paradigm by empowering users to customize markets without centralized oversight.

Unlike conventional lending protocols, which mandate governance approval for listing assets or adjusting parameters and aggregate assets into a single shared pool, distributing risk protocol-wide, Lista Lending allows markets to operate independently, with parameters set at creation and managed flexibly through its upgradeable vault system.

#### Market Creation Mechanics

At Lista Lending, a market can be created after specifying:

* Loan Asset: The asset to be lent or borrowed (e.g., lisUSD).
* Collateral Asset: The asset securing loans (e.g., slisBNB).
* Liquidation Loan-To-Value (LLTV): depending on the loan and collateral assets, this can get as high as over 90% or as low as 50%.
* Oracle: Chainlink, Binance Oracle, Redstone, API3
* [Interest Rate Model](interest-rate-model-irm.md): Lista's adaptive rate model, dynamically adjusting based on utilization.
