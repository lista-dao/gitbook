# 贷款清算

清算机制的应用是为了确保池中的 <mark style="color:blue;">Lista -> Lista lisBNB -> slisBNB lisUSD -> lisUSD</mark> 完全由BNB抵押品支持。

当抵押品的当前价值（包含安全边际）低于借入的**lisUSD**金额时，借入的**lisUSD**可能会被清算，并通过荷兰式拍卖出售以偿还债务。

启动清算过程的清算人将获得燃气费用补偿作为奖励，这为任何 Lista 用户提供了参与的机会，包括借款人本人。此外，任何重新启动荷兰式拍卖的参与者也将获得同样的奖励。

债务由 Lista 吸收，而出售的抵押品收益将分配给参与拍卖的清算人。如果拍卖结束后，债务已被清偿且仍有剩余资金，这些剩余资金将被发送至借款人的钱包。

如需详细了解清算过程，请查看下面的清算模型，或参考我们的详细清算机制[这里](../../../for-developer/collateral-debt-position/mechanics.md)。

## 清算模型[​](https://helio.money/docs/mechanics/#liquidation-model) <a href="#liquidation-model" id="liquidation-model"></a>

<table><thead><tr><th width="370">变量/步骤</th><th>值/公式</th></tr></thead><tbody><tr><td>1单位抵押品的价格</td><td>$2</td></tr><tr><td>抵押比例</td><td>66%</td></tr><tr><td>基于抵押比例的抵押品价格</td><td>$1.32</td></tr><tr><td>假设用户存入10单位抵押品</td><td>10 * 2 = $20</td></tr><tr><td>借款限额</td><td>user_deposit * collateral_ratio = 20 * 0.66 = $13.2</td></tr><tr><td>假设用户借款$13.2的lisUSD</td><td>13.2 lisUSD</td></tr><tr><td>假设1单位抵押品的价格下降到</td><td>$1.8</td></tr><tr><td>带有安全保证金的抵押品单位价格</td><td>current_collateral_unit_price * collateral_ratio = 1.8 * 0.66 = $1.188</td></tr><tr><td>带有安全保证金的抵押品当前价值</td><td>price_of_colatteral * amount_of_collateral= 1.188 * 10 = $11.88</td></tr><tr><td>正差值使用户处于清算线以下</td><td>borrowed_amount - current_total_colateral_borrow_limit = 13.2 - 11.88 = $1.32</td></tr><tr><td>进入荷兰拍卖的抵押品数量</td><td>10</td></tr><tr><td>清算罚款（由Lista治理确定）</td><td>债务的10%</td></tr><tr><td>拍卖中需要偿还的债务</td><td>borrowed_amount * liquidation_penalty = 13.2 * 1.10 = $14.52</td></tr><tr><td>buf（与清算罚款类似的百分比，由Lista治理确定）</td><td>2%</td></tr><tr><td>拍卖开始价格（顶价）</td><td>current_collaterral_unit_price * buf = 1.8 * 1.02 = $1.836</td></tr><tr><td>有人触发拍卖并获得tip + chip作为奖励（后面会描述）</td><td></td></tr><tr><td>拍卖开始，价格逐渐下降。清算者可以参与购买自定义数量的清算抵押品</td><td></td></tr><tr><td>tau（价格为0的时间；由Lista治理确定）</td><td>例如 3600</td></tr><tr><td>dur（由Lista治理确定）</td><td>拍卖开始后经过的秒数，例如 600</td></tr><tr><td>价格的线性下降（可能会在下面的事件中被打断）</td><td>top * ((tau - dur) / tau) = 1.836 * ((3600 - 600) / 3600) = $1.53</td></tr><tr><td>因为以下两个条件之一暂停拍卖：— tail（特定的时间过去；由Lista治理确定）或 — cusp（价格下降的百分比；40%的开始拍卖价格；由Lista治理确定）</td><td>满足任一条件，拍卖将被重新启动</td></tr><tr><td>等待有人重新启动拍卖</td><td></td></tr><tr><td>tip（固定费用；由Lista治理确定）</td><td>5 lisUSD</td></tr><tr><td>chip（动态费用；由Lista治理确定）</td><td>0</td></tr><tr><td>重新启动者获得tip + chip作为奖励</td><td></td></tr></tbody></table>
