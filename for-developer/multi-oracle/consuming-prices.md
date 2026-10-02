# 消费 Oracle 价格

在 Lista 堆栈中存在两种不同的价格函数，它们经常被混淆。它们位于不同的层，接受不同的参数，并返回不同尺度的数字。在预期使用一个函数的地方读取另一个函数会导致错误的健康因子和错误定价的清算。

| Function | Layer | Signature | Returns | Scale |
| --- | --- | --- | --- | --- |
| `peek` | Oracle (Resilient Oracle / any `IOracle`) | `peek(address asset) → uint256` | **一个 `asset` 的价格，以 USD 报价** | `1e8` (参见 [Decimals](#decimals-what-peek-returns)) |
| `getPrice` | Moolah market | `getPrice(MarketParams marketParams) → uint256` | **一个抵押品代币的价格，以贷款代币报价** | 固定 `36 + loanDecimals − collateralDecimals` (参见 [The scale factor](#the-market-scale-factor)) |

经验法则：`peek` 回答“这个资产在 USD 中值多少钱？”；`getPrice` 回答“在 Moolah 的数学期望的尺度上，一个单位的抵押品值多少贷款代币？”。健康检查和清算使用 `getPrice`。仅在您真正需要单个资产的 USD 值时使用 `peek`（例如，重建市场价格的两个部分，或对 feed 进行合理性检查）。

要读取市场的 oracle，您需要调用两个函数进行只读操作，验证哪个反馈了一个资产，并使用来自 `Moolah.sol` 的确切尺度因子计算一个头寸的健康和清算价格。有关每个资产的 oracle 地址表，请参见 [Standard Collaterals](../multi-oracle-standard.md) 和 [bStock Collaterals](../multi-oracle-bstock.md)。

---

## Layer 1 — oracle: `peek(address asset)`

每个 Moolah 市场可以使用的 oracle 都实现了 `IOracle`：

```solidity
struct TokenConfig {
  address asset;
  address[3] oracles;             // [main, pivot, fallback]
  bool[3] enableFlagsForOracles;  // 启用状态，顺序相同
  uint256 timeDeltaTolerance;     // 陈旧窗口，以秒为单位；0 禁用检查
}

interface IOracle {
  function peek(address asset) external view returns (uint256);
  function getTokenConfig(address asset) external view returns (TokenConfig memory);
}
```

`peek(asset)` 返回一个单位 `asset` 的 USD 价格。它是一个 `view` 函数——调用免费，无状态更改。Lista 的大多数抵押品背后的生产 oracle 是 **Resilient Oracle**，其 `peek` 实现如下所述，但市场策展人可以将市场指向任何满足 `IOracle` 的合约。

### Decimals: `peek` 返回的内容

在 `IOracle` 路径上的每个 Lista oracle 都返回一个具有 **8 位小数** 的 USD 价格（唯一的例外是 `IdleOracle`，它返回一个字面 `0` 作为其闲置抵押品的哨兵而不是价格）——与 Moolah 内部用于 `minLoanValue` 的精度相同，这就是为什么 `Moolah.minLoan` 可以直接混合 `minLoanValue` 和 `peek`。上游 feed（Chainlink、Atlas、BNB Chain 上的 RedStone）发布 8 位小数的答案，而 Lista 的适配器将其标准化为 8 而不是远离它：`PTLinearDiscountOracle` 将一个 18 位小数的折扣 oracle 输入除以 `1e10` 并声明 `decimals() = 8`。

> **这是已部署 oracle 的属性，而不是接口的保证。** `IOracle` 声明 `peek(address) → uint256` 和 `getTokenConfig(address) → TokenConfig`，两者都不携带计价单位或尺度字段——Moolah 也不验证任何一个；它只是简单地除以两个 `peek` 结果，因此任何一致的尺度对都会通过。对于您没有部署的市场 oracle，请在信任幅度之前确认 **两** 条腿的计价单位和小数。遗留的 CDP `peek() → (bytes32, bool)` 表面（无参数——每个抵押品有一个 pip），Moolah 从未调用过，标准化为 18 位小数——不要将该假设带过去。

在市场层工作时，您**不需要**猜测这些小数：`getPrice`（Layer 2）读取两条腿并根据代币小数对其进行标准化。当您直接调用 `peek` 时，请始终确认您正在读取的特定 feed 的小数，而不是假设固定的幅度。

### Resilient Oracle 如何选择价格

Resilient Oracle 为每个资产聚合多达三个来源并交叉验证它们，因此单个错误的 feed 无法移动价格。它为每个资产配置三个角色：

| Role | Purpose |
| --- | --- |
| **main** | 最值得信赖的价格来源。必须设置（非零）。 |
| **pivot** | 用于验证主（和备用）价格的松散合理性检查器。可选。 |
| **fallback** | 主价格验证失败时使用的备用来源。可选。 |

`peek` 按此优先级解析价格（参见 `ResilientOracle._getPrice`）：

1. 如果 **main** 启用并通过 **pivot** 验证（通过 `BoundValidator`），则返回主价格。如果未配置/启用 pivot，则直接返回主价格。
2. 否则，如果 **fallback** 启用并通过 **pivot** 验证，则返回备用价格。
3. 否则，如果主和备用都可用并相互验证，则返回主价格。
4. 否则，返回 `"invalid resilient oracle price"`。

### PT 线性折扣

PT 抵押品的定价是相对于基础资产的折扣，该折扣在到期时缩小为零。从 PT 的折扣 oracle 中读取折扣 `getDiscount(timeToMaturity)`（1e18 缩放）而不是重新计算它。

部署了两种变体，它们在处理该比率时有所不同：

| Contract | Returns |
| --- | --- |
| `PTLinearDiscountOracle` | 仅 `(1 − discount)`，缩放为 8 位小数。它从不读取基础资产的价格——假设为 USD 挂钩——因此在到期时和之后返回一个固定的 `1e8`，而不是基础资产的实际价格。 |
| `PTLinearDiscountMarketOracle` | 相同的比率乘以基础代币的 oracle 价格，因此它趋向于基础资产。 |

两者都声明 `decimals() = 8`，因此它们的读取方式与 `IOracle` 路径上的任何其他 feed 相同——但它们的实现方式不同。`PTLinearDiscountOracle` 将 18 位小数的折扣答案除以 `1e10`。`PTLinearDiscountMarketOracle` 将 8 位小数的基础价格乘以该答案并除以 `1e18`。

如果来源被禁用、缺失、回退或**陈旧**，则会跳过该来源——`getPriceFromOracle` 将 `updatedAt` 早于资产的 `timeDeltaTolerance` 的 Chainlink 风格答案视为无效（`INVALID_PRICE = 0`）。`timeDeltaTolerance` 为 `0` **完全禁用陈旧检查**而不是拒绝所有内容；`PTLinearDiscountOracle` 和 `IdleOracle` 在此返回 `0`，因此在假设新鲜度保证之前读取该值。

**BoundValidator.** 验证将报告的价格与锚价格进行比较。使用 `anchorRatio = anchorPrice * 1e18 / reportedPrice`，仅当：

```
lowerBoundRatio <= anchorRatio <= upperBoundRatio
```

时，报告的价格才被接受。

边界是为每个资产配置的——`BoundValidator` 不存储默认值，因此请查阅 [Standard Collaterals](../multi-oracle-standard.md) 和 [bStock Collaterals](../multi-oracle-bstock.md) 表中的每个资产限制。报告的价格为 `0` 时验证失败（返回 `false`）；锚价格为 `0` 时则回退（`anchor price is not valid`）。在没有配置的情况下到达边界验证器的资产会回退 `validation config not exist`，该回退会从 `peek` 中传播出来。三条路径到达它：主 oracle 读取的成功分支和备用 oracle 读取的成功分支——当启用了 pivot 并返回了有效价格时——加上主与备用路径上的未尝试外部调用，当这两个返回非零时。没有一个被周围的 `catch` 吸收，它只覆盖 oracle 读取本身，而不是随后的验证。将其与 `invalid resilient oracle price` 区分开来，这是当资产根本没有可用价格时得到的结果——包括没有弹性 oracle 配置的资产，或者启用的 pivot 已过时且没有备用的资产。

> 每个资产配置了哪些来源和边界（以及每个链的 Resilient Oracle 地址）在 [Standard Collaterals](../multi-oracle-standard.md) 和 [bStock Collaterals](../multi-oracle-bstock.md) 表中发布。不要硬编码它们。

### 验证哪个反馈了一个资产

要在信任市场之前查看抵押品背后的来源，请直接从 oracle 读取代币配置：

```solidity
// oracle = a market's marketParams.oracle
TokenConfig memory cfg = IOracle(oracle).getTokenConfig(collateralToken);
// cfg.oracles[0] = main, [1] = pivot, [2] = fallback
// cfg.enableFlagsForOracles[i] 告诉您哪些角色是活动的
// cfg.timeDeltaTolerance 是陈旧窗口，以秒为单位（0 = 检查禁用）
```

Resilient Oracle 还公开了 `getOracle(asset, role) → (address oracle, bool enabled)` 用于读取单个角色。

---

## Layer 2 — market: `getPrice(MarketParams)`

Moolah 市场的价格是抵押资产以贷款资产定价，而不是以 USD 定价。这是 Moolah 的健康和清算数学实际消耗的数字。

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

`getPrice` 是 `view`。在底层，它从市场的 oracle 读取两条腿（`oracle.peek(collateralToken)` 和 `oracle.peek(loanToken)`）并将它们与固定的尺度因子结合。

### 市场尺度因子

从 `Moolah.getPrice` / `_getPrice`，使用 `base = collateralToken` 和 `quote = loanToken`：

```solidity
uint256 scaleFactor = 10 ** (36 + quoteTokenDecimals - baseTokenDecimals);
return scaleFactor.mulDivDown(basePrice, quotePrice);
//     = scaleFactor * basePrice / quotePrice   (向下舍入)
```

其中 `basePrice = peek(collateralToken)`，`quotePrice = peek(loanToken)`，`baseTokenDecimals = IERC20Metadata(collateralToken).decimals()`，`quoteTokenDecimals = IERC20Metadata(loanToken).decimals()`。

因为相同的 feed 小数出现在 `basePrice` 和 `quotePrice` 中，它们在比率中相互抵消，而 `36 + quoteDecimals − baseDecimals` 指数将结果标准化为 Moolah 的规范价格尺度。结果是故意针对常量：

```solidity
uint256 constant ORACLE_PRICE_SCALE = 1e36;
```

将 `getPrice` 视为 **原始单位转换因子，而不是人类可读的价格**：将原始抵押品数量（以抵押品代币自己的小数表示）乘以 `getPrice` 并除以 `1e36` 得到等效的债务，以 **原始贷款代币单位** 表示——`rawCollateral × getPrice / 1e36 = rawLoan`。因为尺度因子携带 `10**(quoteDecimals − baseDecimals)`，`getPrice / 1e36` 等于每个整代币价格 *仅当两个代币共享相同的小数时*；对于跨不同小数的“1 抵押品 = X 贷款代币”价格，请自己应用代币小数（或通过 `peek` 从两个 USD 腿中推导）。下面的健康和清算数学完全在原始单位中工作，因此您永远不需要人类价格来获得链上准确的结果。

> 经纪市场注意。`getPrice(marketParams)` 使用 `user = address(0)` 调用内部价格，这总是返回普通市场价格。对于固定期限/信用 **经纪** 市场，特定账户的价格可能与市场价格不同；协议使用市场价格进行标准健康检查，以便清算人可以及时行动。除非您正在集成经纪产品，否则 `getPrice(marketParams)` 是您想要的数字。参见 [Broker Reference](../lista-lending/broker-reference.md)。

---

## 使用尺度因子计算健康

Moolah 的健康检查（`Moolah._isHealthy`）是：

```solidity
uint256 maxBorrow = uint256(position.collateral)
  .mulDivDown(collateralPrice, ORACLE_PRICE_SCALE)   // collateral * price / 1e36
  .wMulDown(marketParams.lltv);                        // * lltv / 1e18

bool healthy = maxBorrow >= borrowed;                  // borrowed 向上舍入
```

其中：

- `collateralPrice = getPrice(marketParams)`（`1e36` 缩放的抵押品以贷款计价的价格）。
- `position.collateral` 是抵押品代币自己的小数表示的原始抵押品数量。
- `borrowed` 是借款人的债务，以贷款代币单位表示（借款份额转换为资产，在协议的有利条件下向上舍入）。
- `lltv` 是 WAD 缩放的（`1e18` = 100%），并且 `wMulDown(x, lltv) = x * lltv / 1e18`。

因此，抵押品的借款能力，以贷款代币单位表示，是：

```
maxBorrow = collateral * getPrice / 1e36 * lltv / 1e18
```

当 `maxBorrow >= borrowed` 时，头寸是健康的。注意两个独立的尺度除法：`1e36`（价格尺度）和 `1e18`（LLTV WAD）。丢弃任何一个是最常见的集成错误。

您不必在链下重现这一点来回答“这个头寸是否健康？”——Moolah 公开了 `isHealthy(marketParams, id, borrower)` 作为一个 `view` 函数，应用协议的健康公式。

> 这**不是**执行等效的。视图读取市场的*存储*总数，而 `borrow`、`withdrawCollateral` 和 `liquidate` 都首先调用 `_accrueInterest`。因此，一个头寸可以通过视图，但在执行时一旦应计利息被折入债务就会失败。对于执行等效的答案，模拟调用，或者首先应计利息（`accrueInterest` 是无权限的）并立即读取视图。

### 只读示例（viem）

```typescript
import { createPublicClient, http } from "viem";

const client = createPublicClient({ transport: http(RPC_URL) });

// 1. 从其 id（bytes32）解析市场的参数。
// `idToMarketParams` 是一个公共映射 getter，因此其 ABI 输出是五个
// 扁平化的值，而不是一个结构体——viem 返回一个数组。解构它；
// 读取 `.lltv` 的结果是未定义的。
const [loanToken, collateralToken, oracle, irm, lltv] =
  await client.readContract({
    address: MOOLAH,
    abi: MOOLAH_ABI,
    functionName: "idToMarketParams",
    args: [marketId],
  });
const marketParams = { loanToken, collateralToken, oracle, irm, lltv };

// 2. 抵押品价格，以贷款代币报价，缩放为 1e36。
const price = await client.readContract({
  address: MOOLAH,
  abi: MOOLAH_ABI,
  functionName: "getPrice",
  args: [marketParams],
}); // bigint

// 3. `collateral` 单位的借款能力，以贷款代币单位表示。
const ORACLE_PRICE_SCALE = 10n ** 36n;
const WAD = 10n ** 18n;
const maxBorrow = ((collateral * price) / ORACLE_PRICE_SCALE) * lltv / WAD;
const healthy = maxBorrow >= borrowed;
```

这里的 `collateral` 和 `borrowed` 是每个代币自己的小数表示的原始链上整数；不要预先缩放它们。`getPrice` 已经考虑了两个代币之间的小数差异。

## 清算价格

健康边界是 `maxBorrow == borrowed` 的地方。求解健康不等式以获得抵押品价格给出了**清算价格**——在固定 `collateral` 和 `borrowed` 的情况下，头寸变得有资格被清算的 `getPrice` 值：

```
liquidationPrice = borrowed * 1e36 * 1e18 / (collateral * lltv)
```

（所有值都是原始的，以其本地单位/尺度表示）。一旦 `getPrice(marketParams)` 低于 `liquidationPrice`，头寸就变得可清算。

> 将其视为**近似的分析阈值，而不是精确的整数边界。** 链上检查是 `maxBorrow >= borrowed`，其中 `maxBorrow` 被两次向下舍入，而 `borrowed` 被向上舍入——所有这些都对协议有利——因此头寸可以在计算的价格下已经可以被清算。使用此公式对候选者进行排名和监控，并使用 `isHealthy` 或模拟交易来决定特定头寸是否可以立即被清算。

当抵押品被没收时（`Moolah.liquidate`），相同的尺度出现：没收抵押品的贷款代币价值是 `seizedAssets.mulDivUp(collateralPrice, ORACLE_PRICE_SCALE)`。这等于 `seizedAssets * getPrice / 1e36` **仅在非经纪市场上**——`liquidate` 使用 `_getPrice(marketParams, borrower)` 定价，当设置了经纪人时，它通过经纪人路由，因此在经纪市场上它不是 `getPrice` 值。清算激励因子和游标是**编译时常量**（`ConstantsLib` 中的 `LIQUIDATION_CURSOR`，`MAX_LIQUIDATION_INCENTIVE_FACTOR`），而不是治理可调参数。

---

## 集成商的检查清单

- **定价头寸的健康/清算：** 使用 `getPrice(marketParams)` 并除以 `ORACLE_PRICE_SCALE` (`1e36`)，然后用 `1e18` WAD 应用 `lltv`。在这里永远不要混入原始 `peek` 值。
- **需要单个资产的 USD 值：** 使用 `oracle.peek(asset)` 并在缩放之前确认该 feed 的小数。
- **审计市场的 oracle：** 读取 `marketParams.oracle`，然后 `getTokenConfig(collateralToken)` 以查看主/枢轴/备用来源、启用标志和陈旧容忍度；交叉引用 [Standard Collaterals](../multi-oracle-standard.md) / [bStock Collaterals](../multi-oracle-bstock.md) 上的地址。
- **所有这些都是 `view` 调用**——不需要交易。它们并不是所有的无条件可调用的：对于 **bStock** 抵押品，`StockOracle` 在市场标记为关闭时回退 `StockMarketClosed()`，因此 `peek` 和 `getPrice` 对该资产回退。`isHealthy` 也会回退**除非**头寸没有债务，在这种情况下它返回 `true` 而不触及 oracle。将回退视为预期的协议状态，而不是 RPC 故障。注意关闭标志不是一个时钟——它是一个管理级别的全局开关，一个每股的机器人标志，以及一个暂停者级别的紧急关闭，因此它不会总是与交易时间一致。

## 相关页面

- [Oracle](../../introduction/lista-lending/oracle.md) — Lista Lending 中 oracle 的概念概述。
- [Moolah Lending SDK](../sdk.md) — 为您读取市场数据和价格的 TypeScript 助手。