# Consuming Oracle Prices

Two different price functions exist in the Lista stack, and they are frequently confused. They live at different layers, take different arguments, and return numbers on different scales. Reading one where the other is expected produces wrong health factors and mispriced liquidations.

| Function | Layer | Signature | Returns | Scale |
| --- | --- | --- | --- | --- |
| `peek` | Oracle (Resilient Oracle / any `IOracle`) | `peek(address asset) → uint256` | Price of **one `asset`, quoted in USD** | Feed-dependent (see [Decimals](#decimals-what-peek-returns)) |
| `getPrice` | Moolah market | `getPrice(MarketParams marketParams) → uint256` | Price of **one collateral token, quoted in the loan token** | Fixed `36 + loanDecimals − collateralDecimals` (see [The scale factor](#the-market-scale-factor)) |

Rule of thumb: `peek` answers "what is this asset worth in USD?"; `getPrice` answers "how much loan token is one unit of collateral worth, on the scale Moolah's math expects?". Health checks and liquidations use `getPrice`. Use `peek` only when you genuinely need a single asset's USD value (for example, to reconstruct the two legs of a market price, or to sanity-check a feed).

This page shows how to read a market's oracle, call both functions read-only, verify which feeds back an asset, and compute a position's health and liquidation price with the exact scale factor from `Moolah.sol`. For the (auto-synced) per-asset oracle address tables, see [Multi-Oracle](../multi-oracle.md).

---

## Layer 1 — the oracle: `peek(address asset)`

Every oracle a Moolah market can use implements `IOracle`:

```solidity
struct TokenConfig {
  address asset;
  address[3] oracles;             // [main, pivot, fallback]
  bool[3] enableFlagsForOracles;  // enabled state, same order
  uint256 timeDeltaTolerance;     // max staleness in seconds
}

interface IOracle {
  function peek(address asset) external view returns (uint256);
  function getTokenConfig(address asset) external view returns (TokenConfig memory);
}
```

`peek(asset)` returns the USD price of one unit of `asset`. It is a `view` function — free to call, no state change. Lista's production oracle behind most collateral is the **Resilient Oracle**, whose `peek` implementation is described below, but a market curator may point a market at any contract that satisfies `IOracle`.

### Decimals: what `peek` returns

Moolah markets assume the oracle's per-asset USD price has **8 decimals** — the same precision Moolah uses internally for `minLoanValue`. Most upstream feeds (Chainlink, Atlas, RedStone on BNB Chain) publish 8-decimal answers, so this holds directly. Some adaptors normalize to a higher precision — a common pattern multiplies an 8-decimal feed by `1e10` to publish an 18-decimal answer — so the raw magnitude you see from a specific `peek` depends on the feed and adaptor behind that asset.

You do **not** need to guess these decimals when working at the market layer: `getPrice` (Layer 2) reads both legs and normalizes them against the token decimals for you. When you call `peek` directly, always confirm the decimals of the specific feed you are reading rather than assuming a fixed magnitude.

### The Resilient Oracle in brief

The Resilient Oracle aggregates up to three sources per asset and cross-validates them so a single bad feed cannot move a price. It configures three roles per asset:

| Role | Purpose |
| --- | --- |
| **main** | The most trustworthy price source. Must be set (non-zero). |
| **pivot** | A loose sanity checker used to validate the main (and fallback) price. Optional. |
| **fallback** | Backup source used when the main price fails validation. Optional. |

`peek` resolves a price by this precedence (see `ResilientOracle._getPrice`):

1. If **main** is enabled and validates against **pivot** (via `BoundValidator`), return the main price. If no pivot is configured/enabled, the main price is returned directly.
2. Otherwise, if **fallback** is enabled and validates against **pivot**, return the fallback price.
3. Otherwise, if both main and fallback are available and validate against each other, return the main price.
4. Otherwise revert with `"invalid resilient oracle price"`.

A source is skipped if it is disabled, missing, reverts, or is **stale** — `getPriceFromOracle` treats a Chainlink-style answer whose `updatedAt` is older than the asset's `timeDeltaTolerance` as invalid (`INVALID_PRICE = 0`).

**BoundValidator.** Validation compares a reported price against an anchor price. With `anchorRatio = anchorPrice * 1e18 / reportedPrice`, the reported price is accepted only when:

```
lowerBoundRatio <= anchorRatio <= upperBoundRatio
```

Bounds are configured per asset — `BoundValidator` stores no default, so consult the per-asset limits in the auto-synced [Multi-Oracle](../multi-oracle.md) tables (commonly a ±1% band, i.e. `0.99` / `1.01`). A reported price of `0` fails validation gracefully (returns `false`); an anchor price of `0` instead reverts (`anchor price is not valid`).

> Which sources and bounds are configured for each asset (and the Resilient Oracle address per chain) are published in the auto-synced tables on [Multi-Oracle](../multi-oracle.md). Do not hard-code them.

### Verifying which feeds back an asset

To see the sources behind a collateral before you trust a market, read the token config from the oracle directly:

```solidity
// oracle = a market's marketParams.oracle
TokenConfig memory cfg = IOracle(oracle).getTokenConfig(collateralToken);
// cfg.oracles[0] = main, [1] = pivot, [2] = fallback
// cfg.enableFlagsForOracles[i] tells you which roles are live
// cfg.timeDeltaTolerance is the staleness window in seconds
```

The Resilient Oracle also exposes `getOracle(asset, role) → (address oracle, bool enabled)` for reading a single role.

---

## Layer 2 — the market: `getPrice(MarketParams)`

A Moolah market's price is the collateral asset priced **in the loan asset**, not in USD. This is the number Moolah's health and liquidation math actually consumes.

```solidity
struct MarketParams {
  address loanToken;
  address collateralToken;
  address oracle;
  address irm;
  uint256 lltv;
}

interface IMoolah {
  function idToMarketParams(Id id) external view returns (MarketParams memory);
  function getPrice(MarketParams calldata marketParams) external view returns (uint256);
  function isHealthy(MarketParams calldata marketParams, Id id, address borrower) external view returns (bool);
}
```

`getPrice` is `view`. Under the hood it reads both legs from the market's oracle (`oracle.peek(collateralToken)` and `oracle.peek(loanToken)`) and combines them with a fixed scale factor.

### The market scale factor

From `Moolah.getPrice` / `_getPrice`, with `base = collateralToken` and `quote = loanToken`:

```solidity
uint256 scaleFactor = 10 ** (36 + quoteTokenDecimals - baseTokenDecimals);
return scaleFactor.mulDivDown(basePrice, quotePrice);
//     = scaleFactor * basePrice / quotePrice   (rounded down)
```

where `basePrice = peek(collateralToken)`, `quotePrice = peek(loanToken)`, `baseTokenDecimals = IERC20Metadata(collateralToken).decimals()`, and `quoteTokenDecimals = IERC20Metadata(loanToken).decimals()`.

Because the same feed decimals appear in both `basePrice` and `quotePrice`, they cancel in the ratio, and the `36 + quoteDecimals − baseDecimals` exponent normalizes the result to Moolah's canonical price scale. The result is deliberately targeted at the constant:

```solidity
uint256 constant ORACLE_PRICE_SCALE = 1e36;
```

Read `getPrice` as a **raw-unit conversion factor, not a human-readable price**: multiplying a raw collateral amount (in the collateral token's own decimals) by `getPrice` and dividing by `1e36` yields the equivalent debt in **raw loan-token units** — `rawCollateral × getPrice / 1e36 = rawLoan`. Because the scale factor carries `10**(quoteDecimals − baseDecimals)`, `getPrice / 1e36` equals the per-whole-token price *only when both tokens share the same decimals*; for a human "1 collateral = X loan tokens" price across different decimals, apply the token decimals yourself (or derive it from the two USD legs via `peek`). The health and liquidation math below works entirely in raw units, so you never need the human price for on-chain-accurate results.

> Broker markets note. `getPrice(marketParams)` calls the internal price with `user = address(0)`, which always returns the plain market price. For fixed-term/credit **broker** markets, an account-specific price can deviate from the market price; the protocol uses the market price for the standard health check so liquidators can act in time. Unless you are integrating a broker product, `getPrice(marketParams)` is the number you want. See [Integration Patterns](../lista-lending/integration-patterns.md).

---

## Computing health with the scale factor

Moolah's health check (`Moolah._isHealthy`) is:

```solidity
uint256 maxBorrow = uint256(position.collateral)
  .mulDivDown(collateralPrice, ORACLE_PRICE_SCALE)   // collateral * price / 1e36
  .wMulDown(marketParams.lltv);                        // * lltv / 1e18

bool healthy = maxBorrow >= borrowed;                  // borrowed rounded up
```

where:

- `collateralPrice = getPrice(marketParams)` (the `1e36`-scaled collateral-in-loan price).
- `position.collateral` is the raw collateral amount in the collateral token's own decimals.
- `borrowed` is the borrower's debt in loan-token units (borrow shares converted to assets, rounded **up** in the protocol's favor).
- `lltv` is WAD-scaled (`1e18` = 100%), and `wMulDown(x, lltv) = x * lltv / 1e18`.

So the collateral's borrowing power, in loan-token units, is:

```
maxBorrow = collateral * getPrice / 1e36 * lltv / 1e18
```

The position is healthy while `maxBorrow >= borrowed`. Note the two independent scale divisions: `1e36` (the price scale) and `1e18` (the LLTV WAD). Dropping either one is the most common integration error.

You do not have to reproduce this off-chain to answer "is this position healthy?" — Moolah exposes `isHealthy(marketParams, id, borrower)` as a `view` function that returns the same boolean the protocol enforces on `borrow` and `withdrawCollateral`.

### Read-only example (viem)

```typescript
import { createPublicClient, http } from "viem";

const client = createPublicClient({ transport: http(RPC_URL) });

// 1. Resolve the market's params from its id (bytes32).
const marketParams = await client.readContract({
  address: MOOLAH,
  abi: MOOLAH_ABI,
  functionName: "idToMarketParams",
  args: [marketId],
});

// 2. Collateral price, quoted in the loan token, scaled by 1e36.
const price = await client.readContract({
  address: MOOLAH,
  abi: MOOLAH_ABI,
  functionName: "getPrice",
  args: [marketParams],
}); // bigint

// 3. Borrowing power of `collateral` units, in loan-token units.
const ORACLE_PRICE_SCALE = 10n ** 36n;
const WAD = 10n ** 18n;
const maxBorrow = (collateral * price) / ORACLE_PRICE_SCALE * marketParams.lltv / WAD;
const healthy = maxBorrow >= borrowed;
```

`collateral` and `borrowed` here are raw on-chain integers in each token's own decimals; do not pre-scale them. `getPrice` already accounts for the decimal difference between the two tokens.

## Liquidation price

The health boundary is where `maxBorrow == borrowed`. Solving the health inequality for the collateral price gives the **liquidation price** — the `getPrice` value at which a position with fixed `collateral` and `borrowed` becomes eligible for liquidation:

```
liquidationPrice = borrowed * 1e36 * 1e18 / (collateral * lltv)
```

(all values raw, in their native units/scales). The position becomes liquidatable once `getPrice(marketParams)` falls **strictly below** `liquidationPrice`: the on-chain check is `maxBorrow >= borrowed` (rounded in the protocol's favor), so at exactly the boundary the position is still healthy, and liquidation requires `!_isHealthy`.

For the liquidation mechanics themselves, note how the same scale appears when collateral is seized (`Moolah.liquidate`): the loan-token value of seized collateral is `seizedAssets.mulDivUp(collateralPrice, ORACLE_PRICE_SCALE)`, i.e. `seizedAssets * getPrice / 1e36`. The liquidation incentive factor and cursor are **compile-time constants** (`LIQUIDATION_CURSOR`, `MAX_LIQUIDATION_INCENTIVE_FACTOR` in `ConstantsLib`), not governance-tunable parameters, and are not covered here.

---

## Checklist for integrators

- **Pricing a position's health / a liquidation:** use `getPrice(marketParams)` and divide by `ORACLE_PRICE_SCALE` (`1e36`), then apply `lltv` with the `1e18` WAD. Never mix in a raw `peek` value here.
- **Need a single asset's USD value:** use `oracle.peek(asset)` and confirm that feed's decimals before scaling.
- **Auditing a market's oracle:** read `marketParams.oracle`, then `getTokenConfig(collateralToken)` to see the main/pivot/fallback sources, enabled flags, and staleness tolerance; cross-reference the addresses on [Multi-Oracle](../multi-oracle.md).
- **All of these are `view` calls** — safe to call from any RPC without a transaction.

## Related pages

- [Multi-Oracle](../multi-oracle.md) — per-asset oracle sources, bound-validator limits, and Resilient Oracle addresses (auto-synced).
- [Oracle](../../introduction/lista-lending/oracle.md) — conceptual overview of oracles in Lista Lending.
- [Integration Patterns](../lista-lending/integration-patterns.md) — provider and broker layers, including broker-specific pricing.
- [Moolah Lending SDK](../sdk.md) — TypeScript helpers that read market data and prices for you.
