# 利率模型

Moolah 市场将借款利率的计算委托给可插拔的利率模型 (IRM)。每个市场存储一个 `irm` 地址，并在每次利息累积时，Moolah 调用该合约以获取当前的借款利率。

协议附带了两个 IRM 实现：

| IRM | 模型 | 使用场景 |
| --- | --- | --- |
| `InterestRateModel` | 作为利用率函数的自适应曲线利率，具有随时间调整的目标利率 | 标准基于利用率的市场 |
| `FixedRateIrm` | 管理设置的固定每市场利率 | 固定期限/固定利率经纪产品（参见 [集成模式](integration-patterns.md)）|

每个 IRM 实现共享的 `IIrm` 接口：

```solidity
interface IIrm {
    /// @notice 每秒借款利率（按 WAD 缩放）；可能会修改存储。
    function borrowRate(MarketParams memory marketParams, Market memory market) external returns (uint256);

    /// @notice 每秒借款利率（按 WAD 缩放）；只读。
    function borrowRateView(MarketParams memory marketParams, Market memory market) external view returns (uint256);
}
```

IRM 中的所有利率均以**每秒为单位，按 WAD (`1e18`) 缩放**。Moolah 在累积利息时，将这种每秒利率在交互之间的经过时间内进行复利计算。

## 自适应曲线模型

`InterestRateModel` 计算借款利率为围绕目标利用率的曲线函数。曲线由一个 `rateAtTarget` 值锚定，该值本身随时间调整：当利用率高于目标时，`rateAtTarget` 向上漂移；当低于目标时，它向下漂移。这将市场推回到目标利用率，而无需治理干预。

### 利用率和误差

利用率是总借款除以总供应：

```text
utilization = totalBorrowAssets / totalSupplyAssets   (WAD 缩放，如果没有供应则为 0)
```

模型通过一个标准化误差 `err` 来衡量利用率与目标的偏离程度，映射为在零利用率时 `err = -1`，在目标利用率时 `err = 0`，在满（100%）利用率时 `err = +1`：

```text
errNormFactor = utilization > TARGET_UTILIZATION ? (WAD - TARGET_UTILIZATION) : TARGET_UTILIZATION
err           = (utilization - TARGET_UTILIZATION) / errNormFactor
```

### 曲线

给定当前的 `rateAtTarget` 和误差，即时利率为分段线性曲线。在目标以下，利率向下缩放至 `rateAtTarget / CURVE_STEEPNESS`；在目标以上，利率向上缩放至 `rateAtTarget * CURVE_STEEPNESS`：

```text
r = ((1 - 1/C) * err + 1) * rateAtTarget    if err < 0
    ((C - 1)   * err + 1) * rateAtTarget    if err >= 0
```

其中 `C = CURVE_STEEPNESS`。在 `err = 0`（利用率正好在目标）时，借款利率等于 `rateAtTarget`。

### `rateAtTarget` 的调整

`rateAtTarget` 按市场存储（`mapping(Id => int256) rateAtTarget`），仅在有状态交互时更新。在两次更新之间，它根据 `ADJUSTMENT_SPEED * err` 每秒移动，通过连续复利（指数）调整在经过时间内应用：

```text
linearAdaptation = (ADJUSTMENT_SPEED * err) * elapsed
endRateAtTarget  = clamp(startRateAtTarget * exp(linearAdaptation), MIN_RATE_AT_TARGET, MAX_RATE_AT_TARGET)

# 然后再次受市场自身的上限/下限约束后存储：
endRateAtTarget  = clamp(endRateAtTarget, rateFloor * 4, cap / 4)
```

第二个夹紧应用于实际持久化的值，因此在 `rateCap` 或 `rateFloor` 变化后，存储的 `rateAtTarget` 被限制在 `[rateFloor * 4, cap / 4]` — 不仅仅是协议范围内的 `MIN_RATE_AT_TARGET` / `MAX_RATE_AT_TARGET`。因子 4 是 `CURVE_STEEPNESS`，因此该限制以曲线端点的形式表达上限/下限。如果 `rateFloor * 4` 超过 `cap / 4`，则上限胜出。

返回给 Moolah 的经过时间间隔的平均利率通过梯形规则近似（使用开始、中间和结束的 `rateAtTarget`），因此报告的利率反映整个间隔而不仅仅是其端点。在市场的第一次交互中（`rateAtTarget == 0`），模型用 `INITIAL_RATE_AT_TARGET` 为平均和结束的目标利率播种。

结果的平均利率还受到每市场上限和下限（`rateCap`，`rateFloor`）以及协议范围内的最低上限（`minCap`）的限制；当没有设置明确的上限时，`DEFAULT_RATE_CAP` 适用。这些限制是链上可由管理者/机器人调整的值。

更改任一限制首先结算：`updateRateCap` 和 `updateRateFloor`（在两个 IRM 上，以及 `FixedRateIrm` 上的 `setBorrowRate`）在写入新值之前调用 `Moolah.accrueInterest` 为市场累积利息，因此在旧限制下累积的利息按旧限制记账。对于从未触及的市场（`lastUpdate == 0`），该调用是无操作的。

## 自适应曲线常量

这些常量被编译到 `ConstantsLib` 并内联，因此没有 getter 可以读取它们 — 更改一个需要合约升级。所有利率常量均为**每秒，WAD 缩放**；*意义*中的百分比是这些值按年表达的。

| 常量 | 链上值 | 意义 |
| --- | --- | --- |
| `CURVE_STEEPNESS` | `4 ether` (`4e18`) | 曲线陡度 `C = 4`。利率范围从 0% 利用率时的 `rateAtTarget / 4` 到 100% 时的 `rateAtTarget * 4`。|
| `TARGET_UTILIZATION` | `0.9 ether` (`0.9e18`) | 目标利用率 = 90%。|
| `ADJUSTMENT_SPEED` | `50 ether / 365 days` | 调整速度；`rateAtTarget` 以 `ADJUSTMENT_SPEED * err` 每秒移动（在完全误差时约为 50 / 年）。|
| `INITIAL_RATE_AT_TARGET` | `0.04 ether / 365 days` | 在第一次交互时的目标利率种子；在目标时相当于 4% 的年利率（利率在曲线上约为 1%–16%）。|
| `MIN_RATE_AT_TARGET` | `0.001 ether / 365 days` | `rateAtTarget` 的下限；在目标时为 0.1%（曲线最小值约为 0.025%）。|
| `MAX_RATE_AT_TARGET` | `2.0 ether / 365 days` | `rateAtTarget` 的上限；在目标时为 200%（曲线最大值约为 800%）。|
| `DEFAULT_RATE_CAP` | `uint256(0.3 ether) / 365 days` | 当市场没有明确的 `rateCap` 时，返回的借款利率的默认每秒上限（年化 30%）。|

## `borrowRateView` vs `borrowRate`

这两个入口点评估相同的自适应曲线数学，但在是否持久化更新的 `rateAtTarget` 上有所不同：

| | `borrowRateView` | `borrowRate` |
| --- | --- | --- |
| 可变性 | `view`（无状态变化） | 状态变化 |
| 调用者 | 任何人 | 仅限 `MOOLAH`（否则回滚） |
| 效果 | 计算当前 `market` 快照的平均利率而不写入 | 计算利率，写入 `rateAtTarget[id] = endRateAtTarget`，发出 `BorrowRateUpdate` |
| 用例 | 链下报价、模拟、前端 | 在 `supply` / `borrow` / `repay` / 等期间由 Moolah 调用以累积利息 |

因为 `borrowRate` 需要 `msg.sender == MOOLAH`，所以直接读取利率的集成者应调用 `borrowRateView`。它返回的值是给定 `market` 快照将应用的平均每秒利率；它不会推进 `rateAtTarget`。`borrowRateView` 使用存储的 `rateAtTarget` 和 `market.lastUpdate` 隐含的经过时间，因此其结果已经反映了尚未在链上提交的调整。

## 在链上读取当前利率

提供了两个互补的读取：

1. **锚定利率。** `rateAtTarget(Id id)` 返回市场的存储每秒目标利率（曲线的高度）。它在**市场创建交易**中被播种为 `INITIAL_RATE_AT_TARGET`，由市场的下限和上限夹紧 — `createMarket` 调用 `IIrm.borrowRate` 一次以初始化模型。因此，`0` 读取意味着该 IRM 从未被调用过：市场不存在，或使用了不同的 IRM。

   ```solidity
   int256 anchor = IInterestRateModel(irm).rateAtTarget(id);
   ```

2. **当前借款利率。** 从 Moolah 获取市场的实时 `MarketParams` 和 `Market` 结构，然后调用 `borrowRateView`：

   ```solidity
   uint256 ratePerSecond = IIrm(irm).borrowRateView(marketParams, market); // WAD 缩放
   ```

### 每秒 → 年化收益率转换

返回的利率是按 WAD 缩放的每秒利率。Moolah 通过连续（每秒泰勒复利）增长累积利息，因此借款年化收益率为：

```typescript
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60; // 31_536_000

// ratePerSecond 是 borrowRateView 返回的 WAD 缩放的 uint
const rateFloat = Number(ratePerSecond) / 1e18;
const borrowAPY = Math.expm1(rateFloat * SECONDS_PER_YEAR); // 例如 0.05 == 5%
```

供应年化收益率低于借款年化收益率，按利用率缩放并扣除市场费用；它不是由 IRM 返回的，必须从市场状态中推导。

## FixedRateIrm

对于不使用基于利用率曲线的产品，经纪人可以将市场指向 `FixedRateIrm`。它不是从利用率计算利率，而是返回已管理设置的每市场利率。

| 元素 | 签名 / 值 | 备注 |
| --- | --- | --- |
| `MAX_BORROW_RATE` | `8.0 ether / 365 days` | 可设置的最大每秒利率（年化 800%）。|
| `borrowRateStored(Id id)` | `int256` | 为市场存储的固定每秒利率。|
| `setBorrowRate(Id id, int256 newBorrowRate)` | — | 设置固定利率。访问控制（机器人角色）；必须 `>= 0` 且 `<= MAX_BORROW_RATE`，并在任何配置的 `rateCap` / `rateFloor` 范围内。首先结算在先前利率下累积的利息（见下文）。|
| `borrowRateView(...)` / `borrowRate(...)` | `uint256` | 两者都返回存储的利率（夹紧到 `MAX_BORROW_RATE`，然后到市场上限和下限）。与自适应模型不同，这里的 `borrowRate` 也是 `view`，不持有自适应状态。利率从未设置的市场具有 `borrowRateStored == 0`，因此这些返回 `0`（受任何配置的下限影响）而不是回滚。|

`0` 利率意味着没有利息累积，因此将未设置的市场视为未配置而不是免费。此 IRM 支持 [集成模式](integration-patterns.md) 中描述的固定期限/固定利率经纪产品。

## 相关

* [合约和接口参考](contract-reference.md) — `minLoan`，全局重入保护和其他 Lista 特定控制。
* [智能合约](smart-contract.md) — 部署的合约地址。