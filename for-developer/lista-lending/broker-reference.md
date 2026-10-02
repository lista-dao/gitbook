# Broker Reference (LendingBroker)

每个市场注册一个**broker**，在存在的情况下，控制发起：只有broker可以在该市场上调用`borrow`或`repay`。因此，在broker市场上，broker就是借贷界面——直接调用Moolah会回退。

Brokers是在Moolah的可变利率市场之上添加**固定期限、固定利率**借贷的机制。已部署的broker市场及其LLTV、上限和市场ID在[BSC Lending Brokers](smart-contract-bsc-brokers.md)中。

检查市场是否由broker控制：

```solidity
function brokers(Id id) external view returns (address);
```

> Lista Credit使用不同的broker，`CreditBroker`，其上有信用评分门槛。它有自己的页面：[Loan Lifecycle](../credit-loans/loan-lifecycle.md)。

---

## 条款

broker提供一组固定条款。在借款之前阅读它们——`termId`是您传递以打开固定头寸的参数：

```solidity
struct FixedTermAndRate {
  uint256 termId;
  uint256 duration;   // 秒
  uint256 apr;
}
// IBroker.sol。CreditBroker声明了一个具有相同名称的不同结构体，
// 其中有第四个字段，`FixedTermType termType`——用一个的ABI解码另一个会误读元组。参见Credit Loan Lifecycle。

function getFixedTerms() external view returns (FixedTermAndRate[] memory);
```

`apr`按**`1e27 + rate`**进行RAY缩放，而不是利率本身。除以`1e27`并减去1以获得年度数字：`1036821445287206735200000000`是**3.68%**，而不是103.68%。`apr`在或低于`1e27`的条款不产生任何收益。

在`LendingBroker`条款中，利息按**每秒线性**累积在未偿还本金上，并在头寸的`end`处停止——不会提前收取。（`CreditBroker`条款包含一个`termType`，其两种模式之一是提前收取——参见[Credit Loan Lifecycle](../credit-loans/loan-lifecycle.md)。）在`end`之前偿还会增加提前偿还罚金，大约是剩余期限内本金利息的一半，这就是收回未实现期限利息的方式。

## 首先提供抵押品

broker仅控制**发起**。抵押品直接进入底层Moolah市场：

```solidity
MOOLAH.supplyCollateral(marketParams, assets, onBehalf, "");   // 批准Moolah使用抵押代币
```

broker表提供市场**id**，而不是`MarketParams`——首先用`MOOLAH.idToMarketParams(id)`读取结构体。如果该市场的抵押代币由提供者控制（`MOOLAH.providers(id, collateralToken)`非零），则通过该提供者路由抵押品；参见[Providers](providers.md)。

## 借款

```solidity
function borrow(uint256 amount) external;                  // 可变利率（“动态”）头寸
function borrow(uint256 amount, uint256 termId) external;  // 固定期限头寸
```

这两种借款都是针对**`msg.sender`的**头寸，并将贷款代币发送给调用者——**解包为原生BNB**，如果broker支持的话。第三种重载在他人名义下借款：

```solidity
function borrow(uint256 amount, uint256 termId, address user, address receiver) external;
```

它在`user`上打开头寸并支付给`receiver`，需要`MOOLAH.isAuthorized(user, msg.sender)`——这是`PositionManager`使用的路径。与上述两种不同，**此重载始终以ERC-20支付，从不使用原生代币**，并在`receiver`为零时回退`ZeroAddress()`。所有三种方法都是`nonReentrant`，需要设置市场ID，并在金额为零时回退`ZeroAmount()`。它们还可以通过两种独立方式暂停——全局暂停和借款特定暂停——因此broker可以在保持偿还开放的同时停止新借款。

## 偿还

```solidity
function repay(uint256 amount, address onBehalf) external payable;                 // 可变头寸
function repay(uint256 amount, uint256 posId, address onBehalf) external payable;  // 一个固定头寸
function repayAll(address onBehalf) external payable;                              // 所有
```

**批准broker**，而不是Moolah：在ERC-20市场上，broker通过`transferFrom`从调用者处提取贷款代币。所有三种方法都是`payable`，因此可以通过发送价值来偿还原生BNB市场——broker为您包装并退还多余部分。`repayAll`提取本金、应计利息**以及每个未结固定头寸的全部提前偿还罚金**。`getUserTotalDebt(onBehalf)`**不**包括该罚金，因此在持有未到期固定头寸的任何借款人处，按其大小设置的许可会回退——这是正常情况。将`previewRepayFixedLoanPosition`在开放头寸上求和，或在`getUserTotalDebt`之上允许一个缓冲。固定头寸形式需要来自用户头寸的`posId`（如下）。

在发送部分偿还之前预览其结算内容：

```solidity
function previewRepayFixedLoanPosition(address user, uint256 amount, uint256 posId)
  external view returns (uint256 interestRepaid, uint256 penalty, uint256 principalRepaid);
```

注意三方分割：首先是利息，可能适用罚金，只有剩余部分减少本金。

### 在一个broker内转换可变头寸

```solidity
function convertDynamicToFixed(uint256 amount, uint256 termId) external;
```

将您在此broker上的部分可变（“动态”）头寸移动到其固定条款之一。它仅作用于`msg.sender`——无需授权，无需闪电贷。要从普通Moolah市场跨入broker控制的市场，请改用[`PositionManager`](position-conversion.md)。

## 读取头寸

```solidity
function userFixedPositions(address user) external view returns (FixedLoanPosition[] memory);
function userDynamicPosition(address user) external view returns (DynamicLoanPosition memory);
function getUserTotalDebt(address user) external view returns (uint256 totalDebt);
```

`getUserTotalDebt`是**借款人**在其固定和可变头寸中的总额，按broker的当前利率定价——不是市场范围的数字。

## 定价及其对清算的重要性

```solidity
function peek(address token, address user) external view returns (uint256 price);
```

在broker市场上，健康状况的计算方式与其他地方不同。`Moolah._isHealthy`按**普通市场价格**对抵押品定价，但用broker的债务数字代替借款人的Moolah份额。每个用户的`peek`价格决定了清算运行时的扣押数学。

这就是为什么[Liquidator Integration](liquidator-integration.md)警告`PublicLiquidator.loanTokenAmountNeed`在broker市场上报价过高：该助手按`Moolah.getPrice(marketParams)`定价，这是市场价格，`user = address(0)`，而清算本身按借款人定价。使用broker自己的`peek(token, user)`和`getUserTotalDebt(user)`来确定broker市场的清算规模。

---

## 另见

- [Integration Patterns](integration-patterns.md)——提供者和broker如何组合。