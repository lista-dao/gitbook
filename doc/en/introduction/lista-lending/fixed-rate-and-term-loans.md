# Fixed Rate & Term Loans

There are 2 interest rate options to choose from when borrowing at Lista: flexible and fixed.

Flexible interest rate works just like other lending products at Lista DAO where borrowers can borrow and repay their loans any time and the interest rate fluctuates depending on the utilization rate, as dictated by our [Interest Rate Model](https://docs.bsc.lista.org/introduction/lista-lending/interest-rate-model-irm).

Fixed interest rate requires the borrower choose a fixed term for their loan and lock in an interest rate throughout the term. Available terms include 7, 14, and 30 days. Fixed rate will be different from the current flexible interest rate, depending on the market conditions.

Borrowers can choose to repay the loan in part or in full before the term expires but must receive a penalty equal to 50% of the remaining interest on the repaid principal.

Let’s say Alice borrowed 100 lisUSD at a 10% interest rate for 14 days. If Alice chooses to repay 55 lisUSD after 7 days, then:

Total interest charged = 100 \* 10% \* 7/14 = 5 lisUSD

This means Alice will be repaying her interest (5 lisUSD) first, then her principal for 55 - 5 = 50 lisUSD

But since Alice repaid her loan before the term expires, she will receive a penalty equal to 50% of the remaining interest:

50% \* 50 \* 10% \* 7/14 = 1.25 lisUSD

The amount of principal repaid by Alice’s 55 lisUSD is: 55 - 5 - 1.25 = 48.75 lisUSD

This means Alice will be paying a 5 lisUSD interest, 1.25 lisUSD penalty, and 48.75 lisUSD principal.

Thus, at any time during the term, the minimum amount for loan repayment must be greater than the interest accrued and the penalty because the interest and penalty must be repaid first.

When its term expires, the fixed term loan will turn into a flexible loan.

<br>
