# 清算集成

要在 Lista Lending (Moolah) 上运行**第三方清算器**，您需要四个要素：调用哪个合约、如何限制资格、如何确定清算规模，以及抵押品如何返回给您。

在 Moolah 上的清算在*合约层面*是无权限的，但**每个市场都有门控**。外部清算器不是直接调用 `Moolah.liquidate`，而是通过**`PublicLiquidator`**，这是 Lista 自己的[清算区](https://lista.org/lending/liquidation)前端使用的合约。该页面是此处描述的所有内容的工作参考实现。

有关产品级别的清算说明，请参阅[清算](../../introduction/lista-lending/liquidation/README.md)；有关告诉您*清算什么*的数据馈送，请参阅[头寸、清算和发放 API](../services/lending-api/position-liquidation-emission.md)。有关低级核心功能，请参阅[合约和接口参考 § 清算](contract-reference.md)。

---

## 三个清算合约

Moolah 部署了三个清算合约。`PublicLiquidator` 是第三方集成接口。

| 合约 | 调用者 | 资金 | 用途 |
| --- | --- | --- | --- |
| **`PublicLiquidator`** | **任何人** — 无角色限制 | **您自己的资金**；您批准贷款代币并接收被扣押的抵押品 | **第三方清算器。这是要集成的合约。** |
| `Liquidator` | 仅限 `BOT` 角色 | 协议持有资金 | Lista 的内部维护者。外部方无法调用。 |
| `BrokerLiquidator` | 仅限 `BOT` 角色 | 协议持有资金 | 固定期限/经纪市场，健康状况核算在经纪人处。外部方无法调用。 |

部署地址：`Liquidator` 和 `PublicLiquidator` 的 [BSC Core](smart-contract-bsc-core.md)，`BrokerLiquidator` 的 [BSC Lending Brokers](smart-contract-bsc-brokers.md)，以及所有三个合约的 [Ethereum](smart-contract-ethereum.md)。

---

## 资格：您实际上可以清算哪些头寸

每个 `PublicLiquidator` 清算路径都运行相同的内部资格检查。在闪电路径上，它在对/智能提供者白名单检查*之后*运行，并且所有这些都会以相同的 `NotWhitelisted()` 选择器回滚，因此仅选择器无法告诉您哪个失败：

```solidity
function isLiquidatable(bytes32 id, address borrower) internal view returns (bool) {
  return
    IMoolah(MOOLAH).isLiquidationWhitelist(id, address(0)) ||  // 1. 便宜的探测 — 不是市场开放的证明；见下文
    marketWhitelist[id] ||                                      // 2. 市场在 PublicLiquidator 上开放
    marketUserWhitelist[id][borrower];                          // 3. 此头寸在 PublicLiquidator 上开放
}
```

如果满足以下**任何**三个条件，则头寸是可达的：

1. **市场在 Moolah 级别开放。** `Moolah._checkLiquidationWhiteList` 返回 `liquidationWhitelist[id].length() == 0 || contains(account)`，因此*空*的每市场白名单意味着市场对每个调用者开放。`isLiquidationWhitelist(id, address(0))` 是 `PublicLiquidator` 自己使用的便宜探测，但它**不**证明市场开放：它也会对一个恰好在其白名单中包含 `address(0)` 的门控市场返回 `true`，而 `batchToggleLiquidationWhitelist` 没有零地址保护来排除这种情况。在这种情况下，`PublicLiquidator` 通过自己的门槛，然后 Moolah 拒绝调用，因为 Moolah 检查的调用者是 `PublicLiquidator`，而不是 `address(0)`。

分别回答这两个问题——一个不意味着另一个：

* **市场对任何人开放吗？** `getLiquidationWhitelist(id).length == 0`。这是唯一的确定性测试。
* **`PublicLiquidator` 能够访问这个市场吗？** `isLiquidationWhitelist(id, <PublicLiquidator address>)`。

查询两者而不是假设——开放市场是常见情况，而不是普遍情况。

2. **市场已在 `PublicLiquidator` 上由 `BOT` 角色开放**（`marketWhitelist[id]`）。这就是在 Moolah 级别被门控的市场仍然可以通过公共路径路由的方式。
3. **此特定借款人已由 `BOT` 角色开放**（`marketUserWhitelist[id][borrower]`）。

> 在 Moolah 级别被门控的市场上，必须首先通过条件 2 或 3 使水下头寸浮出水面。门控*不是*健康检查：即使在头寸深度水下时，`isLiquidatable` 失败也会以 `NotWhitelisted()` 回滚。选择与门控匹配的馈送。`/api/liquidation/zone/list` 返回借款人**白名单**，因此它在*门控*市场上找到候选者，并且对于开放市场可能为空。对于开放市场，请使用[`/api/moolah/redPositions`](../services/lending-api/position-liquidation-emission.md)，它接受单个市场 `id` — 从 `/api/moolah/allMarkets` 枚举市场并展开。

`setMarketWhitelist` 和 `setMarketUserWhitelist` 都拒绝在 Moolah 级别已经开放的市场上运行，并且 `setMarketUserWhitelist` 还拒绝在市场已经在 `PublicLiquidator` 本身上开放时运行。这些是**仅在设置时检查的前提条件** — Moolah 级别的状态可以在之后更改（`MANAGER` 可以稍后清空 `liquidationWhitelist[id]`），因此不要假设这两种机制保持互斥。

成功清算后，如果头寸再次变得健康，`postLiquidate` 会将借款人从 `marketUserWhitelist` 中移除。部分清算使头寸保持水下状态，但请参阅下面的尺寸限制：并非每个部分尺寸都是允许的。

---

## 入口点

五个清算入口点。根据 (a) 您是否自带贷款代币资金或闪电交换抵押品，以及 (b) 抵押品是普通 ERC-20 还是**智能抵押品** LP 代币进行选择。

### 自筹资金

```solidity
function liquidate(bytes32 id, address borrower, uint256 seizedAssets, uint256 repaidShares) external;
```

主要路径。从您那里提取所需的贷款代币，调用 `Moolah.liquidate`，并将扣押的抵押品转移给您。`liquidateWithCollTransferOpt(..., doTransferColl: true)` 的薄包装。

```solidity
function liquidateWithCollTransferOpt(
  bytes32 id, address borrower, uint256 seizedAssets, uint256 repaidShares, bool doTransferColl
) public;
```

相同，但 `doTransferColl: false` 将扣押的抵押品留在 `PublicLiquidator` 内，记入您的 `lpCollaterals[msg.sender][collateralToken]`，稍后通过 `redeemSmartCollateral` 解开。**仅对智能抵押品 LP 代币传递 `false`** — 对于普通 ERC-20 抵押品，没有赎回路径，代币会被困在合约中。

```solidity
function liquidateSmartCollateral(
  bytes32 id, address borrower, address smartProvider,
  uint256 seizedAssets, uint256 repaidShares, bytes memory payload
) external returns (uint256, uint256);
```

返回 `(actualSeizedAssets, repaidAssets)`，两者均直接来自 `Moolah.liquidate`。自筹资金清算智能抵押品市场，在同一交易中赎回 LP。`smartProvider` 必须在 `smartProviders` 中注册，并且其 `TOKEN()` 必须等于市场的抵押品代币。`payload` 是 `abi.encode(minToken0Amt, minToken1Amt)` — 您对 LP 赎回的滑点限制。**在 `flashLiquidateSmartCollateral` 上，这些值具有双重作用：**对于代币为原生 BNB 的一条腿，合约将最小金额作为交换调用的确切 `msg.value` 转发。在那里设置保守的底线会导致交换资金不足，而不是保护您，因此对于原生 BNB 的一条腿，该值必须是您打算发送的金额。两个底层代币都直接发送给您（原生 BNB 作为值传输，而不是包装）。

### 闪电交换（无需贷款代币资金）

```solidity
function flashLiquidate(
  bytes32 id, address borrower, uint256 seizedAssets, address pair, bytes calldata swapCollateralData
) external;
```

使用 Moolah 的 `onMoolahLiquidate` 回调在偿还被提取*之前*将扣押的抵押品交换为贷款代币，因此您不需要贷款代币余额 — 只需足够的 gas。`swapCollateralData` 是针对 `pair` 的低级调用的原始 calldata；从聚合器（1inch 等）获取它**并已应用滑点**。您的利润是贷款代币盈余，在最后转移给您。

> **交换必须支付给 `PublicLiquidator`，而不是您。** 回调在交换前后测量合约自己的贷款代币余额，并从该余额中批准 Moolah。使用您自己的地址作为接收者构建的聚合器 calldata 将使合约无法偿还，交易将回滚。在**每个**腿上将接收者设置为 `PublicLiquidator` 地址 — 对于智能抵押品变体，两个代币腿都要设置。

```solidity
function flashLiquidateSmartCollateral(
  bytes32 id, address borrower, address smartProvider, uint256 seizedAssets,
  address token0Pair, address token1Pair,
  bytes calldata swapToken0Data, bytes calldata swapToken1Data, bytes memory payload
) external returns (uint256, uint256);
```

智能抵押品变体：在回调中赎回 LP，然后将每条腿交换为贷款代币。任何剩余的底层代币都会返回给您。返回 `(actualSeizedAssets, repayAmount)` — 注意这里的第二个值是本地预先计算的 `loanTokenAmountNeed`，而不是 `liquidateSmartCollateral` 中的 Moolah 返回的偿还金额。

> **每个对都必须在白名单中。** 两个闪电路径都需要 `pairWhitelist[pair]`，只有 `MANAGER` 角色可以设置。在 `flashLiquidateSmartCollateral` 上，**两个** `token0Pair` 和 `token1Pair` 必须无条件地在白名单中 — 包括从未实际交换的腿，例如当该代币已经是贷款代币时 — 任意 DEX 路由器将以 `NotWhitelisted()` 回滚。在构建路由之前读取 `pairWhitelist(address)`。自筹资金路径没有这样的限制，因此如果您想要的场所不在白名单中，请使用 `liquidate` 并在之后自行交换。

### 解开延期抵押品

```solidity
function redeemSmartCollateral(
  address smartProvider, uint256 lpAmount, uint256 minToken0Amt, uint256 minToken1Amt
) external returns (uint256, uint256);
```

返回 `(token0Amount, token1Amount)`。

赎回您先前通过 `doTransferColl: false` 累积的 LP 抵押品。如果 `lpAmount` 超过您的跟踪余额，则以 `"insufficient lp collateral"` 回滚。

---

## 确定清算规模

**`seizedAssets` / `repaidShares` 中必须有且仅有一个非零。** 另一个是派生的：

* **`seizedAssets > 0`** — “购买这么多抵押品。” 所需的偿还金额是根据预言机价格和清算激励因子计算的。
* **`repaidShares > 0`** — “关闭这么多债务。” 传递借款人的完整 `borrowShares` 以完全关闭头寸。清算区前端使用此分支进行完全关闭，并使用 `seizedAssets` 分支进行部分购买。只有在扣押的结果不超过借款人的剩余抵押品时才会成功 — `Moolah.liquidate` 执行 `position.collateral -= seizedAssets`，在深度水下头寸上会下溢并回滚。在这种情况下按 `seizedAssets` 确定大小。

激励因子与 Moolah 核心中的公式相同：

```
liquidationIncentiveFactor = min(
  MAX_LIQUIDATION_INCENTIVE_FACTOR,          // 1.15e18
  WAD / (WAD - LIQUIDATION_CURSOR * (WAD - lltv))   // LIQUIDATION_CURSOR = 0.3e18
)
```

对于标准（非经纪）市场，`PublicLiquidator` 提供一个公共视图，重现 Moolah 的清算规模：

```solidity
function loanTokenAmountNeed(bytes32 id, uint256 seizedAssets, uint256 repaidShares)
  public view returns (uint256);
```

**在调用自筹资金路径之前，至少批准此金额的贷款代币给 `PublicLiquidator`。** 任何未使用的贷款代币都会在同一交易中退还。因此，报价金额涵盖预期的偿还；在报价可能在执行前更改的情况下可能需要一个小缓冲。

> **不要在经纪市场上使用此报价。** `loanTokenAmountNeed` 使用 `Moolah.getPrice(marketParams)` 为抵押品定价，这是普通市场价格（`user = address(0)`）。`Moolah.liquidate` 代替使用 `_getPrice(marketParams, borrower)` 定价，在有经纪人的市场上会路由到经纪人，并可能根据借款人的头寸偏离市场价格。经纪人的抵押品价格是市场价格减去扣除，因此它永远不会更高 — 因此报价**高估**了偿还金额。`PublicLiquidator` 提取较大的金额并在同一交易中退还盈余，因此调用成功，但您必须持有膨胀的数字才能实现。在经纪市场上，从经纪人自己的定价中推导偿还金额 — `peek(token, user)` 和 `getUserTotalDebt(user)`，请参阅[经纪人参考](broker-reference.md)。

确定*部分*清算的规模还有一个限制：

**低于 `minLoan` 的剩余部分必须是健康的。** 偿还后，Moolah 要求 `_isHealthyAfterLiquidate`：如果借款人仍然有债务和抵押品，并且剩余的借款资产**低于**`minLoan(marketParams)`，则头寸必须是健康的，否则整个交易将以 Moolah 的 `"position is unhealthy"` 回滚（请参阅下面的回滚表）。因此，您不能留下一个小的不健康的尘埃头寸：要么将清算规模恢复健康，要么保持剩余部分在或高于 `minLoan`，要么完全清除债务或抵押品。

在市场的利息已经累积之后调用它，或者接受报价漂移：每个入口点在计算金额之前调用 `Moolah.accrueInterest(params)`，并且 `accrueInterest` 是无权限的，因此最好通过模拟当前状态获得新报价，而不是读取先前区块缓存的值。

---

## 回滚

| 错误 | 原因 |
| --- | --- |
| `NotWhitelisted()` | `isLiquidatable` 失败（头寸未向公共路径开放），或 `pair` / `smartProvider` 未在白名单中。这个选择器涵盖了**资格和白名单失败** — 分别检查 `isLiquidationWhitelist` / `marketWhitelist` / `marketUserWhitelist` 和 `pairWhitelist` 以区分它们。 |
| `NoProfit()` | 自筹资金路径：合约的抵押品余额没有严格增加。闪电路径：交换输出没有**超过**偿还金额 — 精确持平也会回滚，因为需要严格正的贷款代币盈余。扩大滑点，减少 `seizedAssets`，或选择更深的场所。 |
| `SwapFailed()` | 对 `pair` 的低级调用回滚。过时的聚合器 calldata 是常见原因。 |
| `"Invalid smart provider"` | `ISmartProvider(smartProvider).TOKEN() != marketParams.collateralToken`。 |
| Moolah `"position is healthy"` | 头寸在您的交易到达时是健康的 — 例如，因为有人偿还或价格变动。立即在提交前重新检查，并预期执行竞争。 |
| Moolah `"inconsistent input"` | `exactlyOneZero(seizedAssets, repaidShares)` 失败。注意闪电路径硬编码 `repaidShares = 0`，因此调用一个 `seizedAssets = 0` 的会在此回滚。 |
| Moolah `"position is unhealthy"` | 剩余头寸留下债务和抵押品，借款资产低于 `minLoan`，并且仍然不健康。以不同方式确定清算规模 — 见上文。 |
| Moolah `"not liquidation whitelist"` | `PublicLiquidator` 本身不在市场的 Moolah 级别白名单中。可以在市场在 `marketWhitelist[id]` 设置后被门控时浮现。 |

四个入口点直接携带 `nonReentrant`；`liquidate` 通过委托给 `liquidateWithCollTransferOpt` 继承它，后者是 `public nonReentrant`。`redeemSmartCollateral` 也是 `nonReentrant`。

---

## 事件

`PublicLiquidator` 发出 `Liquidated(id, borrower, seizedAssets, repaidAssets, repaidShares, liquidator)` — `id` 和 `borrower` 被索引 — 除了 Moolah 自己的 `Liquidate` 事件（见[事件和回调](events-and-callbacks.md)）。在这个事件上索引以专门将清算归因于公共路径 — 但从 Moolah 的 `Liquidate` 中读取**结算**金额：此处的字段回显调用者的*输入*，因此在两个闪电路径和任何 `seizedAssets > 0` 调用上 `repaidShares` 为 `0`，即使 Moolah 燃烧了非零的份额数量，并且 `seizedAssets` 同样是请求的数字而不是 Moolah 返回的值。`repaidAssets` 是 `PublicLiquidator` 自己的 `loanTokenAmountNeed` 报价，按普通市场价格定价，因此在经纪市场上它与 Moolah 实际结算的金额不同。结算的清算也由[`/api/liquidation/zone/history`](../services/lending-api/position-liquidation-emission.md) 提供。

---

## 参考流程

1. **轮询候选者。** `GET /api/liquidation/zone/list` 用于白名单/标记的头寸，或 `GET /api/liquidation/zone/closeToLiquidate` 用于接近阈值的头寸（安全因子 `< 1.5`）。[Moolah 可清算端点](../services/lending-api/position-liquidation-emission.md) 返回 `borrowShares`、`totalBorrowAssets` 和 `totalBorrowShares`，以便您可以从份额重新计算确切的当前债务。
2. **链上重新验证。** API 数据是索引的，可能会滞后。按照资格部分描述的方式确认可达性 — 对于开放市场，`getLiquidationWhitelist(id).length == 0`，或对于门控市场，`isLiquidationWhitelist(id, <PublicLiquidator>)` 加上 `marketWhitelist(id)` / `marketUserWhitelist(id, borrower)` — 并且头寸在实时预言机价格下仍然不健康 — Moolah 在执行时重新检查健康状况，否则将回滚。
3. **确定规模。** 选择 `seizedAssets` 或 `repaidShares`，然后调用 `loanTokenAmountNeed` 进行偿还。
4. **批准** 该金额的贷款代币给 `PublicLiquidator`（仅限自筹资金路径）。
5. **执行。** `liquidate` 用于普通抵押品；`liquidateSmartCollateral` 用于智能抵押品；如果您不想持有贷款代币并且场所已在白名单中，则使用 `flash*` 变体。
6. **结算。** 扣押的抵押品在同一交易中到达，除非您传递了 `doTransferColl: false`，在这种情况下稍后通过 `redeemSmartCollateral` 解开。