# Smart Lending / Lista StableSwap 集成

Smart Lending 允许用户将 **Lista StableSwap LP 头寸作为抵押品** 存入 Moolah，借款并同时继续赚取基础池的交易费用。LP 代币永远不会闲置：它们由 `SmartProvider` 持有，1:1 包装成抵押代币，并提供给 Moolah 市场，而它们代表的池继续累积交换费用。

> 抵押代币 **不是自由可转让的 ERC-20**。`mint` 和 `burn` 仅限于铸币者，`transfer` / `transferFrom` 仅限于 Moolah 和持有 `TRANSFERER` 角色的地址。不要构建在任意账户之间移动的流程——通过提供者路由头寸变更。

通过 Lista StableSwap 路由交换，或使用 LP 头寸作为 Moolah 抵押品：

- 发现 Lista StableSwap 池并针对它们路由/报价交换，以及
- 通过 `SmartProvider` 将 StableSwap LP 移动到 Moolah Smart Lending 市场。

有关已部署地址，请参阅 [BSC Smart Lending](smart-contract-bsc-smart-lending.md)（不要硬编码此页面的地址——地址表是事实来源）。有关提供者如何融入 Moolah，请参阅 [Integration Patterns](integration-patterns.md)。

Lista StableSwap 是一个两币 Curve 风格的稳定池：每个池恰好有两个币（`N_COINS = 2`），按排序地址顺序索引为 `0` 和 `1`。

---

## 工厂：池发现

`StableSwapFactory` 是所有已部署池的注册表。使用它来枚举池并将代币对解析为其池和 LP 代币。

| 读取 | 签名 | 返回值 |
| --- | --- | --- |
| 池计数 | `pairLength() → uint256` | 注册池的数量。 |
| 按索引查找池 | `swapPairContract(uint256 index) → address` | `index` 处的池（交换）合约，对于 `[0, pairLength)` 中的 `index`。 |
| 对的池 | `getPairInfos(address tokenA, address tokenB) → StableSwapPairInfo[]` | 为该对注册的所有池（顺序无关——输入在内部排序）。 |
| 排序助手 | `sortTokens(address tokenA, address tokenB) → (address token0, address token1)` | 规范的 `(token0, token1)` 排序；如果相等则返回 `IDENTICAL_ADDRESSES`。 |

`StableSwapPairInfo` 是：

```solidity
struct StableSwapPairInfo {
  address swapContract; // StableSwap 池
  address token0;       // 排序后的币 0
  address token1;       // 排序后的币 1
  address LPContract;   // 由池铸造的 StableSwapLP (ERC-20)
}
```

币总是按排序顺序存储（`token0 < token1`）。单个代币对可以有多个池（例如标准池和窄价差池），这就是 `getPairInfos` 返回数组的原因。

要保持最新的池列表，索引工厂的 `NewStableSwapPair` 事件，或在 `[0, pairLength)` 上遍历 `swapPairContract(i)`。

---

## 池读取

直接从 `StableSwapPool`（`swapContract` 地址）读取池状态。

| 读取 | 签名 | 备注 |
| --- | --- | --- |
| 币地址 | `coins(uint256 i) → address` | `i ∈ {0, 1}`。对于本地 BNB 池，BNB 侧返回哨兵 `0xEeee…eEeE`（参见 [Native BNB](#native-bnb-handling)）。 |
| 池余额 | `balances(uint256 i) → uint256` | 币 `i` 的池跟踪余额，以该币的自身小数表示。 |
| LP 代币 | `token() → address` | 此池的 `StableSwapLP` ERC-20。 |
| 放大系数 | `A() → uint256` | 当前放大系数（已去缩放）。 |
| 交换费 | `fee() → uint256` | 费率分子，超过 `FEE_DENOMINATOR = 1e10`。 |
| 管理费 | `admin_fee() → uint256` | 作为协议费收取的 `fee` 份额，超过 `1e10`。 |
| 原生支持 | `support_BNB() → bool` | 如果其中一个币是原生 BNB，则为 `true`。 |
| 虚拟价格 | `get_virtual_price() → uint256` | 每个 LP 代币的不变量值，`1e18` 缩放。在重入时返回。 |
| 精度乘数 | `PRECISION_MUL(uint256 i) → uint256` | `10 ** (18 - decimals_i)`；将币 `i` 缩放到 18 位小数的内部单位。 |

`StableSwapPoolInfo` 是一个无状态助手，为您读取池并添加便利视图：

| 助手 | 签名 | 返回值 |
| --- | --- | --- |
| 余额 | `balances(address pool) → uint256[2]` | 两个池余额。 |
| LP → 币 | `calc_coins_amount(address pool, uint256 lpAmount) → uint256[2]` | 按比例提取 `lpAmount` LP 将产生的币数量。 |
| 持有者 → 币 | `get_coins_amount_of(address pool, address account) → uint256[2]` | 同样，对于账户的完整 LP 余额。 |
| 铸造预览 | `get_add_liquidity_mint_amount(address pool, uint256[2] amounts) → uint256` | `add_liquidity(amounts)` 将铸造的 LP（扣除存款费）。 |
| 反向报价 | `get_dx(address pool, uint256 i, uint256 j, uint256 dy, uint256 max_dx) → uint256` | 接收 `dy` 的币 `j` 所需的币 `i` 的输入，**放大**以覆盖费用。返回 `Excess balance` / `Exchange resulted in fewer coins than expected`。 |

---

## 报价交换：`get_dy`

`get_dy` 返回扣除费用后的输出金额——您实际收到的——以输出币的自身小数表示：

```solidity
function get_dy(uint256 i, uint256 j, uint256 dx) external view returns (uint256);
```

- `i` — 输入币索引，`j` — 输出币索引（`{0,1}`，`i != j`）。
- `dx` — 输入金额，以币 `i` 的小数表示。
- 返回扣除池的交换费后的币 `j` 的数量。

惯例：token0 → token1 是 `i = 0, j = 1`；token1 → token0 是 `i = 1, j = 0`。

```solidity
// USDT (币 0) 输入，USDC (币 1) 输出。
// USDT 0x55d3... 排序在 USDC 0x8AC7... 之下，因此 USDT 是币 0 —
// 读取 coins(0) / coins(1) 而不是假设顺序。
uint256 amountOut = pool.get_dy(0, 1, dxUSDT);
```

如果需要隔离费用组件，`get_dy_without_fee(i, j, dx)` 返回费用前的输出。执行的交换是：

```solidity
function exchange(uint256 i, uint256 j, uint256 dx, uint256 min_dy) external payable;
```

`min_dy` 是您的滑点底线；如果实现的输出低于它，交换将返回 `Exchange resulted in fewer coins than expected`。在执行前立即使用 `get_dy` 报价，并根据您的滑点容忍度从中推导出 `min_dy`。

---

## 价格差异保护

每个池持有一个弹性预言机参考，并且**可以**在状态改变操作上实施价格差异保护——但是否这样做是每个池和管理者控制的。读取特定池上的 `skipPriceDiff()` 而不是假设保护会保护您——`true` 表示保护是**关闭**的。

在启用的情况下，`exchange`、`add_liquidity` 和每个 `remove_liquidity*` 变体调用 `checkPriceDiff()`，当池对任一币的隐含价格与预言机价格的偏差超过每个币的阈值时返回：

- `Price difference for token0 exceeds threshold`
- `Price difference for token1 exceeds threshold`

相关读取：

| 读取 | 签名 | 备注 |
| --- | --- | --- |
| 预言机价格 | `fetchOraclePrice() → uint256[2]` | 每个币的预言机价格，`1e18` 缩放。 |
| 保护检查 | `checkPriceDiff()` | `view`；如果任一币的价格差异超过其阈值，则返回。可以安全地作为预飞行探测调用。 |
| 跳过标志 | `skipPriceDiff() → bool` | 当为 `true` 时，不执行保护。一个较早注册的池在调用时**返回**——将返回视为“保护行为未知”，而不是 `false`。 |
| 阈值 | `price0DiffThreshold()`, `price1DiffThreshold() → uint256` | 每个币的阈值，`1e18` 缩放。值因池而异——读取它们而不是假设部署默认值。 |

这些阈值和跳过标志是链上可由管理者调整的值；在调用时读取它们而不是假设固定数值。对于大型或价格敏感的路由，在提交前以 `staticcall` 调用 `checkPriceDiff()`，以便您可以显示明确的错误而不是失败的交易。

> 因为保护也在流动性操作上运行，当池价格与预言机偏离时，LP 提取（包括通过 `SmartProvider`）可能会返回。将“价格差异超过阈值”视为暂时的、在重新挂钩时重试的条件，而不是永久失败。

---

## 原生 BNB 处理

当池的一个币是原生 BNB 时，池“支持 BNB” (`support_BNB() == true`)，由哨兵地址表示：

```
0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
```

与 BNB 池交互时的处理规则：

- `coins(i)` 返回 BNB 侧的哨兵；它**不是** ERC-20——不要在其上调用 `approve`/`transferFrom`。
- 对于 BNB 币，以 `msg.value` 发送金额。池要求 `msg.value` 与 BNB 输入金额完全相等（否则返回 `Inconsistent quantity`）。
- 对于 ERC-20 币，批准池，它将像往常一样 `transferFrom` 您。
- 在**非 BNB** 池上，任何非零 `msg.value` 都会被拒绝（`Inconsistent quantity`），以防止意外发送 BNB。
- BNB 支付使用有限的 gas 津贴，因此接收合约的 `receive()`/fallback 必须在该预算内，否则转账返回 `BNB transfer failed`。

从 `support_BNB()` 检测池类型，并在决定使用 `msg.value` 还是 ERC-20 转账之前，将每个 `coins(i)` 与哨兵进行比较。

---

## 通过 `SmartProvider` 向 Moolah 提供 LP

`SmartProvider` 是将 StableSwap LP 桥接到 Moolah 市场的 [provider](integration-patterns.md)。它持有 LP，1:1 铸造抵押代币 (`StableSwapLPCollateral`)，并代表用户将其提供给 Moolah——LP 在支持贷款的同时继续赚取池费用。每个 `SmartProvider` 在部署时绑定到一个池和一个抵押代币；从 [BSC Smart Lending](smart-contract-bsc-smart-lending.md) 解析您的池的正确实例。

根据用户是否已经持有 LP，有两个入口点。

### `supplyDexLp` — 提供现有 LP

当用户已经持有 StableSwap LP 代币时使用。

```solidity
function supplyDexLp(
  MarketParams calldata marketParams,
  address onBehalf,
  uint256 lpAmount
) external;
```

流程：提供者从 `msg.sender` 拉取 `lpAmount` LP（首先在 LP 代币上批准提供者），1:1 铸造抵押代币，并为 `onBehalf` 调用 `MOOLAH.supplyCollateral`。`marketParams.collateralToken` 必须等于提供者的抵押代币（返回 `invalid collateral token`）；`lpAmount` 必须非零（`zero lp amount`）。

### `supplyCollateral` — 将代币转换为 LP，然后提供

当用户持有基础代币并希望提供者在一次调用中为他们添加流动性时使用。

```solidity
function supplyCollateral(
  MarketParams calldata marketParams,
  address onBehalf,
  uint256 amount0,
  uint256 amount1,
  uint256 minLpAmount
) external payable;
```

流程：提供者拉取 `amount0`/`amount1`（首先在提供者上批准每个 ERC-20 币），调用池的 `add_liquidity([amount0, amount1], minLpAmount)`，将生成的 LP 1:1 铸造为抵押品，并为 `onBehalf` 提供。

- `amount0`/`amount1` 中至少一个必须 > 0（`invalid amounts`）。
- `minLpAmount` 是铸造的滑点底线；如果铸造的 LP 少于 `minLpAmount`，添加流动性将返回 `Slippage screwed you`。
- 对于 BNB 池，将 BNB 币的金额作为 `msg.value` 传递（它必须等于该币的金额；`amount0 should equal msg.value` / `amount1 should equal msg.value`）。在非 BNB 池上，`msg.value` 必须为 0（`msg.value must be 0`）。

两条路径都会触发提供者的 `SupplyCollateral` 事件。

一旦抵押品进入市场，借款和还款将如常在 Moolah 市场进行。提款有四条路径，而不是两条供应入口点的一对一镜像：提供者暴露 `withdrawDexLp`（返回 LP）、`withdrawCollateral`（按比例分配 token0/token1）、`withdrawCollateralImbalance`（精确代币数量）和 `withdrawCollateralOneCoin`（单一代币）——每种方式的抵押品都可以在退出时拆分。所有四种方式都燃烧抵押代币，但只有后三种方式调用池上的 `remove_liquidity*`，因此受价格差异保护。**`withdrawDexLp` 返回原始 LP 代币而不触碰池**，因此它永远不会触发保护——它是在保护会阻止提款时仍然可用的退出。

对于将这些调用组装为准备发送步骤的 TypeScript 构建器（`buildSmartSupplyDexLpParams`、`buildSmartSupplyCollateralParams` 和匹配的提款/还款构建器），请参阅 [Moolah Lending SDK](../sdk.md)。

---

## 返回检查表

集成时的常见返回，及其引发的合约：

| 返回字符串 | 位置 | 原因 / 修复 |
| --- | --- | --- |
| `IDENTICAL_ADDRESSES` | 工厂 | `sortTokens`/查找调用时 `tokenA == tokenB`。 |
| `Exchange resulted in fewer coins than expected` | 池 `exchange` | 实现的输出低于 `min_dy`。使用 `get_dy` 重新报价并扩大滑点。 |
| `Slippage screwed you` | 池 `add_liquidity` / `remove_liquidity_imbalance` | 铸造低于 `min_mint_amount` / 燃烧高于 `max_burn_amount`。调整滑点界限。 |
| `Withdrawal resulted in fewer coins than expected` | 池 `remove_liquidity` | 未满足 `min_amounts[i]` 底线。 |
| `Not enough coins removed` | 池 `remove_liquidity_one_coin` | 输出低于 `min_amount`。 |
| `Price difference for token0 exceeds threshold` / `…token1…` | 池 `checkPriceDiff` | 池价格与预言机偏离超过阈值。重新挂钩后重试。 |
| `Inconsistent quantity` | 池 | BNB 数量 ≠ `msg.value`，或 `msg.value` 发送到非 BNB 池。 |
| `BNB transfer failed` | 池 | BNB 接收者返回或超过 gas 津贴。 |
| `Reentrant call` | 池 `get_virtual_price` | 在进行中的池操作期间调用。 |
| `invalid collateral token` | SmartProvider | `marketParams.collateralToken` ≠ 提供者的抵押代币。 |
| `zero lp amount` / `invalid amounts` | SmartProvider | `supplyDexLp` 使用 0 LP / `supplyCollateral` 使用两个金额为 0。 |
| `amount0 should equal msg.value` / `amount1 should equal msg.value` / `msg.value must be 0` | SmartProvider | Native-BNB `msg.value` 在 `supplyCollateral` 上不匹配。 |
| `no lp minted` | SmartProvider | `add_liquidity` 未产生 LP（例如，尘埃量）。 |
| `unauthorized sender` | SmartProvider | 为您未授权的 `onBehalf` 提款。 |