# Architecture & Mechanics

Lista V3 Dex is a concentrated-liquidity automated market maker (AMM) deployed on BNB Smart Chain.

> **Lista V3 is a fork of Uniswap V3.** The canonical Uniswap V3 model, math, contract interfaces, and SDKs (e.g. `@uniswap/v3-sdk`, `@uniswap/sdk-core`) apply directly. Contracts are renamed (`ListaV3Factory`, `ListaV3Pool`) but their interfaces, events, and behaviour match Uniswap V3. This page documents the model as deployed by Lista and points out the deployment-specific details (fee tiers, NFT name, upgradeable position manager, and — importantly for off-chain address derivation — a Lista-specific pool init-code hash; see [Building on Lista V3](#building-on-lista-v3)). For deep math and reference, use the Uniswap V3 whitepaper and developer docs.

For deployed contract addresses see [Smart Contract](smart-contract.md).

## Component contracts

| Contract | Role |
| -------- | ---- |
| `ProxyAdmin` | Admin of the upgradeable proxies in the deployment (e.g. the position manager). |
| `ListaV3Factory` | Deploys and registers one pool per `(token0, token1, fee)` tuple; owns the enabled fee-tier → tick-spacing table. |
| `ListaV3Pool` | The core AMM contract for a single pair + fee tier. Holds liquidity, `slot0` price/tick state, fee accumulators, ticks, and positions. Created by the factory. |
| `NonfungiblePositionManager` | Periphery contract that wraps liquidity positions as ERC-721 NFTs and handles mint / increase / decrease / collect / burn. Deployed behind a transparent proxy. |
| `NonfungibleTokenPositionDescriptor` | Renders on-chain token metadata (`tokenURI`) for position NFTs. |
| `SwapRouter` | Periphery contract for executing single-hop and multi-hop swaps with slippage and deadline protection. |

The `*Pool` rows in [Smart Contract](smart-contract.md) are individual pools deployed by the factory, not a singleton — every distinct `(token0, token1, fee)` combination is its own `ListaV3Pool` instance.

## AMM model

### Factory → Pool

A pool is uniquely identified by the ordered token pair and the fee tier. Tokens are sorted by address so that `token0 < token1`; the factory stores the pool both ways in `getPool[token0][token1][fee]`.

```solidity
// ListaV3Factory
function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool);
function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
function feeAmountTickSpacing(uint24 fee) external view returns (int24);

event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool);
```

`createPool` derives `tickSpacing` from the fee tier, deploys the pool deterministically, and emits `PoolCreated`. A newly created pool must be initialized once via `initialize(sqrtPriceX96)` before liquidity can be added. The pool address is deterministic (CREATE2 from the pool key), but Lista's pools have their own bytecode, so off-chain derivation must use **Lista's** pool init-code hash — not Uniswap's — or simply read `factory.getPool(token0, token1, fee)`. See [Building on Lista V3](#building-on-lista-v3) for the hash.

### Positions as ERC-721 (NonfungiblePositionManager)

Liquidity positions are minted as ERC-721 NFTs. The collection is named **`Lista V3 Positions NFT`** with symbol **`LISTA-V3`**. Unlike Uniswap's immutable position manager, the Lista deployment is an upgradeable contract (transparent proxy + `initialize()`); the ERC-721 token semantics are otherwise standard and it supports EIP-712 permit.

```solidity
// NonfungiblePositionManager (struct fields verbatim from source)
struct MintParams {
    address token0;
    address token1;
    uint24 fee;
    int24 tickLower;
    int24 tickUpper;
    uint256 amount0Desired;
    uint256 amount1Desired;
    uint256 amount0Min;
    uint256 amount1Min;
    address recipient;
    uint256 deadline;
}

function mint(MintParams calldata params)
    external payable
    returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);

function increaseLiquidity(IncreaseLiquidityParams calldata params)
    external payable returns (uint128 liquidity, uint256 amount0, uint256 amount1);

function decreaseLiquidity(DecreaseLiquidityParams calldata params)
    external payable returns (uint256 amount0, uint256 amount1);

function collect(CollectParams calldata params)
    external payable returns (uint256 amount0, uint256 amount1);

function burn(uint256 tokenId) external payable;
```

Reading a position returns the full Uniswap V3 position tuple:

```solidity
function positions(uint256 tokenId) external view returns (
    uint96 nonce,
    address operator,
    address token0,
    address token1,
    uint24 fee,
    int24 tickLower,
    int24 tickUpper,
    uint128 liquidity,
    uint256 feeGrowthInside0LastX128,
    uint256 feeGrowthInside1LastX128,
    uint128 tokensOwed0,
    uint128 tokensOwed1
);
```

`tokensOwed0` / `tokensOwed1` are the position's uncollected balance, credited on liquidity changes and realized via `collect`. They hold **more than fees**: `decreaseLiquidity` adds the withdrawn principal to them rather than transferring it, so removing liquidity moves no tokens on its own — a follow-up `collect` is required to receive both the principal and the accrued fees.

### Swaps (SwapRouter)

Swaps are routed through the `SwapRouter`, which supports exact-input and exact-output, single-hop and multi-hop. Single-hop selects a pool by `(tokenIn, tokenOut, fee)`; multi-hop uses a packed `path` (20-byte token, 3-byte fee, 20-byte token, …).

```solidity
// SwapRouter
struct ExactInputSingleParams {
    address tokenIn;
    address tokenOut;
    uint24 fee;
    address recipient;
    uint256 deadline;
    uint256 amountIn;
    uint256 amountOutMinimum;
    uint160 sqrtPriceLimitX96;
}

function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
function exactOutputSingle(ExactOutputSingleParams calldata params) external payable returns (uint256 amountIn);
function exactOutput(ExactOutputParams calldata params) external payable returns (uint256 amountIn);
```

`amountOutMinimum` / `amountInMaximum` enforce slippage limits, `deadline` bounds execution time, and `sqrtPriceLimitX96` optionally caps the price movement within the swap.

## Uniswap V3 mechanics

Lista V3 is a Uniswap V3 fork and the pool maths is unmodified: ticks (`1.0001^i`, `MIN_TICK`/`MAX_TICK`), `slot0.sqrtPriceX96` in Q64.96, the `feeGrowthGlobal{0,1}X128` accumulators, tick crossing, the observation ring buffer, and the `Mint`/`Burn`/`Collect`/`Swap`/`Flash`/`Initialize` event shapes all behave as documented upstream. Use the [Uniswap V3 docs](https://docs.uniswap.org/contracts/v3/overview) and `@uniswap/v3-sdk` (`TickMath`, `SqrtPriceMath`) for the maths rather than reimplementing it.

What is Lista-specific, and what the rest of this page covers, is the deployed addresses, the fee tiers actually enabled on the Lista factory, and the pool-address derivation — all of which differ from Uniswap's.

## Fee tiers and tick spacing

Fee tiers are set in the `ListaV3Factory`. Each tier maps a fee (in hundredths of a basis point, i.e. `1e-6`) to a `tickSpacing`. Five are enabled on the live factory:

| Fee tier | `fee` (uint24) | `tickSpacing` | Notes |
| -------- | -------------- | ------------- | ----- |
| 0.0002% | `2` | `1` | Enabled post-deployment; used by Lista stablecoin pools |
| 0.01% | `100` | `1` | Enabled post-deployment; used by Lista LST pools |
| 0.05% | `500` | `10` | Constructor |
| 0.30% | `3000` | `60` | Constructor |
| 1.00% | `10000` | `200` | Constructor |

> The two lowest tiers are the ones Lista's own pools use, and they are **not** in the constructor set — an integrator who hard-codes `500` / `3000` / `10000` will get the zero address from `getPool` for every real Lista pool.

Additional tiers can be added by the factory owner via `enableFeeAmount(fee, tickSpacing)`; a tier, once enabled, can never be removed, and `feeAmountTickSpacing(fee)` returns `0` for tiers that are not enabled. Read `feeAmountTickSpacing(fee)` (or watch the `FeeAmountEnabled` event) for the authoritative live list rather than hard-coding tiers.

```solidity
function enableFeeAmount(uint24 fee, int24 tickSpacing) external; // factory owner only
event FeeAmountEnabled(uint24 indexed fee, int24 indexed tickSpacing);
```

## Building on Lista V3

Because Lista V3 is a Uniswap V3 fork:

- Use `@uniswap/v3-sdk` and `@uniswap/sdk-core` for price/tick math, position math, and route encoding, pointing them at the Lista contract addresses and BNB Smart Chain (chainId 56).
- The pool address is deterministic from `(factory, token0, token1, fee)` via CREATE2, **but you must use Lista's own pool init-code hash** — `0xa93d35cf943696a95cabbe3aa4b3d87ea5387169face953a337716fc15136ca2` — in the `PoolAddress` computation. Uniswap V3's default init-code hash yields the wrong address for Lista pools. Alternatively, read `factory.getPool(token0, token1, fee)` on-chain instead of deriving it.
- Pool, factory, and periphery interfaces match Uniswap V3 `IUniswapV3Pool` / `IUniswapV3Factory` / `INonfungiblePositionManager` / `ISwapRouter`, so existing V3 integrations port with minimal changes (renamed contracts, the upgradeable position manager, and the Lista-specific NFT name/symbol aside).

## Related pages

- [Smart Contract](smart-contract.md) — deployed contract addresses on BNB Smart Chain.
- [V3 Dex overview](README.md) — section landing page.
