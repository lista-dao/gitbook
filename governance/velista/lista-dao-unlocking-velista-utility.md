# Lista DAO: Unlocking veLISTA Utility

Lista DAO is committed to expanding the utility of veLISTA, introducing a series of features designed to provide long-term benefits for holders. These updates aim to strengthen capital efficiency, enhance user engagement, and drive sustainable growth within the ecosystem. By holding veLISTA, users will gain access to exclusive financial benefits that improve their overall borrowing and staking experience.

## lisUSD Rebate Mechanism

As the first of these enhancements, we are introducing the Borrow lisUSD Rebate Mechanism, a feature that directly reduces borrowing costs for veLISTA holders.

The borrow rebate mechanism rewards users by providing lisUSD rebates based on their veLISTA holdings, allowing them to optimize their borrowing experience within the Lista DAO ecosystem.

With the launch of lisUSD’s Rebate mechanism, eligible veLISTA holders can now benefit from both the lisUSD borrow rebate and LISTA emission rewards simultaneously.

More veLISTA utility features will be announced soon

## Core Logic

The borrow rebate percentage will be calculated based on the amount of veLISTA a user holds, following the function:

F(x) = A\*ln(x) + B

Where:

* x = veLISTA amount held by the user
* ln = natural logarithm function
* f(x) = borrow rebate percentage
* A & B will be adjusted according to market conditions, with the core Lista team having the authority to make the final decision.

The function follows these thresholds:

* If x ≤ 10k veLISTA, f(x) = 0 (No rebate)
* If x ≥ 1000M veLISTA, f(x) ≤ 2.5% (Maximum rebate cap)

With the threshold being introduced, the function is currently set at the following:

&#x20; f(x) = 0.002171⋅ln(x) - 0.02

## Examples

### Example 1: No Rebate (Threshold Not Met)

User A borrows 100,000 lisUSD at a 10% borrow rate.\
User A holds 10k veLISTA → Below the threshold, so no rebate applies.\
Rebate rate: 0%\
Weekly rebate: 0 lisUSD

### Example 2: Partial Rebate

User B borrows 100,000 lisUSD at a 10% borrow rate.

User B holds 1M veLISTA, applying the function:\
f(1,000,000) = 0.002171 × ln(1,000,000) - 0.02\
\= 0.00999347221 x 100%

\=0.99%

Weekly rebate calculation: (100,000 × 0.99%) / 365 × 7\
\= 18.986 lisUSD per week

### Example 3: Maximum Rebate Cap Reached

User C borrows 100,000 lisUSD at a 10% borrow rate.\
User C holds 10B veLISTA, exceeding the 1000M cap.

Rebate rate: 2.5% (Maximum cap applied).

Weekly rebate calculation:\
(100,000 × 2.5%) / 365 × 7\
\= 47.945 lisUSD per week

## User Flow

1. Borrowing lisUSD: Users borrow lisUSD and pay interest as usual.
2. Rebate Calculation: The system calculates the user’s veLISTA holdings and determines the borrow rebate APR.
3. Rebate Processing: Based on the function above, the hourly rebate amount is computed as f(x) \* borrow lisUSD amount.
4. Rebate Period: Rebates are accumulated from Wednesday of week N to Wednesday of week N+1.
5. Claiming Rebates: If no issues arise, users can claim their lisUSD rebate every Thursday.
