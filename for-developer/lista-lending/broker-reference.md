# Broker Reference (LendingBroker)

A **broker** is registered per market and, where present, gates origination: only the broker may call `borrow` or `repay` on that market. So on a broker market the broker *is* the borrowing surface — a direct Moolah call reverts.

Brokers are what add **fixed-term, fixed-rate** borrowing on top of Moolah's variable-rate markets. The deployed broker markets, with their LLTV, cap and market id, are on [BSC Lending Brokers](smart-contract-bsc-brokers.md).

Check whether a market is broker-gated:

```solidity
function brokers(Id id) external view returns (address);
```

All facts below are derived from `src/broker/LendingBroker.sol` and `src/broker/interfaces/IBroker.sol`.

> Lista Credit uses a different broker, `CreditBroker`, with credit-scoring gates on top. It has its own page: [Loan Lifecycle](../credit-loans/loan-lifecycle.md).

---

## Terms

A broker offers a set of fixed terms. Read them before borrowing — `termId` is what you pass to open a fixed position:

```solidity
struct FixedTermAndRate {
  uint256 termId;
  uint256 duration;   // seconds
  uint256 apr;
}
// IBroker.sol. CreditBroker declares a DIFFERENT struct of the same name with a
// fourth field, `FixedTermType termType` — decoding one with the other's ABI
// misreads the tuple. See Credit Loan Lifecycle.

function getFixedTerms() external view returns (FixedTermAndRate[] memory);
```

`apr` is RAY-scaled as **`1e27 + rate`**, not as the rate itself. Divide by `1e27` and subtract 1 to get the annual figure: `1036821445287206735200000000` is **3.68%**, not 103.68%. A term whose `apr` is at or below `1e27` accrues nothing.

On a `LendingBroker` term, interest accrues **linearly per second** on outstanding principal and stops at the position's `end` — it is not charged upfront. (`CreditBroker` terms carry a `termType` and one of its two modes *is* upfront — see [Credit Loan Lifecycle](../credit-loans/loan-lifecycle.md).) Repaying before `end` adds an early-repay penalty, roughly half the remaining term's interest on the principal being repaid, which is what recovers the forgone term interest.

## Borrowing

```solidity
function borrow(uint256 amount) external;                  // variable-rate ("dynamic") position
function borrow(uint256 amount, uint256 termId) external;  // fixed-term position
```

Both are `nonReentrant`, require the market id to be set, and revert `ZeroAmount()` on a zero amount. They are additionally pausable in two independent ways — a global pause and a borrow-specific pause — so a broker can stop new borrowing while leaving repayment open.

The loan token is transferred to the caller, **unwrapped to native BNB** where the broker supports it.

## Repaying

```solidity
function repay(uint256 amount, address onBehalf) external payable;                 // variable position
function repay(uint256 amount, uint256 posId, address onBehalf) external payable;  // one fixed position
function repayAll(address onBehalf) external payable;                              // everything
```

All three are `payable` so a native-BNB market can be repaid without wrapping. The fixed-position form needs the `posId` from the user's positions (below).

Preview what a partial repayment settles before sending it:

```solidity
function previewRepayFixedLoanPosition(address user, uint256 amount, uint256 posId)
  external view returns (uint256 interestRepaid, uint256 penalty, uint256 principalRepaid);
```

Note the three-way split: interest comes first, a penalty may apply, and only the remainder reduces principal.

## Reading positions

```solidity
function userFixedPositions(address user) external view returns (FixedLoanPosition[] memory);
function userDynamicPosition(address user) external view returns (DynamicLoanPosition memory);
function getUserTotalDebt(address user) external view returns (uint256 totalDebt);
```

`getUserTotalDebt` is the **borrower's** total across their fixed and variable positions, priced with the broker's current rate — not a market-wide figure.

## Pricing, and why it matters for liquidation

```solidity
function peek(address token, address user) external view returns (uint256 price);
```

On a broker market, health is not computed the way it is elsewhere. `Moolah._isHealthy` prices the collateral at the **plain market price** but substitutes the **broker's** debt figure for the borrower's Moolah shares. The per-user `peek` price shapes the seize math once a liquidation runs.

This is the reason [Liquidator Integration](liquidator-integration.md) warns that `PublicLiquidator.loanTokenAmountNeed` under-quotes on broker markets: that helper prices with `Moolah.getPrice(marketParams)`, which is the market price with `user = address(0)`, while the liquidation itself prices with the borrower. Use the broker's own `peek(token, user)` and `getUserTotalDebt(user)` to size a broker-market liquidation.

---

## See also

- [BSC Lending Brokers](smart-contract-bsc-brokers.md) — the deployed broker markets.
- [Position Conversion](position-conversion.md) — moving a variable position into a fixed term.
- [Integration Patterns](integration-patterns.md) — how providers and brokers compose.
- [Liquidator Integration](liquidator-integration.md) — the broker-market caveat in context.
