# Fixed Rate & Term Loans

There are 2 interest rate and term options to choose from when borrowing at Lista: flexible and fixed.

Flexible interest rate works just like other lending products at Lista DAO where borrowers can borrow and repay their loans any time and the interest rate fluctuates depending on the utilization rate, as dictated by our [Interest Rate Model](https://docs.bsc.lista.org/introduction/lista-lending/interest-rate-model-irm).

Fixed interest rate requires the borrower choose a fixed term for their loan and lock in an interest rate throughout the term. Available terms include 7, 14, and 30 days. Fixed rate will be different from the current flexible interest rate, depending on the market conditions.

Borrowers can choose to repay the loan in part or in full before the term expires but must receive a penalty equal to 50% of the remaining interest on the repaid principal.

Let’s say Alice borrowed 10,000 lisUSD at a 2% interest rate (yearly) for 14 days. If Alice chooses to repay 6,000 lisUSD after 5 days, then:

Total interest charged = 10000 \* 2% \* 5/365 = 2.74 lisUSD

This means Alice will be repaying her interest (2.74 lisUSD) first, then her principal for 6,000 - 2.74 = 5,997.26 lisUSD

But since Alice repaid her loan before the term expires, she will receive a penalty equal to 50% of the remaining interest:

50% \* 5997.26 \* 2% \* (14-5)/365 = 1.48 lisUSD

The amount of principal repaid by Alice’s 6,000 lisUSD is: 6000 - 2.74 - 1.48 = 5995.78 lisUSD

This means Alice will be paying a 2.74 lisUSD interest, 1.48 lisUSD penalty, and 5995.78 lisUSD principal.

Thus, at any time during the term, the minimum amount for loan repayment must be greater than the interest accrued and the penalty because the interest and penalty must be repaid first.

When its term expires, the fixed term loan will turn into a flexible loan.
