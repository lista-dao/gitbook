# Algorithmic Market Operations (AMO)

To maintain lisUSD’s price stability & peg at $1, it is crucial to balance lisUSD’s supply and demand in the circulating market and LPs. Previously, the borrow rate of lisUSD was regularly adjusted to indirectly affect the supply and demand of lisUSD. With the launch of our AMO, Lista DAO will implement a dynamic borrow rate, similar to Curve Finance’s [MonetaryPolicy contracts](https://docs.curve.fi/crvUSD/monetarypolicy/) for crvUSD, to further strengthen price stability of lisUSD.

At the start, the Lista core team will decide the parameter based on market conditions. In the futures, parameter changes will require a proposal and community vote.&#x20;

## Interest Rate Mechanics

The interest rates in lisUSD markets are not static but fluctuate based on a set of factors, including:

1. The price of lisUSD, which is determined through Binance oracle.
2. The variables r0, and Beta.

### The formula for calculating the Borrowing interest rate (r) is as follows:

![](https://lh7-us.googleusercontent.com/docsz/AD\_4nXfRbturnppWrw7w0t-PLXhA2vzUoiV-iNor96k0jyzwnkHgvWjGfpEo85koiXXrodJJdSlZKPgDfYANjMgBFRgzIrQuoNqbLL\_m6Ku7XoCEPIUOFU2D6hvjwJTgzzcDyMAEoIlnBlIy4fW\_S2m7\_Dwghk5v?key=qpnu5MtZ54GEwy9P7UA52A)

### Key variables in this calculation include:

**r:** Annual Percentage Yield (APY)

**r0**: Default annual rate, different for each collateral type, configured when launched on the smart contract

**exp(x)**: Exponential function of  x (e\*e\*e\*...\*e)

**Price(lisUSD)**: Current price of lisUSD, obtained from an oracle

**Beta**: Adjustment parameter, configured when launched on the smart contract

_Note\* For each different Collateral, a different r0 is set. However, the maximum r0 will always be capped at 200% or less at any point in time._&#x20;

_Note\* For each different Collateral, a different Beta will be set. As seen in r calculation, the Beta has a huge effect on x, and thus r._&#x20;

### Example:

r0 = 8%, Price(lisUSD) = $0.98, Beta = 2%\
r = 8% \* exp\[(1 - 0.98)/2%] = 21.746%&#x20;

This means if the price of lisUSD is $0.98, with  r0 = 8%  and Beta = 2% , the current borrowing rate will be 21.746%. Users will repay lisUSD, reducing the supply.

## Calculation for r&#x20;

For accuracy and consistency, both r and r0 are expressed in terms of 10^27 to denote precision and are calculated per second.

### Here are the steps taken when calculating for r:

1. Retrieve the current price of lisUSD to get price(lisUSD). (r0, Beta is fixed for each collateral)
2. Update the current borrow rate every 15 minutes or when users interact with the contract (borrow, repay)
3. Calculate the borrow interest based on the current rate

The exact formula for calculating the interest rate (r) is as follows:

![](https://lh7-us.googleusercontent.com/docsz/AD\_4nXfgarTeoLR1RoaLXOnfPPHESQmX4s-A14bVKyUlWWtxtY6XIYSqS1Tz\_jFC8Uc6CMPQ8Yopx9FZ8ltTyRyqy9bXRZTiFGrq7WEGitmIROHEHnA2LoLJUfy\_sd6uaRRJlbbGuvyr0ER-YCKi1yZ9URa5dEtL?key=qpnu5MtZ54GEwy9P7UA52A)

**r**: Interest rate per second, in terms of 10^27, converted to APY, always be less than 200% at any point in time

**r0**: Default rate, different for each collateral type, configured when launched on the smart contract

**exp(x)**: Exponential function of x ((e\*e\*...\*e)

**Price(target)**: Target price ($1), calculated in terms of 10^8

**Price(lisUSD)**: Current price of lisUSD, obtained from Binance oracle, in terms of 10^8

**Beta**: Adjustment parameter, configured when launched on the smart contract, tentative rang: (3 \* 10^5, 10^8)

**APY(Default)**: Confirms r0&#x20;

All smart contract details can be found [here](./#source-code-parameters).&#x20;

## Source code parameters:

r0:

```solidity
DynamicDutyCalculator.ilks(address _collateral).rate0
```

exp(x):

```solidity
  function exp(int256 delta, int256 beta) internal pure returns (uint256) {
        if (delta < 0) {
            int256 power = delta * FixedMath0x.FIXED_1 / beta;
            int256 _r = FixedMath0x._exp(power);
            return uint256(_r) * 1e18 / uint256(FixedMath0x.FIXED_1);
        } else if (delta > 0 ) {
            delta = -1 * delta;
            int256 power = delta * FixedMath0x.FIXED_1 / beta;
            int256 _r = FixedMath0x._exp(power);
            return uint256(FixedMath0x.FIXED_1) * 1e18 / uint256(_r);
        } else {
            return 1e18;
        }
    }
```

Price(target):

```solidity
uint256 constant PEG = 1e8;
```

Price(lisUSD):&#x20;

[Oracle address](https://bscscan.com/address/0xf3afD82A4071f272F403dC176916141f44E6c750#readProxyContract)

```solidity
uint256 price = oracle.peek(address _lisUSD)
```

Beta:&#x20;

```solidity
DynamicDutyCalculator.ilks(address _collateral).beta

```
