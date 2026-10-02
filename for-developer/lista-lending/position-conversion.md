# 头寸转换

在 Moolah 市场上拥有可变利率头寸的借款人可以将其转移到**固定期限**市场，而无需自行解除头寸。`PositionManager` 可以原子地完成此操作：它从 Moolah 闪电贷借入贷款代币，偿还可变债务，移动抵押品，并在固定期限内重新借入相同金额——所有操作在一次调用中完成。

在提供转换之前，请检查两个可能导致调用失败的条件：Moolah 必须有足够的 `borrowAmount` 贷款代币用于闪电贷，并且它不能处于全局暂停状态。

部署地址在 [BSC Core](smart-contract-bsc-core.md) 和 [Ethereum](smart-contract-ethereum.md) 上。

> **没有借款人可调用的反向路径。** 到期的固定头寸通过机器人角色调用 `refinanceMaturedFixedPositions` 折回到经纪人的可变（“动态”）头寸中——您无法触发它。要提前离开固定期限，请通过其经纪人偿还固定头寸。请参阅 [Broker Reference](broker-reference.md) 了解偿还界面。
>
> **首先检查较轻的路径。** 如果您只想将*您在经纪人处已持有的可变债务*转移到该经纪人的固定期限之一，`LendingBroker.convertDynamicToFixed(amount, termId)` 可以在一个市场内完成——无需 `PositionManager`，无需授权，无需闪电贷。`PositionManager` 用于从普通的 Moolah 市场跨越到不同的、由经纪人控制的市场。

---

## 调用

```solidity
function migrateCommonMarketToFixedTermMarket(
  MarketParams calldata outMarket,
  MarketParams calldata inMarket,
  uint256 collateralAmount,
  uint256 borrowAmount,
  uint256 borrowShares,
  uint256 termId
) external;
```

`outMarket` 是您要离开的可变市场，`inMarket` 是您要进入的固定期限市场。

## 前提条件：授权 PositionManager

管理器代表您移动头寸，因此必须告知 Moolah 允许它。这是 [Contract & Interface Reference](contract-reference.md) 中描述的标准授权标志：

```solidity
// 1. 检查
MOOLAH.isAuthorized(user, positionManager);   // bool

// 2. 如果为 false，用户自行签署
MOOLAH.setAuthorization(positionManager, true);
```

否则调用将失败并返回 `not-authorized`。

## 尺寸调整

`borrowAmount` / `borrowShares` 中必须有且仅有一个为零——合约强制执行 `exactlyOneZero`，否则将失败并返回 `exactly-one-of-borrowAmount-or-borrowShares`。传递头寸的完整 `borrowShares` 以移动整个债务；使用 `borrowAmount` 移动特定资产数额。

`collateralAmount` 必须为非零（`zero-collateral-amount`）。

## 必须匹配的内容

两个市场必须共享相同的对：

| 检查 | 失败 |
| --- | --- |
| `outMarket.loanToken == inMarket.loanToken` | `loan-token-mismatch` |
| `outMarket.collateralToken == inMarket.collateralToken` | `collateral-token-mismatch` |
| `inMarket.lltv >= outMarket.lltv` | `in-market-lltv-too-low` |
| `inMarket` 有注册的经纪人 | `no-broker-for-market` |

因此转换保持在一个资产对内——它改变的是利率模型，而不是风险敞口。

经纪人市场运行着广泛的 LLTV 差距，因此从高 LLTV 可变市场迁移到低 LLTV 固定市场将失败。在提供转换之前，请比较两个 [市场行](smart-contract-bsc-brokers.md) 上的 `lltv`。

## 找到目标市场和期限

您必须自己提供这两个参数——调用无法推导出任何一个：

- **`inMarket`** — 与您的可变市场配对的固定期限市场。经纪人市场及其市场 ID 列在 [BSC Lending Brokers](smart-contract-bsc-brokers.md) 上；匹配相同的贷款和抵押代币。
- **`termId`** — 阅读目标经纪人的 `getFixedTerms()`，它返回每个提供的期限的 `{ termId, duration, apr }`。请参阅 [Broker Reference](broker-reference.md)。

---

## 参考流程

1. 阅读用户在 `outMarket` 上的头寸——`collateral` 和 `borrowShares`。
2. 选择具有相同对的固定期限市场，以及其经纪人的 `getFixedTerms()` 中的 `termId`。
3. `MOOLAH.isAuthorized(user, positionManager)`；如果为 false，请让用户调用 `setAuthorization(positionManager, true)`。
4. 使用抵押金额和借款金额或借款份额中的**一个**调用 `migrateCommonMarketToFixedTermMarket`。

转换后，债务存在于经纪人处，因此通过 `getUserTotalDebt(user)` 读取，并通过经纪人而不是 Moolah 偿还。

---

## 另见

- [Moolah Lending SDK](../sdk.md) — 此流程没有 SDK 构建器；直接组装调用。