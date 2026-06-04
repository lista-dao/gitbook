# 协议扩展

Moolah 扩展了 Morpho Blue，增加了为生产风险管理和产品灵活性设计的协议级控制。

## 最小贷款限制 (`minLoan`)

每个市场可以强制执行最小借款金额。

* 导致债务低于 `minLoan` 的借款交易将被回滚。
* 部分还款交易，如果剩余债务低于 `minLoan` 也将被回滚。

这避免了难以清算且可能增加坏账风险的微小债务位置。

## 重入保护

状态改变路径应用 `nonReentrant` 防护，包括：

* `supply()`
* `borrow()`
* `repay()`
* `withdrawCollateral()`
* `liquidate()`

## 可升级性

Moolah 被部署为一个可升级系统。

* 升级权限由 `DEFAULT_ADMIN_ROLE` 控制。
* 执行由 TimeLock 延迟。
* TimeLock 提供一天的审查窗口，在升级生效前。

## Oracle 架构

Moolah oracle 提供一个带有 8 位小数价格规模 (`1e8`) 的 `peek()` 接口。

### 弹性 Oracle

关于弹性/多源 Oracle 设计，请参见：

* [多 Oracle](../multi-oracle.md)

### PT 线性折扣 Oracle

PT 代币使用基于到期前底层资产价格的线性折扣模型。

* 典型用例：基于 PT 的抵押市场，如 `PT-USDe / USD1`
* 折扣公式：

```text
discount = baseDiscount x (timeToMaturity / totalDuration)
```

到期时，折扣归零，oracle 返回完整的底层价格。