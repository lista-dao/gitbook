# 集成模式

Moolah 支持两种外部集成模式。它们在借贷堆栈的不同层次上运行。

## 我应该调用哪个接口？

市场可以在任一侧进行限制。在构建之前探测两者——受限市场会拒绝直接调用：

```solidity
MOOLAH.providers(id, marketParams.collateralToken);  // 非零 -> 抵押品必须通过它路由
MOOLAH.brokers(id);                                  // 非零 -> 借款/还款必须通过它路由
```

| 您的情况 | 调用 | 参考 |
| --- | --- | --- |
| 普通 ERC-20 抵押品，浮动利率 | 直接调用 Moolah | [合约和接口参考](contract-reference.md) |
| `slisBNB` 抵押品 | `SlisBNBProvider` | [提供者](providers.md) |
| 将原生 BNB 存入 WBNB 金库 | `BNBProvider` | [提供者](providers.md) |
| StableSwap LP 抵押品 | `SmartProvider` | [智能借贷和 StableSwap](stableswap-integration.md) |
| 固定期限借款 | 市场的 `LendingBroker` | [经纪人参考](broker-reference.md) |
| 未抵押信用 | `CreditBroker` | [贷款生命周期](../credit-loans/loan-lifecycle.md) |
| 存款以赚取收益，而非借款 | ERC-4626 金库 | [金库参考](vault-reference.md) |
| 将浮动头寸转为固定期限 | `PositionManager` | [头寸转换](position-conversion.md) |
| 清算他人的头寸 | `PublicLiquidator` | [清算人集成](liquidator-integration.md) |

| 模式 | 目的 | 典型用法 |
| --- | --- | --- |
| 提供者 | 处理抵押品存取流、资产转换和可选的 `slisBNBx` 铸造/销毁回调。 | `slisBNB` 抵押品，Lista StableSwap LP 抵押品，WBNB 金库集成，部分信用流 |
| 经纪人 | 管理对一个或多个市场的访问，并处理贷款发起逻辑。 | 固定期限/利率借贷产品，信用贷款 |

## 提供者集成

提供者位于用户和 Moolah 核心之间，针对特定的抵押品类型。用户不直接调用 Moolah，而是调用提供者合约，这些合约规范化资产并将抵押品路由到目标市场。

| 提供者 | 抵押品类型 | `slisBNBx` 铸造 |
| --- | --- | --- |
| `SlisBNBProvider` | `slisBNB` 流动质押代币 | 是 |
| `SmartProvider` | Lista StableSwap LP 代币 | 仅限 slisBNB/BNB 实例 |
| `BNBProvider` | 原生 BNB 包装为 WBNB | 否 |
| `CreditBroker` | Lista 信用代币 | 否 |

> `CreditBroker` 在**两个**表中都有出现：在信用市场中，它被注册为抵押品提供者*和*经纪人。`Moolah.providers(id, creditToken)` 和 `Moolah.brokers(id)` 都返回相同的地址，因此它同时限制抵押品移动和借款/还款发起。它是唯一在两个角色中注册的合约。

## 经纪人集成

经纪人是为精选产品提供贷款发起层。与提供者不同，经纪人专注于条款、利率和借款人资格，然后将调用路由到 Moolah。

经纪人市场是基于 `FixedRateIrm` 创建的，而不是自适应曲线，Moolah 级别的利率保持为零——借款人支付的是经纪人自己的固定期限利率。此类市场上的 `borrowRateView` 返回 `0`（受任何配置的底限影响），因此请从经纪人的 `getFixedTerms()` 中读取利率——参见 [IRM](irm.md) 了解何时 `FixedRateIrm` 市场确实携带 Moolah 级别的利率。

| 经纪人类型 | 产品 | 关键差异 |
| --- | --- | --- |
| 借贷经纪人 | Lista 固定期限和固定利率市场 | 使用 `FixedRateIrm` 而非基于利用率的自适应曲线 |
| 信用经纪人 | Lista 信用贷款 | 支持未抵押借款，具有信用额度限制 |