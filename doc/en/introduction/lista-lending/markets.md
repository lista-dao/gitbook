# Markets

A Market is an isolated lending pool that pairs one collateral asset with one loan asset (eg; USDT/BNB). Each market operates independently, isolating risks to prevent spillover, and remains immutable after launch. Each vault can have multiple markets. Creating a market is permissionless.

Key features includes the following:

1. One collateral asset, one loan asset per market
2. Loan parameters are immutable
3. Each market operates independently from one another
4. Permission-less: New market doesn’t require governance vote to be created - more here
5. Transparent Rules: Clear conditions for lending and borrowing

#### Permissionless Market Creation

A standout feature of Lista Lending is its permissionless market creation, enabling users to deploy isolated lending markets defined by key parameters. This approach diverges from traditional lending platforms and shifts the paradigm by empowering users to customize markets without centralized oversight.

Unlike conventional lending protocols, which:

1. Mandate governance approval for listing assets or adjusting parameters.
2. Aggregate assets into a single shared pool, distributing risk protocol-wide,

Lista Lending allows markets to operate independently, with parameters set at creation and managed flexibly through its upgradeable vault system.

#### Market Creation Mechanics

In Lista Lending, users can create a market by specifying:

* Loan Asset: The asset to be lent or borrowed (e.g., lisUSD).
* Collateral Asset: The asset securing loans (e.g., slisBNB).
* Liquidation Loan-To-Value (LLTV): 80%
* Oracle: Chainlink, Binance Oracle, Redstone, API3
* Interest Rate Model: The protocol’s adaptive rate model, dynamically adjusting based on utilization.
