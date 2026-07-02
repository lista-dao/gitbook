# Smart Lending / Lista StableSwap Integration

Smart Lending lets a user deposit a **Lista StableSwap LP position as collateral** into Moolah, borrow against it, and keep earning trading fees on the underlying pool at the same time. The LP tokens never leave the system idle: they are held by a `SmartProvider`, wrapped 1:1 into a collateral token, and supplied to a Moolah market, while the pool they represent continues to accrue swap fees.

This page is for **DEX aggregators and integrators** who want to:

- discover Lista StableSwap pools and route/quote swaps against them, and
- move StableSwap LP into a Moolah Smart Lending market via `SmartProvider`.

Every function, event, and constant below is taken from the on-chain StableSwap and `SmartProvider` contracts. For deployed addresses, see [BSC Smart Lending](smart-contract-bsc-smart-lending.md) (do not hard-code addresses from this page — the address tables are the source of truth). For how providers fit into Moolah, see [Integration Patterns](integration-patterns.md).

Lista StableSwap is a two-coin Curve-style stable pool: every pool has exactly two coins (`N_COINS = 2`), indexed `0` and `1` in sorted-address order.

---

## Factory: pool discovery

`StableSwapFactory` is the registry of all deployed pools. Use it to enumerate pools and resolve a token pair to its pool and LP token.

| Read | Signature | Returns |
| --- | --- | --- |
| Pool count | `pairLength() → uint256` | Number of registered pools. |
| Pool by index | `swapPairContract(uint256 index) → address` | The pool (swap) contract at `index`, for `index` in `[0, pairLength)`. |
| Pools for a pair | `getPairInfos(address tokenA, address tokenB) → StableSwapPairInfo[]` | All pools registered for the pair (order-independent — inputs are sorted internally). |
| Sort helper | `sortTokens(address tokenA, address tokenB) → (address token0, address token1)` | Canonical `(token0, token1)` ordering; reverts `IDENTICAL_ADDRESSES` if equal. |

`StableSwapPairInfo` is:

```solidity
struct StableSwapPairInfo {
  address swapContract; // the StableSwap pool
  address token0;       // sorted coin 0
  address token1;       // sorted coin 1
  address LPContract;   // the StableSwapLP (ERC-20) minted by the pool
}
```

Coins are always stored in sorted order (`token0 < token1`). A single token pair can have more than one pool (for example a standard and a narrow-spread pool), which is why `getPairInfos` returns an array.

New pools emit:

```solidity
event NewStableSwapPair(address indexed swapContract, address tokenA, address tokenB, address lp);
```

Index by `NewStableSwapPair` (or poll `pairLength` / `swapPairContract`) to keep an up-to-date pool list.

```solidity
// Enumerate every pool
uint256 n = factory.pairLength();
for (uint256 i = 0; i < n; i++) {
  address pool = factory.swapPairContract(i);
  // read coins / balances / lp from `pool` (see below)
}

// Resolve a specific pair
StableSwapFactory.StableSwapPairInfo[] memory infos = factory.getPairInfos(tokenA, tokenB);
```

---

## Pool reads

Read pool state directly from the `StableSwapPool` (the `swapContract` address).

| Read | Signature | Notes |
| --- | --- | --- |
| Coin address | `coins(uint256 i) → address` | `i ∈ {0, 1}`. For a native-BNB pool the BNB side returns the sentinel `0xEeee…eEeE` (see [Native BNB](#native-bnb-handling)). |
| Pool balance | `balances(uint256 i) → uint256` | Pool-tracked balance of coin `i`, in that coin's own decimals. |
| LP token | `token() → address` | The `StableSwapLP` ERC-20 for this pool. |
| Amplification | `A() → uint256` | Current amplification coefficient (already de-scaled). |
| Swap fee | `fee() → uint256` | Fee numerator over `FEE_DENOMINATOR = 1e10`. |
| Admin fee | `admin_fee() → uint256` | Share of `fee` taken as protocol fee, over `1e10`. |
| Native support | `support_BNB() → bool` | `true` if one coin is native BNB. |
| Virtual price | `get_virtual_price() → uint256` | Invariant value per LP token, `1e18`-scaled. Reverts on reentrancy. |
| Precision multipliers | `PRECISION_MUL(uint256 i) → uint256` | `10 ** (18 - decimals_i)`; scales coin `i` to 18-decimal internal units. |

`StableSwapPoolInfo` is a stateless helper that reads a pool for you and adds convenience views:

| Helper | Signature | Returns |
| --- | --- | --- |
| Balances | `balances(address pool) → uint256[2]` | Both pool balances. |
| LP → coins | `calc_coins_amount(address pool, uint256 lpAmount) → uint256[2]` | Coin amounts a proportional withdrawal of `lpAmount` LP would yield. |
| Holder → coins | `get_coins_amount_of(address pool, address account) → uint256[2]` | Same, for an account's full LP balance. |
| Mint preview | `get_add_liquidity_mint_amount(address pool, uint256[2] amounts) → uint256` | LP that `add_liquidity(amounts)` would mint (net of deposit fee). |
| Reverse quote | `get_dx(address pool, uint256 i, uint256 j, uint256 dy, uint256 max_dx) → uint256` | Input of coin `i` required to receive `dy` of coin `j` (fee-inclusive). Reverts `Excess balance` / `Exchange resulted in fewer coins than expected`. |

---

## Quoting a swap: `get_dy`

`get_dy` returns the **fee-inclusive** output amount for a swap, in the output coin's own decimals:

```solidity
function get_dy(uint256 i, uint256 j, uint256 dx) external view returns (uint256);
```

- `i` — input coin index, `j` — output coin index (`{0,1}`, `i != j`).
- `dx` — input amount, in coin `i`'s decimals.
- Returns the amount of coin `j` out **after** the pool's swap fee.

Convention: token0 → token1 is `i = 0, j = 1`; token1 → token0 is `i = 1, j = 0`.

```solidity
// USDC (coin 0) in, USDT (coin 1) out
uint256 amountOut = pool.get_dy(0, 1, dxUSDC);
```

`get_dy_without_fee(i, j, dx)` returns the pre-fee output if you need to isolate the fee component. The executed swap is:

```solidity
function exchange(uint256 i, uint256 j, uint256 dx, uint256 min_dy) external payable;
```

`min_dy` is your slippage floor; the swap reverts `Exchange resulted in fewer coins than expected` if the realized output is below it. Quote with `get_dy` immediately before execution and derive `min_dy` from it with your slippage tolerance.

---

## Oracle price-difference guard

Each pool holds a resilient-oracle reference and enforces a **price-difference guard** on state-changing operations. On `exchange`, `add_liquidity`, and every `remove_liquidity*` variant, the pool calls `checkPriceDiff()` (unless the guard is disabled — see below), which reverts when the pool's implied price for either coin diverges from the oracle price beyond a per-coin threshold:

- `Price difference for token0 exceeds threshold`
- `Price difference for token1 exceeds threshold`

Relevant reads:

| Read | Signature | Notes |
| --- | --- | --- |
| Oracle prices | `fetchOraclePrice() → uint256[2]` | Oracle price of each coin, `1e18`-scaled. |
| Guard check | `checkPriceDiff()` | `view`; reverts if either coin's price diff exceeds its threshold. Safe to call as a pre-flight probe. |
| Skip flag | `skipPriceDiff() → bool` | When `true`, the guard is not enforced on pool operations. |
| Thresholds | `price0DiffThreshold()`, `price1DiffThreshold() → uint256` | Per-coin thresholds, `1e18`-scaled (e.g. `3e16` = 3%). |

These thresholds and the skip flag are current on-chain values that are manager-adjustable on-chain; read them at call time rather than assuming a fixed number. For a large or price-sensitive route, call `checkPriceDiff()` as a `staticcall` before submitting so you can surface a clear error instead of a failed transaction.

> Because the guard runs on liquidity operations too, an LP withdrawal (including via `SmartProvider`) can revert when the pool price has drifted from the oracle. Treat "price difference exceeds threshold" as a transient, retry-when-repegged condition, not a permanent failure.

---

## Native BNB handling

A pool "supports BNB" (`support_BNB() == true`) when one of its coins is native BNB, represented by the sentinel address:

```
0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
```

Handling rules when interacting with a BNB pool:

- `coins(i)` returns the sentinel for the BNB side; it is **not** an ERC-20 — do not call `approve`/`transferFrom` on it.
- For the BNB coin, send the amount as `msg.value`. The pool requires `msg.value` to exactly equal the BNB input amount (reverts `Inconsistent quantity` otherwise).
- For the ERC-20 coin, approve the pool and it will `transferFrom` you as usual.
- On a **non-BNB** pool, any non-zero `msg.value` is rejected (`Inconsistent quantity`) to prevent accidentally sending BNB.
- BNB payouts use a bounded gas stipend, so a receiving contract's `receive()`/fallback must stay within that budget or the transfer reverts `BNB transfer failed`.

Detect the pool type from `support_BNB()` and by comparing each `coins(i)` against the sentinel before deciding whether to use `msg.value` or ERC-20 transfers.

---

## Supplying LP into Moolah via `SmartProvider`

`SmartProvider` is the [provider](integration-patterns.md) that bridges StableSwap LP into a Moolah market. It holds the LP, mints a 1:1 collateral token (`StableSwapLPCollateral`), and supplies that to Moolah on the user's behalf — the LP keeps earning pool fees while it backs the loan. Each `SmartProvider` is bound at deploy time to one pool and one collateral token; resolve the right instance for your pool from [BSC Smart Lending](smart-contract-bsc-smart-lending.md).

There are two entry points, depending on whether the user already holds LP.

### `supplyDexLp` — supply existing LP

Use when the user already holds StableSwap LP tokens.

```solidity
function supplyDexLp(
  MarketParams calldata marketParams,
  address onBehalf,
  uint256 lpAmount
) external;
```

Flow: the provider pulls `lpAmount` LP from `msg.sender` (approve the provider on the LP token first), mints the collateral token 1:1, and calls `MOOLAH.supplyCollateral` for `onBehalf`. `marketParams.collateralToken` must equal the provider's collateral token (reverts `invalid collateral token`); `lpAmount` must be non-zero (`zero lp amount`).

### `supplyCollateral` — zap tokens into LP, then supply

Use when the user holds the underlying tokens and wants the provider to add liquidity for them in one call.

```solidity
function supplyCollateral(
  MarketParams calldata marketParams,
  address onBehalf,
  uint256 amount0,
  uint256 amount1,
  uint256 minLpAmount
) external payable;
```

Flow: the provider pulls `amount0`/`amount1` (approve each ERC-20 coin on the provider first), calls the pool's `add_liquidity([amount0, amount1], minLpAmount)`, mints the resulting LP 1:1 as collateral, and supplies it for `onBehalf`.

- At least one of `amount0`/`amount1` must be > 0 (`invalid amounts`).
- `minLpAmount` is the slippage floor for the mint; add-liquidity reverts `Slippage screwed you` if fewer LP would be minted.
- For a BNB pool, pass the BNB coin's amount as `msg.value` (it must equal that coin's amount; `amount0 should equal msg.value` / `amount1 should equal msg.value`). On a non-BNB pool `msg.value` must be 0 (`msg.value must be 0`).

Both paths emit:

```solidity
event SupplyCollateral(
  address indexed onBehalf,
  address indexed collateralToken,
  uint256 collateralAmount,
  uint256 amount0,
  uint256 amount1
);
```

Once collateral is in the market, borrowing and repayment happen against the Moolah market as usual. Withdrawal is symmetric: the provider exposes `withdrawDexLp` (return LP), `withdrawCollateral` (proportional token0/token1), `withdrawCollateralImbalance` (exact token amounts), and `withdrawCollateralOneCoin` (single coin) — each burns the collateral token and removes liquidity, subject to the same price-difference guard as any pool operation.

For the TypeScript builders that assemble these calls as ready-to-send steps (`buildSmartSupplyDexLpParams`, `buildSmartSupplyCollateralParams`, and the matching withdraw/repay builders), see the [Moolah Lending SDK](../sdk.md).

---

## Revert checklist

Common reverts when integrating, with the contract that raises them:

| Revert string | Where | Cause / fix |
| --- | --- | --- |
| `IDENTICAL_ADDRESSES` | Factory | `sortTokens`/lookup called with `tokenA == tokenB`. |
| `Exchange resulted in fewer coins than expected` | Pool `exchange` | Realized output below `min_dy`. Re-quote with `get_dy` and widen slippage. |
| `Slippage screwed you` | Pool `add_liquidity` / `remove_liquidity_imbalance` | Mint below `min_mint_amount` / burn above `max_burn_amount`. Adjust the slippage bound. |
| `Withdrawal resulted in fewer coins than expected` | Pool `remove_liquidity` | A `min_amounts[i]` floor not met. |
| `Not enough coins removed` | Pool `remove_liquidity_one_coin` | Output below `min_amount`. |
| `Price difference for token0 exceeds threshold` / `…token1…` | Pool `checkPriceDiff` | Pool price drifted from oracle beyond threshold. Retry once repegged. |
| `Inconsistent quantity` | Pool | BNB amount ≠ `msg.value`, or `msg.value` sent to a non-BNB pool. |
| `BNB transfer failed` | Pool | BNB recipient reverted or exceeded the gas stipend. |
| `Reentrant call` | Pool `get_virtual_price` | Called during an in-progress pool operation. |
| `invalid collateral token` | SmartProvider | `marketParams.collateralToken` ≠ the provider's collateral token. |
| `zero lp amount` / `invalid amounts` | SmartProvider | `supplyDexLp` with 0 LP / `supplyCollateral` with both amounts 0. |
| `amount0 should equal msg.value` / `amount1 should equal msg.value` / `msg.value must be 0` | SmartProvider | Native-BNB `msg.value` mismatch on `supplyCollateral`. |
| `no lp minted` | SmartProvider | `add_liquidity` produced no LP (e.g. dust amounts). |
| `unauthorized sender` | SmartProvider | Withdrawing for an `onBehalf` you are not authorized on. |

---

## See also

- [BSC Smart Lending](smart-contract-bsc-smart-lending.md) — deployed factory, pool, LP, collateral, and `SmartProvider` addresses.
- [Integration Patterns](integration-patterns.md) — how providers and brokers plug into Moolah.
- [Moolah Lending SDK](../sdk.md) — TypeScript builders for Smart Lending supply/withdraw/repay.
