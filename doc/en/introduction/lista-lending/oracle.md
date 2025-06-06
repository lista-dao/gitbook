# Oracle

### What is an Oracle?

Oracles are smart contracts that provide external data, particularly price information, to blockchain applications. In lending protocols like Lista Lending, oracles should provide price data with 8 decimal places of precision. For example, if the price of 1 BTC is 80,000, it would return 80,000 \* 100,000,000 = 8,000,000,000,000.

### Oracles in Lending Markets

Traditional lending protocols rely on oracles to:

* Determine the value of collateral assets
* Calculate borrowing capacity
* Trigger liquidations when positions become undercollateralized
* Enable accurate interest rate calculations

### Oracle Implementation in Lista Lending

All oracles used in Lista Lending markets implement the IOracle interface, which has a single, standardized function:

`function peek(address asset) external view returns (uint256);`

This function returns the price of 1 collateral token quoted in usd.\
\
There is a single function:

`function getPrice(MarketParams calldata marketParams) external view returns (uint256);`

This function returns the price of 1 unit of collateral token quoted in the loan token, with appropriate scaling to account for decimal differences between tokens.

### Types of Oracles Compatible with Lista Lending

Various oracle implementations can be used with Lista Lending markets:

1. Price Feed Oracles: Utilize external price feeds (like Chainlink, Redstone, API3, Pyth, Chronicle) to calculate asset exchange rates.
2. Exchange Rate Oracles: Specialized for wrapped tokens or rebasing tokens where the exchange rate is deterministic (like wstETH/stETH).
3. Fixed-Price Oracles: Used for assets with known or predefined exchange rates, such as stablecoins pegged to the same value.

### Key Oracle Characteristics in Lista Lending Markets

* Immutable: Once a market is deployed, its oracle address cannot be modified
* Independent: Each oracle operates autonomously and can use different pricing sources
* Flexible Implementation: Curators can leverage various data sources while maintaining a consistent interface

### Oracle Selection by Market Curators

Market curators (not Lista Lending) are responsible for selecting and implementing appropriate oracles for their markets. Each Lista Lending market specifies its oracle in the market parameters:

CollateralAsset/LoanAsset (LLTV%, OracleAddress, IRMAddress)

### Oracle Security Considerations

The security of an oracle is critical to the safety of a Lista Lending Market. Users should:

* Verify the oracle implementation for any market they interact with
* Understand the price sources being used
* Consider potential manipulation vectors or failure modes

The immutable nature of Lista Lending Markets means oracle selection is a permanent decision that defines the market's risk profile.

### Oracle community section

Some community members contributed to adapters that could be plugged into oracles.

* Morpho Association nor author of the repository cannot be held responsible for any losses or damages that may result from the use of this information.
* Users are advised to conduct their own research and exercise caution when applying any strategies or methods described herein.

\
\
\
