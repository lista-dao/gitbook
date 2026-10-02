# 机制

抵押债务头寸（CDP）模块允许用户存入抵押品并以此铸造**lisUSD**。这是一个类似于MakerDAO/Helio的分叉：`Vat`、`Jug`、`Spotter`、`Dog`、`Clipper`、`Abacus`和`Vow`在**Interaction**入口点后面。

> ## 此产品正在逐步关闭
>
> **请勿针对其构建新的集成。** 请使用[Lista Lending](../lista-lending/README.md)——这是一个正在积极开发的借贷产品，并且有完整的[集成指南](../lista-lending/integration-patterns.md)、[合约参考](../lista-lending/contract-reference.md)和[SDK](../sdk.md)。
>
> CDP的大部分用户界面已经关闭。在假设之前，请验证以下每一项是否仍然有效：
>
> | 检查 | 当前值 | 影响 |
> | --- | --- | --- |
> | `Vat.Line()` | `0` | **所有新的借款将被拒绝** `Vat/ceiling-exceeded`，协议范围内，无论每个抵押品的`line`如何。 |
> | `Interaction.whitelistMode()` | `1` | 存款被列入白名单。限制在**参与者**，而不是调用者，因此集成者不能为未列入白名单的用户存款。 |
> | `Interaction.auctionWhitelistMode()` | `1` | 启动、购买和重置拍卖仅限于`Interaction.auctionWhitelist`。此分叉在`Clipper.take`/`redo`中添加了`auth`，因此与上游MakerDAO不同，没有开放的keeper或买家角色。 |
>
> 仍然有效的操作：偿还、提取抵押品，以及剩余头寸的清算。

## 清算现有头寸

| 调用 | 目的 |
| --- | --- |
| `Interaction.locked(token, usr)` | 存入的抵押品（`ink`）。 |
| `Interaction.borrowed(token, usr)` | 当前的lisUSD债务（`art * rate / RAY`）。当债务非零时，这会增加一个固定的100-wei缓冲，以便偿还可以完全清除头寸——偿还它返回的值，而不是您自己的计算。 |
| `Interaction.payback(token, amount)` | 偿还lisUSD。通过`HayJoin`燃烧并减少`art`。 |
| `Interaction.withdraw(participant, token, dink)` | 提取抵押品，前提是头寸保持安全。注意**三个**参数，第一个是`participant`——没有两个参数的形式。当抵押品没有提供者时，`msg.sender`必须等于`participant`；当有提供者时（例如slisBNB），提取必须通过该提供者进行，以便证书代币被解包——除非`MANAGER`为该抵押品启用了`providerCompatibilityMode[token]`，这还允许`participant`直接调用。请阅读映射而不是假设；目前slisBNB的值为`false`。|

当`ink * spot >= art * rate`时，头寸是安全的。`spot`已经应用了清算比率，因此它低于原始预言机价格。

利息累积到Vat的每个抵押品的利率累加器中，并在偿还时以lisUSD实现——借款时不收取任何费用。利率由lisUSD价格的`DynamicDutyCalculator` AMO设置。**Jug**将`base + duty`复利，Vat仅将结果增量折入其累加器，因此请阅读`Jug.base()`和计算器自己的视图，而不是将任何单一值视为利率。`Interaction.borrowApr(token)`返回具有**20个小数位**的组合数字——即一个*百分比*，以`1e18`为比例，因此`4035532478367910700`是4.0355%；除以`1e20`得到一个分数。尽管名称如此，它将每秒利率提高到一年的秒数，因此它是一个复利年利率（APY）。

对于开放给第三方的清算界面，请参阅Lista Lending上的[Liquidator Integration](../lista-lending/liquidator-integration.md)。引擎的内部结构（`Vat`、`Jug`、`Spotter`、`Dog`、`Clipper`、`Abacus`、`Vow`）的行为与它们从中分叉的MakerDAO设计相同——请使用MakerDAO文档，并参阅[Smart Contract](smart-contract.md)以获取已部署地址。

## 模块如何工作

这些流程与原始设计没有变化，并且是剩余头寸仍在运行的流程。每个步骤都命名了执行它的合约。

### 存入抵押品

<figure><img src="../../.gitbook/assets/image (41).png" alt=""><figcaption></figcaption></figure>

1. 用户将抵押品转移到**Interaction**合约。
2. **Interaction**将其转移到**GemJoin**，后者保管它。
3. **Vat**——核心CDP引擎——记录用户的抵押品。

### 借入lisUSD

<figure><img src="../../.gitbook/assets/image (40).png" alt=""><figcaption></figcaption></figure>

1. 用户在**Interaction**上调用`borrow()`。
2. **Vat**记录该抵押品的债务增加。
3. **HayJoin**铸造lisUSD并将其发送给用户。
4. **Interaction**在**ListaDistributor**上快照头寸以进行奖励计算。

此处不收取利息——它在Vat中累积，并在偿还时实现。

### 偿还lisUSD

<figure><img src="../../.gitbook/assets/image (39).png" alt=""><figcaption></figcaption></figure>

1. 用户指定要偿还的抵押品金额。
2. **Vat**减少记录的债务；全额偿还关闭头寸。
3. **HayJoin**燃烧lisUSD。
4. **Interaction**在**ListaDistributor**上快照新的余额。

### 提取抵押品

<figure><img src="../../.gitbook/assets/image (35).png" alt=""><figcaption></figcaption></figure>

1. 用户指定要提取的金额。
2. **Interaction**检查头寸是否保持安全——在有未偿债务的情况下，只有部分存款可以提取。
3. **GemJoin**将抵押品转回。
4. **Vat**记录抵押品离开系统。

### 清算

<figure><img src="../../.gitbook/assets/image (5) (1) (1).png" alt=""><figcaption></figcaption></figure>

> **此分叉中的拍卖买方是有权限的。** `Clipper.take`和`Clipper.redo`携带`auth`，`Interaction.buyFromAuction`被列入白名单，因此与上游MakerDAO不同，第三方不能启动、竞标或重启拍卖。下面的示例解释了机制；这不是集成路径。对于开放给第三方的清算界面，请参阅[Liquidator Integration](../lista-lending/liquidator-integration.md)。

一旦抵押品价值在应用抵押比率后低于债务，头寸就变得可清算：

* 抵押品价格$2，抵押比率66% → 有效单价`2 × 0.66 = $1.32`
* 存入10单位（`$20`），借款限额`20 × 0.66 = $13.2`，借入`13.2 lisUSD`
* 价格降至`$1.80` → 有效单价`1.8 × 0.66 = $1.188`，头寸价值`1.188 × 10 = $11.88`
* `13.2 − 11.88 = $1.32`——短缺使其可清算

拍卖然后从这些数字准备：

* 所有10单位的抵押品进入荷兰拍卖
* 清算罚金（治理设置）：债务的13% → 覆盖`13.2 × 1.13 = $14.916`
* 缓冲（治理设置）：2% → 起始价格`1.8 × 1.02 = $1.836`

<figure><img src="../../.gitbook/assets/image (7) (1) (1).png" alt=""><figcaption></figcaption></figure>

然后价格随时间下降——在3600秒窗口的600秒时，`1.836 × ((3600 − 600) / 3600) = $1.53`。拍卖在达到治理设置的任一界限时暂停：**tail**（经过时间）或**cusp**（剩余起始价格的份额）。暂停的拍卖必须重启，重启者获得一个固定的**tip**加上一个动态的**chip**。请从`Clipper`读取抵押品的实时值，而不是假设它们。

## lisUSD质押

**Jar**（`jar.sol`）已弃用。活跃的lisUSD储蓄率产品是**LisUSDPoolSet** / **EarnPool**堆栈——请参阅[Stable Pool (PSM)](../../introduction/collateral-debt-position-lisusd/lisusd/stable-pool-price-stability-module-psm.md)和[lisUSD Saving Rate (LSR)](../../introduction/collateral-debt-position-lisusd/lisusd/lisusd-saving-rate-lsr.md)。该层与上述CDP借贷引擎分开，并未与其一起关闭。

## 另请参阅

- [Flash Loan](flash-loan.md) — lisUSD的ERC-3156闪电铸造。