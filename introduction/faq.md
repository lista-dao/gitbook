# 常见问题解答

### 什么是Lista DAO？ <a href="#what-is-lista" id="what-is-lista"></a>

Lista DAO是一个开源的去中心化稳定币借贷协议，基于LSDfi技术。用户可以在Lista DAO上进行质押和流动性质押，同时也可以通过多种去中心化抵押品借入 **lisUSD**。Lista DAO 在 **BNB 链** 和 **以太坊** 上运营，旨在采用创新的流动质押解决方案，将 lisUSD 打造成加密领域中首屈一指的稳定币。

### Lista DAO是否经过审计？ <a href="#is-lista-audited" id="is-lista-audited"></a>

是的，Lista DAO 多次接受了顶尖 Web3 安全审计公司的审计，如Peckshield、Veridise、Slowmist、Blocksec和Supremacy。你可以在[这里](https://docs.bsc.lista.org/security)找到审计报告。

### 什么是lisUSD？ <a href="#what-is-lisusd" id="what-is-lisusd"></a>

lisUSD是Lista DAO的去中心化稳定币，与美元挂钩，完全由BNB、ETH、slisBNB和wBETH等加密资产超额抵押。在第一阶段，**lisUSD** 利用 **MakerDAO** 模型在 **BNB 链** 上提供去中心化稳定币产品。

### 什么是slisBNB？ <a href="#what-is-slisbnb" id="what-is-slisbnb"></a>

**slisBNB** 是 Lista DAO 构建的 BNB 原生收益型和流动质押代币。**slisBNB** 随着 BNB 的质押年化收益率（APR）而增值，使用户在被动赚取质押奖励的同时，能自由的在不同的 DeFi 平台上赚取额外收益。

### 什么是抵押品？ <a href="#what-is-collateral" id="what-is-collateral"></a>

抵押品是借款人必须提供以获得贷款的任何资产，作为债务的担保。

### 抵押比例是什么意思？ <a href="#what-does-collateral-ratio-mean" id="what-does-collateral-ratio-mean"></a>

这是借款人存入的抵押品的美元价值与以lisUSD借入的债务金额之间的比率。

随着抵押品价格的变动，抵押比例会波动。借款人可以通过调整抵押品和/或债务来影响比率，即增加更多的抵押品或偿还部分lisUSD债务。

例如：假设BNB的当前价格是2000美元，你决定存入1个BNB作为抵押品。如果你借入400 lisUSD，那么你的债务位置的抵押比例将是2000:400 = 500%。如果你借入1000 lisUSD，那么你的债务位置的抵押比例将是2000:1000 = 200%。

### 借用lisUSD的最低抵押比例和借款金额是多少？ <a href="#what-is-the-minimum-collateral-ratio-and-borrow-amount-to-borrow-lisusd" id="what-is-the-minimum-collateral-ratio-and-borrow-amount-to-borrow-lisusd"></a>

目前，Lista DAO在BNB链上提供了一系列的抵押资产作为抵押品，如下所示：

#### 1) BNB <a href="#id-1-bnb" id="id-1-bnb"></a>

要求：

* 最低借款：15 lisUSD
* 最低抵押比例：150%
* 最低抵押存款：0.1 BNB
* 借款费用：（动态费率，由我们的AMO模块决定）
* 提款费：0.1%
* 提款选项：BNB/slisBNB

#### 2) slisBNB (Lista DAO) <a href="#id-2-slisbnb-listadao" id="id-2-slisbnb-listadao"></a>

要求：

* 最低借款：15 lisUSD
* 最低抵押比例：150%
* 最低抵押存款：0.1 slisBNB
* 借款费用：（动态费率，由我们的AMO模块决定）
* 提款费：0.1%
* 提款选项：BNB/slisBNB

#### 3) ETH <a href="#id-3-eth" id="id-3-eth"></a>

要求：

* 最低借款：15 lisUSD
* 最低抵押比例：110%
* 最低抵押存款：0.1 ETH
* 借款费用：（动态费率，由我们的AMO模块决定）
* 提款费：0.1%
* 提款选项：ETH/WBETH

#### 3) WBETH (Binance) <a href="#id-3-wbeth-binance" id="id-3-wbeth-binance"></a>

要求：

* 最低借款：15 lisUSD
* 最低抵押比例：110%
* 最低抵押存款：0.1 WBETH
* 借款费用：（动态费率，由我们的AMO模块决定）
* 提款费：0.1%
* 提款选项：WBETH

#### 4) BTCB (Binance) <a href="#id-4-btcb-binance" id="id-4-btcb-binance"></a>

要求：

* 最低借款：15 lisUSD
* 最低抵押比例：110%
* 最低抵押存款：0.001 BTCB
* 借款费用：（动态费率，由我们的AMO模块决定）
* 提款费：0%
* 提款选项：BTCB

#### 5) weETH (Ether.fi) <a href="#id-5-weeth-ether.fi" id="id-5-weeth-ether.fi"></a>

要求：

* 最低借款：15 lisUSD
* 最低抵押比例：200%
* 最低抵押存款：0.1 weETH
* 借款费用：（动态费率，由我们的AMO模块决定）
* 提款费：0%
* 提款选项：weETH

#### 6) ezETH (Renzo Protocol) <a href="#id-6-ezeth-renzo-protocol" id="id-6-ezeth-renzo-protocol"></a>

要求：

* 最低借款：15 lisUSD
* 最低抵押比例：200%
* 最低抵押存款：0.1 ezETH
* 借款费用：（动态费率，由我们的AMO模块决定）
* 提款费：0%
* 提款选项：ezETH

#### 7) STONE (StakeStone) <a href="#id-7-stone-stakestone" id="id-7-stone-stakestone"></a>

要求：

* 最低借款：15 lisUSD
* 最低抵押比例：200%
* 最低抵押存款：0.1 STONE
* 借款费用：（动态费率，由我们的AMO模块决定）
* 提款费：0%
* 提款选项：STONE

#### 8) SolvBTC (Solv Protocol) <a href="#id-8-solvbtc-solv-protocol" id="id-8-solvbtc-solv-protocol"></a>

要求：

* 最低借款：15 lisUSD
* 最低抵押比例：200%
* 最低抵押存款：0.001 SolvBTC
* 借款费用：（动态费率，由我们的AMO模块决定）
* 提款费：0%
* 提款选项：SolvBTC

9\) BBTC (BounceBit)

要求：

* 最低借款：15 lisUSD
* 最低抵押比例：200%
* 最低抵押存款：0.001 BBTC
* 借款费用：（动态费率，由我们的AMO模块决定）
* 提款费：0%
* 提款选项：BBTC

### 用户如何通过lisUSD获利？ <a href="#how-can-users-earn-on-lisusd" id="how-can-users-earn-on-lisusd"></a>

用户可以通过多种方式利用lisUSD获利。他们可以在ListaDAO上质押他们的lisUSD，从而获得lisUSD奖励。他们还可以在PancakeSwap、Wombat Exchange、ThenaFi、Curve和Uniswap等各种流动性池中为slisBNB和lisUSD提供流动性，以进一步赚取交易和LP费用。

请注意，虽然我们努力维持价格稳定，但lisUSD可能并不总是完美地挂钩美元，在压力市场条件下，它可能在两个方向上略有偏离。

### 我在Lista DAO上的头寸会被清算吗？ <a href="#will-my-position-be-liquidated-on-lista" id="will-my-position-be-liquidated-on-lista"></a>

是的，清算是像Lista DAO这样的借贷协议中的一个常见概念，因此，用户需要知道，如果他们不再有足够的抵押品来维持贷款的最低清算比率（MCR），他们的贷款头寸有被清算的风险。

例如，如果你是一个借款人，你的抵押品的价值跌破150%的MCR，清算将会发生。你仍然可以保留你借入的lisUSD，但你的借款头寸将被关闭，你的抵押品将被用来补偿清算人。

### 用户有失去他们的资金的风险吗？ <a href="#are-users-at-risk-of-losing-their-funds" id="are-users-at-risk-of-losing-their-funds"></a>

作为一个非托管系统，所有发送到协议的代币将由智能合约持有和管理，不受任何人或法人实体的干扰。这意味着你的资金只会受到智能合约代码中规定的规则的约束。

尽管Lista DAO已经严格设计了我们的平台并审计了我们的代码，但可能还有其他未知的风险，因此并不能完全排除所有的风险。任何DeFi协议和投资都有风险。Lista DAO已经将我们的代码和审计报告在线公开，用户可以自行评估风险。

Lista DAO目前处于初始开发阶段，存在各种无法预见的风险。你承认并同意，获取LISTA、持有LISTA和使用LISTA参与Lista DAO有许多风险。在最坏的情况下，这可能导致持有的全部或部分LISTA的损失。如果你决定获取LISTA或参与Lista DAO，你明确承认、接受并承担以下风险：

■ 不确定的法规和执法行动：Lista DAO、LISTA和分布式账本技术在许多司法管辖区的监管状态是不明确或未定的。数字资产的监管已经成为全球主要国家监管的主要目标。无法预测监管机构何时、如何或是否会对这种技术及其应用（包括LISTA和/或Lista DAO）应用现有的法规或制定新的法规。监管行动可能会以各种方式对LISTA和/或Lista DAO产生负面影响。Lista DAO或其任何关联公司可能会在监管行动或法律或法规的变更使其在某个司法管辖区内的运营变得非法，或者在该司法管辖区内获取必要的监管批准变得商业上不可取时，停止在该司法管辖区内的运营。在咨询了广泛的法律顾问以尽可能地减轻法律风险后，Lista DAO已经与GS Legal LLC的专业区块链部门合作，获得了关于代币分发的法律意见，并将按照市场惯例进行业务。

■ 信息披露不足：截至本日，Lista DAO仍在开发中，其设计概念、共识机制、算法、代码和其他技术细节和参数可能会不断频繁地更新和改变。尽管这份材料包含了关于Lista DAO的最新信息，但它并不绝对完整，可能仍会被Lista DAO不时调整和更新。Lista DAO既没有能力也没有义务让LISTA的持有者了解每一个细节（包括开发进度和预期的里程碑）关于开发Lista DAO的项目，因此信息披露不足是不可避免和合理的。

■ 开发失败：存在Lista DAO的开发可能无法按计划执行或实施的风险，原因可能有很多，包括但不限于任何数字资产、虚拟货币或LISTA的价格下跌、未预见的技术困难，以及活动的开发资金短缺。

■ 安全漏洞：黑客或其他恶意团体或组织可能会试图以各种方式干扰LISTA和/或Lista DAO，包括但不限于恶意软件攻击、拒绝服务攻击、基于共识的攻击、Sybil攻击、smurfing和spoofing。此外，存在第三方或Lista DAO成员或其关联公司可能故意或无意地将弱点引入LISTA和/或Lista DAO的核心基础设施，这可能对LISTA和/或Lista DAO产生负面影响。此外，密码学和安全创新的未来高度不可预测，密码学的进步或技术进步（包括但不限于量子计算的发展）可能会对LISTA和/或Lista DAO带来未知的风险，通过使支撑该区块链协议的密码学共识机制失效。

■ 解散风险：像Lista DAO这样的初创项目涉及到高度的风险。初创公司面临的财务和运营风险是重大的，上述实体并不免疫这些风险。初创公司经常在产品开发、营销、融资和一般管理等领域遇到意想不到的问题，这些问题往往无法解决。有可能由于各种原因，包括但不限于加密货币和法定货币价值的不利波动、Lista DAO的负面评价导致LISTA的效用降低、商业关系的失败，或与知识产权所有权相关的挑战，Lista DAO可能不再具有运营的可行性，Lista DAO可能被解散。

■ 其他风险：上述提及的风险并不详尽，存在其他未提及的风险（如条款和条件中详述的那样）。这些风险可能以未预料的方式或各种风险的组合形式实现。您应在参与 Lista DAO 和/或获得 LISTA 之前，对公司、分销商、其各自的关联方和 Lista 团队进行全面尽职调查，以及全面充分了解 Lista DAO 的整体框架、使命和愿景。
