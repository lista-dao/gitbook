# Interest Rate Model

Moolah markets delegate borrow-rate computation to a pluggable Interest Rate Model (IRM). Each market stores an `irm` address, and on every interest accrual Moolah calls that contract to obtain the current borrow rate.

Two IRM implementations ship with the protocol:

| IRM | Model | Where used |
| --- | --- | --- |
| `InterestRateModel` | Adaptive-curve rate as a function of utilization, with a rate-at-target that adapts over time | Standard utilization-based markets |
| `FixedRateIrm` | Administratively set fixed per-market rate | Fixed term / fixed rate broker products (see [Integration Patterns](integration-patterns.md)) |

Every IRM implements the shared `IIrm` interface:

```solidity
interface IIrm {
    /// @notice Borrow rate per second (scaled by WAD); may modify storage.
    function borrowRate(MarketParams memory marketParams, Market memory market) external returns (uint256);

    /// @notice Borrow rate per second (scaled by WAD); read-only.
    function borrowRateView(MarketParams memory marketParams, Market memory market) external view returns (uint256);
}
```

All rates in the IRM are expressed **per second, scaled by WAD (`1e18`)**. Moolah compounds this per-second rate over the elapsed time between interactions when accruing interest.

## Adaptive Curve Model

`InterestRateModel` computes the borrow rate as a curve function of utilization around a target utilization. The curve is anchored by a `rateAtTarget` value that itself adapts over time: when utilization sits above target, `rateAtTarget` drifts upward; when below target, it drifts downward. This pushes the market back toward the target utilization without governance intervention.

### Utilization and error

Utilization is total borrows divided by total supply:

```text
utilization = totalBorrowAssets / totalSupplyAssets   (WAD-scaled, 0 if no supply)
```

The model measures how far utilization is from target as a normalized error `err`, mapped so that `err = -1` at zero utilization, `err = 0` at target utilization, and `err = +1` at full (100%) utilization:

```text
errNormFactor = utilization > TARGET_UTILIZATION ? (WAD - TARGET_UTILIZATION) : TARGET_UTILIZATION
err           = (utilization - TARGET_UTILIZATION) / errNormFactor
```

### The curve

Given the current `rateAtTarget` and the error, the instantaneous rate is a piecewise-linear curve. Below target the rate is scaled down toward `rateAtTarget / CURVE_STEEPNESS`; above target it is scaled up toward `rateAtTarget * CURVE_STEEPNESS`:

```text
r = ((1 - 1/C) * err + 1) * rateAtTarget    if err < 0
    ((C - 1)   * err + 1) * rateAtTarget    if err >= 0
```

where `C = CURVE_STEEPNESS`. At `err = 0` (utilization exactly at target) the borrow rate equals `rateAtTarget`.

### Adaptation of `rateAtTarget`

`rateAtTarget` is stored per market (`mapping(Id => int256) rateAtTarget`) and is updated only on stateful interactions. Between two updates it moves according to `ADJUSTMENT_SPEED * err` per second, applied through a continuous-compounding (exponential) adaptation over the elapsed time:

```text
linearAdaptation = (ADJUSTMENT_SPEED * err) * elapsed
endRateAtTarget  = clamp(startRateAtTarget * exp(linearAdaptation), MIN_RATE_AT_TARGET, MAX_RATE_AT_TARGET)
```

The average rate returned to Moolah over the elapsed interval is approximated with a trapezoidal rule (using the start, mid, and end `rateAtTarget`), so the reported rate reflects the whole interval rather than only its endpoints. On a market's first interaction (`rateAtTarget == 0`), the model seeds both the average and end rate-at-target with `INITIAL_RATE_AT_TARGET`.

The resulting average rate is additionally bounded by a per-market cap and floor (`rateCap`, `rateFloor`) and a protocol-wide minimum cap (`minCap`); when no explicit cap is set, `DEFAULT_RATE_CAP` applies. These bounds are manager/bot-adjustable on-chain values.

## Current on-chain constants

The following constants are compiled into `ConstantsLib` for the adaptive-curve model. They are fixed in the deployed implementation (changing them requires a contract upgrade), and are stated here as current on-chain values. All rate constants are **per second, WAD-scaled**; the human-readable annualized figures come from the source comments.

| Constant | On-chain value | Meaning |
| --- | --- | --- |
| `CURVE_STEEPNESS` | `4 ether` (`4e18`) | Curve steepness `C = 4`. Rate ranges from `rateAtTarget / 4` at 0% utilization to `rateAtTarget * 4` at 100%. |
| `TARGET_UTILIZATION` | `0.9 ether` (`0.9e18`) | Target utilization = 90%. |
| `ADJUSTMENT_SPEED` | `50 ether / 365 days` | Adaptation speed; `rateAtTarget` moves at `ADJUSTMENT_SPEED * err` per second (≈ 50 / year at full error). |
| `INITIAL_RATE_AT_TARGET` | `0.04 ether / 365 days` | Seed rate-at-target on first interaction; 4% APR-equivalent at target (rate spans ~1%–16% across the curve). |
| `MIN_RATE_AT_TARGET` | `0.001 ether / 365 days` | Lower clamp on `rateAtTarget`; 0.1% at target (curve minimum ~0.025%). |
| `MAX_RATE_AT_TARGET` | `2.0 ether / 365 days` | Upper clamp on `rateAtTarget`; 200% at target (curve maximum ~800%). |
| `DEFAULT_RATE_CAP` | `uint256(0.3 ether) / 365 days` | Default per-second cap on the returned borrow rate (30% annualized) when a market has no explicit `rateCap`. |

## `borrowRateView` vs `borrowRate`

Both entry points evaluate the same adaptive-curve math, but differ in whether they persist the updated `rateAtTarget`:

| | `borrowRateView` | `borrowRate` |
| --- | --- | --- |
| Mutability | `view` (no state change) | State-changing |
| Caller | Anyone | `MOOLAH` only (reverts otherwise) |
| Effect | Computes the average rate for the current `market` snapshot without writing | Computes the rate, writes `rateAtTarget[id] = endRateAtTarget`, emits `BorrowRateUpdate` |
| Use case | Off-chain quoting, simulations, front-ends | Called by Moolah during interest accrual on `supply` / `borrow` / `repay` / etc. |

```solidity
function borrowRateView(MarketParams memory marketParams, Market memory market) external view returns (uint256);
function borrowRate(MarketParams memory marketParams, Market memory market) external returns (uint256);
```

Because `borrowRate` requires `msg.sender == MOOLAH`, integrators reading a rate directly should call `borrowRateView`. The value it returns is the average per-second rate that *would* be applied for the given `market` snapshot; it does not advance `rateAtTarget`. Note that `borrowRateView` uses the stored `rateAtTarget` and the elapsed time implied by `market.lastUpdate`, so its result reflects adaptation that has not yet been committed on-chain.

## Reading the current rate on-chain

Two complementary reads are available:

1. **The anchor rate.** `rateAtTarget(Id id)` returns the stored per-second rate-at-target for a market (the height of the curve). It is `0` for a market that has never accrued interest.

   ```solidity
   int256 anchor = IInterestRateModel(irm).rateAtTarget(id);
   ```

2. **The current borrow rate.** Fetch the market's live `MarketParams` and `Market` structs from Moolah, then call `borrowRateView`:

   ```solidity
   uint256 ratePerSecond = IIrm(irm).borrowRateView(marketParams, market); // WAD-scaled
   ```

### Per-second → APY conversion

The returned rate is a per-second rate scaled by WAD. Moolah accrues interest with continuous (per-second Taylor-compounded) growth, so the borrow APY is:

```text
ratePerSecondFloat = ratePerSecond / 1e18
borrowAPY          = exp(ratePerSecondFloat * secondsPerYear) - 1     // secondsPerYear = 365 * 24 * 60 * 60 = 31_536_000
```

```typescript
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60; // 31_536_000

// ratePerSecond is the WAD-scaled uint returned by borrowRateView
const rateFloat = Number(ratePerSecond) / 1e18;
const borrowAPY = Math.expm1(rateFloat * SECONDS_PER_YEAR); // e.g. 0.05 == 5%
```

The supply APY is lower than the borrow APY, scaled by utilization and net of the market fee; it is not returned by the IRM and must be derived from market state.

## FixedRateIrm

For products that do not use the utilization-based curve, brokers can point a market at `FixedRateIrm`. Instead of computing a rate from utilization, it returns a per-market rate that has been set administratively.

| Element | Signature / value | Notes |
| --- | --- | --- |
| `MAX_BORROW_RATE` | `8.0 ether / 365 days` | Maximum settable per-second rate (800% annualized). |
| `borrowRateStored(Id id)` | `int256` | The fixed per-second rate stored for a market. |
| `setBorrowRate(Id id, int256 newBorrowRate)` | — | Sets the fixed rate. Access-controlled (bot role); must be `>= 0` and `<= MAX_BORROW_RATE`, and within any configured `rateCap` / `rateFloor`. |
| `borrowRateView(...)` / `borrowRate(...)` | `uint256` | Both return the stored rate (clamped to `MAX_BORROW_RATE`, then to the market cap and floor). Unlike the adaptive model, `borrowRate` here is also `view` and holds no adaptive state. A market whose rate has never been set has `borrowRateStored == 0`, so these return `0` (subject to any configured floor) rather than reverting. |

For a market that has never had a rate set, `borrowRateStored` defaults to `0`; `borrowRateView` only requires the stored rate to be `>= 0`, so an unset market returns `0` (subject to any configured floor) rather than reverting. A `0` rate means no interest accrues, so the fixed rate should be configured with `setBorrowRate` before the market is put into use. This IRM backs the fixed term / fixed rate broker products described in [Integration Patterns](integration-patterns.md).

## Related

* [Protocol Extensions](protocol-extensions.md) — market-level controls (`minLoan`, reentrancy, upgradeability, oracle architecture).
* [Integration Patterns](integration-patterns.md) — provider and broker integration layers.
* [Smart Contract](smart-contract.md) — deployed contract addresses (auto-synced).
