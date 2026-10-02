# 架构与机制

Lista V3 Dex 是一个部署在 BNB Smart Chain 上的集中流动性自动化做市商 (AMM)。

> **Lista V3 是 Uniswap V3 的一个分叉。** 标准的 Uniswap V3 模型、数学、合约接口和 SDK（例如 `@uniswap/v3-sdk`，`@uniswap/sdk-core`）直接适用。合约被重命名（`ListaV3Factory`，`ListaV3Pool`），但它们的接口、事件和行为与 Uniswap V3 匹配。在 Lista 的部署中有四个不同之处，如果忽略它们，将会破坏复制的 V3 集成：启用的费用等级、NFT 名称、可升级的位置管理器，以及用于链下地址推导的 Lista 特定池初始化代码哈希（参见[在 Lista V3 上构建](#building-on-lista-v3)）。对于底层数学，请使用 Uniswap V3 白皮书。

有关已部署合约地址，请参见[智能合约](smart-contract.md)。

## 组件合约

| 合约 | 角色 |
| -------- | ---- |
| `ProxyAdmin` | 部署中可升级代理的管理员（例如位置管理器）。 |
| `ListaV3Factory` | 部署并注册每个 `(token0, token1, fee)` 元组的一个池；拥有启用的费用等级 → tick 间距表。 |
| `ListaV3Pool` | 单个对 + 费用等级的核心 AMM 合约。持有流动性、`slot0` 价格/tick 状态、费用累加器、ticks 和位置。由工厂创建。 |
| `NonfungiblePositionManager` | 外围合约，将流动性位置包装为 ERC-721 NFT，并处理铸造/增加/减少/收集/销毁。在透明代理后面部署。 |
| `NonfungibleTokenPositionDescriptor` | 为位置 NFT 渲染链上代币元数据 (`tokenURI`)。 |
| `SwapRouter` | 外围合约，用于执行具有滑点和截止日期保护的单跳和多跳交换。 |

[智能合约](smart-contract.md) 中的 `*Pool` 行是由工厂部署的单独池，而不是单例——每个不同的 `(token0, token1, fee)` 组合都是其自己的 `ListaV3Pool` 实例。

## AMM 模型

### 工厂 → 池

池由有序的代币对和费用等级唯一标识。代币按地址排序，以便 `token0 < token1`；工厂以 `getPool[token0][token1][fee]` 两种方式存储池。

```solidity
// ListaV3Factory
function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool);
function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
function feeAmountTickSpacing(uint24 fee) external view returns (int24);

event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool);
```

`createPool` 从费用等级推导出 `tickSpacing`，确定性地部署池，并发出 `PoolCreated`。新创建的池必须通过 `initialize(sqrtPriceX96)` 初始化一次，然后才能添加流动性。池地址是确定性的（来自池键的 CREATE2），但 Lista 的池有自己的字节码，因此链下推导必须使用 **Lista 的** 池初始化代码哈希——而不是 Uniswap 的——或者简单地读取 `factory.getPool(token0, token1, fee)`。参见[在 Lista V3 上构建](#building-on-lista-v3)以获取哈希。

### 作为 ERC-721 的位置 (NonfungiblePositionManager)

流动性位置被铸造成 ERC-721 NFT。集合命名为 **`Lista V3 Positions NFT`**，符号为 **`LISTA-V3`**。与 Uniswap 的不可变位置管理器不同，Lista 部署是一个可升级合约（透明代理 + `initialize()`）；ERC-721 代币语义是标准的，并支持 EIP-712 许可。

```solidity
// params: upstream INonfungiblePositionManager.MintParams, unchanged
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

读取一个位置返回完整的 Uniswap V3 位置元组：

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

`tokensOwed0` / `tokensOwed1` 是位置的未收集余额，在流动性变化时记入，并通过 `collect` 实现。它们持有**不仅仅是费用**：`decreaseLiquidity` 将提取的本金添加到它们中，而不是转移它，因此移除流动性本身不移动代币——需要后续的 `collect` 来接收本金和累积的费用。

### 交换 (SwapRouter)

交换通过 `SwapRouter` 路由，支持精确输入和精确输出、单跳和多跳。单跳通过 `(tokenIn, tokenOut, fee)` 选择池；多跳使用打包的 `path`（20 字节代币，3 字节费用，20 字节代币，…）。

```solidity
// SwapRouter
// params: upstream ISwapRouter.ExactInputSingleParams, unchanged
function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
function exactOutputSingle(ExactOutputSingleParams calldata params) external payable returns (uint256 amountIn);
function exactOutput(ExactOutputParams calldata params) external payable returns (uint256 amountIn);
```

`amountOutMinimum` / `amountInMaximum` 强制执行滑点限制，`deadline` 限制执行时间，`sqrtPriceLimitX96` 可选地限制交换中的价格变动。

## Uniswap V3 机制

Lista V3 是 Uniswap V3 的一个分叉，池数学未修改：ticks (`1.0001^i`，`MIN_TICK`/`MAX_TICK`)，`slot0.sqrtPriceX96` 在 Q64.96 中，`feeGrowthGlobal{0,1}X128` 累加器，tick 穿越，观察环形缓冲区，以及 `Mint`/`Burn`/`Collect`/`Swap`/`Flash`/`Initialize` 事件形状都如上游文档所述。使用 [Uniswap V3 文档](https://docs.uniswap.org/contracts/v3/overview) 和 `@uniswap/v3-sdk` (`TickMath`, `SqrtPriceMath`) 进行数学运算，而不是重新实现它。

与 Uniswap 不同的是已部署的地址、Lista 工厂上启用的费用等级和池地址推导。

## 费用等级和 tick 间距

费用等级在 `ListaV3Factory` 中设置。每个等级将费用（以基点的百分之一表示，即 `1e-6`）映射到 `tickSpacing`。在实时工厂中启用了五个：

| 费用等级 | `fee` (uint24) | `tickSpacing` | 备注 |
| -------- | -------------- | ------------- | ----- |
| 0.0002% | `2` | `1` | 部署后启用；由 Lista 稳定币池使用 |
| 0.01% | `100` | `1` | 部署后启用；由 Lista LST 池使用 |
| 0.05% | `500` | `10` | 构造函数 |
| 0.30% | `3000` | `60` | 构造函数 |
| 1.00% | `10000` | `200` | 构造函数 |

> Lista 的稳定币和 LST 池（在上表中注明）使用两个最低等级，这些等级**不在**构造函数集中。不要假设 Uniswap 常见的 `500` / `3000` / `10000` 等级标识 Lista 池；查询工厂以获取目标池的费用等级。

工厂所有者可以通过 `enableFeeAmount(fee, tickSpacing)` 添加额外的等级；一旦启用，等级永远不能被移除，并且对于未启用的等级，`feeAmountTickSpacing(fee)` 返回 `0`。读取 `feeAmountTickSpacing(fee)`（或监视 `FeeAmountEnabled` 事件）以获取权威的实时列表，而不是硬编码等级。

```solidity
function enableFeeAmount(uint24 fee, int24 tickSpacing) external; // 仅限工厂所有者
event FeeAmountEnabled(uint24 indexed fee, int24 indexed tickSpacing);
```

## 在 Lista V3 上构建

由于 Lista V3 是 Uniswap V3 的一个分叉：

- 使用 `@uniswap/v3-sdk` 和 `@uniswap/sdk-core` 进行价格/tick 数学、位置数学和路径编码，将它们指向 Lista 合约地址和 BNB Smart Chain (chainId 56)。
- 池地址是从 `(factory, token0, token1, fee)` 通过 CREATE2 确定的，**但您必须使用 Lista 自己的池初始化代码哈希**——`0xa93d35cf943696a95cabbe3aa4b3d87ea5387169face953a337716fc15136ca2`——在 `PoolAddress` 计算中。Uniswap V3 的默认初始化代码哈希会为 Lista 池生成错误的地址。或者，读取链上的 `factory.getPool(token0, token1, fee)` 而不是推导它。
- 池、工厂和外围接口与 Uniswap V3 的 `IUniswapV3Pool` / `IUniswapV3Factory` / `INonfungiblePositionManager` / `ISwapRouter` 匹配，因此现有的 V3 集成可以以最小的更改移植（重命名合约、可升级的位置管理器和 Lista 特定的 NFT 名称/符号除外）。

## 相关页面

- [V3 Dex 概述](README.md) — 部分登陆页面。