# 常见问题解答

### Lista DAO是什么？ <a href="#what-is-lista" id="what-is-lista"></a>

Lista DAO 是一个开源的去中心化稳定币借贷协议，由LSDfi提供支持。用户可以在Lista DAO上进行质押和流动性质押，以及借用lisUSD对抗各种去中心化抵押品。Lista DAO存在于BNB Chain和Ethereum上，旨在利用创新的流动性质押解决方案，将lisUSD定位为加密空间中的第一稳定币。

### Lista DAO是否经过审计？ <a href="#is-lista-audited" id="is-lista-audited"></a>

是的，Lista DAO已经多次由一些最佳的Web3安全审计机构如Peckshield、Veridise、Slowmist、Blocksec和Supremacy进行审计。您可以在[此处](https://docs.bsc.lista.org/security)找到审计报告。

### lisUSD是什么？ <a href="#what-is-lisusd" id="what-is-lisusd"></a>

lisUSD是Lista DAO的去中心化稳定币，与美元挂钩，并由BNB、ETH、slisBNB和wBETH等加密资产全额抵押。在第一阶段，lisUSD利用BNB Chain上的MakerDAO模型，提供一个去中心化且无偏见的稳定币产品。

### slisBNB是什么 <a href="#what-is-slisbnb" id="what-is-slisbnb"></a>

slisBNB是由Lista DAO构建的BNB的本地收益型和流动性质押代币。slisBNB根据BNB的质押APR对BNB进行增值，允许用户在不同的DeFi平台上赚取额外的收益，同时被动地获得质押奖励。

### 什么是抵押品？ <a href="#what-is-collateral" id="what-is-collateral"></a>

抵押品是借款人必须提供以获得贷款的任何资产，作为债务的保障。

### 抵押比率是什么意思？ <a href="#what-does-collateral-ratio-mean" id="what-does-collateral-ratio-mean"></a>

这是借款人存入的抵押品的美元价值与借入的lisUSD债务金额之间的比率。

抵押比率会随着抵押品价格的变化而波动。借款人可以通过调整抵押品和/或债务来影响比率——即增加更多的抵押品或偿还一些lisUSD债务。

例如：假设BNB的当前价格为2000美元，您决定存入1个BNB作为抵押品。如果您借用400 lisUSD，那么您的债务位置的抵押比率将是2000:400 = 500%。如果您借用1000 lisUSD，那么您的债务位置的抵押比率将是2000:1000 = 200%。

### 借用lisUSD的最低抵押比率和借款金额是多少？ <a href="#what-is-the-minimum-collateral-ratio-and-borrow-amount-to-borrow-lisusd" id="what-is-the-minimum-collateral-ratio-and-borrow-amount-to-borrow-lisusd"></a>

目前，Lista DAO在BNBchain上提供一系列资产作为抵押品，如下所示：

#### 1) BNB <a href="#id-1-bnb" id="id-1-bnb"></a>

要求：

* 最低借款：15 lisUSD
* 最低抵押比率：120%
* 最低抵押存款：0.1 BNB
* 借款费用：（动态费率，由我们的AMO模块决定）
* 提款费用：0%
* 提款选项：BNB/slisBNB

#### 2) slisBNB (Lista DAO) <a href="#id-2-slisbnb-listadao" id="id-2-slisbnb-listadao"></a>

要求：

* 最低借款：15 lisUSD
* 最低抵押比率：125%
* 最低抵押存款：0.1 slisBNB
* 借款费用：（动态费率，由我们的AMO模块决定）
* 提款费用：0%
* 提款选项：BNB/slisBNB

#### 3) ETH <a href="#id-3-eth" id="id-3-eth"></a>

要求：

* 最低借款：15 lisUSD
* 最低抵押比率：125%
* 最低抵押存款：0.1 ETH
* 借款费用：（动态费率，由我们的AMO模块决定）
* 提款费用：0.1%
* 提款选项：ETH/WBETH

#### 4) WBETH (Binance) <a href="#id-3-wbeth-binance" id="id-3-wbeth-binance"></a>

要求：

* 最低借款：15 lisUSD
* 最低抵押比率：125%
* 最低抵押存款：0.1 WBETH
* 借款费用：（动态费率，由我们的AMO模块决定）
* 提款费用：0%
* 提款选项：WBETH

#### 5) BTCB (Binance) <a href="#id-4-btcb-binance" id="id-4-btcb-binance"></a>

要求：

* 最低借款：15 lisUSD
* 最低抵押比率：125%
* 最低抵押存款：0.001 BTCB
* 借款费用：（动态费率，由我们的AMO模块决定）
* 提款费用：0%
* 提款选项：BTCB

#### 6) STONE (StakeStone) <a href="#id-7-stone-stakestone" id="id-7-stone-stakestone"></a>

要求：

* 最低借款：15 lisUSD
* 最低抵押比率：200%
* 最低抵押存款：0.1 STONE
* 借款费用：（动态费率，由我们的AMO模块决定）
* 提款费用：0%
* 提款选项：STONE

#### 7) SolvBTC (Solv Protocol) <a href="#id-8-solvbtc-solv-protocol" id="id-8-solvbtc-solv-protocol"></a>

要求：

* 最低借款：15 lisUSD
* 最低抵押比率：200%
* 最低抵押存款：0.001 SolvBTC
* 借款费用：（动态费率，由我们的AMO模块决定）
* 提款费用：0%
* 提款选项：SolvBTC

#### 8) SolvBTC.BBN (Solv Protocol) <a href="#id-8-solvbtc-solv-protocol" id="id-8-solvbtc-solv-protocol"></a>

要求：

* 最低借款：15 lisUSD
* 最低抵押比率：200%
* 最低抵押存款：0.001 SolvBTC.BBN
* 借款费用：7.5%
* 提款费用：0%
* 提款选项：SolvBTC

### 用户如何在lisUSD上赚取收益？ <a href="#how-can-users-earn-on-lisusd" id="how-can-users-earn-on-lisusd"></a>

用户可以通过多种方式在lisUSD上赚取收益。他们可以在ListaDAO上质押他们的lisUSD，从而获得lisUSD奖励。他们还可以在PancakeSwap、Wombat Exchange、ThenaFi、Curve和Uniswap等各种流动性池中为slisBNB和lisUSD提供流动性，进一步赚取交易和LP费用。

请注意，虽然我们努力维持价格稳定，但lisUSD可能不会始终完美地与USD挂钩，在紧张的市场条件下可能会稍微偏离。

### 为什么我无法从金库中提取我的资金？ <a href="#will-my-position-be-liquidated-on-lista" id="will-my-position-be-liquidated-on-lista"></a>

这很可能是由于其高利用率。存入金库的资产将被分配到几个市场作为借款人的借款资产。这是大多数金库的主要收入来源。金库的利用率高意味着大部分资产已被借出，金库中剩余的流动性不多。如果在此利用率下发起提款，且请求的金额超过金库中剩余的金额，则会因缺乏流动性而被拒绝。

不需要担心，因为随着时间的推移，借款人将偿还他们的贷款，金库中将有更多的流动性。即使有人忘记偿还，当累积的利息将其LTV推高到LLTV比率时，他们的贷款可能会被清算。被清算的资产将被返回到金库，将有更多的流动性可用。

如果金库的利用率不高（低于90%），但您在提款时仍遇到错误，请联系我们的支持团队，通过我们的[Telegram](https://t.me/ListaDAO)或[Discord](https://discord.gg/listadao)社区。

### 我在Lista DAO的位置会被清算吗？ <a href="#will-my-position-be-liquidated-on-lista" id="will-my-position-be-liquidated-on-lista"></a>

是的，清算是像Lista DAO这样的借贷协议中的常见概念，因此，用户需要知道，如果他们不再有足够的抵押品来维持贷款的MCR，他们的贷款位置有被清算的风险。

例如，如果您是借款人，而您的抵押品价值下降到150%的MCR以下，将发生清算。您将保留您借用的lisUSD，但您的借用位置将被关闭，您的抵押品将被用来补偿清算人。

### 用户有失去资金的风险吗？ <a href="#are-users-at-risk-of-losing-their-funds" id="are-users-at-risk-of-losing-their-funds"></a>

作为一个非托管系统，所有发送到协议的代币将由智能合约持有和管理，不受任何个人或法律实体的干扰。这意味着您的资金只会受到智能合约代码中设定的规则的约束。

尽管Lista DAO严格设计了我们的平台并审计了我们的代码，但可能还有其他未预见的风险，因此并非所有风险都可以完全排除。任何DeFi协议和投资都带有风险。Lista DAO已经在网上公开了我们的代码和审计报告，用户可以自行评估风险。

Lista DAO目前处于初始开发阶段，存在多种不可预见的风险。您承认并同意，参与获取LISTA、持有LISTA和使用LISTA参与Lista DAO存在许多风险。在最坏的情况下，这可能导致持有的LISTA全部或部分损失。如果您决定获取LISTA或参与Lista DAO，您明确承认、接受并承担以下风险：

■ 不确定的法规和执法行动：Lista DAO、LISTA和分布式账本技术在许多司法管辖区的监管状态不清楚或未定。数字资产的监管已成为全球所有主要国家监管的主要目标。无法预测监管机构何时、如何或是否会将现有法规应用于此类技术及其应用，包括LISTA和/或Lista DAO。监管行动可能以各种方式对LISTA和/或Lista DAO产生负面影响。如果监管行动或法律或法规的变更使得在某个司法管辖区的运营变得非法或商业上不可取，Lista DAO或其任何附属机构可能会停止在该司法管辖区的运营。在咨询了广泛的法律顾问以尽可能降低法律风险后，Lista DAO已与GS Legal LLC的专业区块链部门合作，获得了代币分发的法律意见，并将按照市场惯例开展业务。

■ 信息披露不足：截至目前，Lista DAO仍在开发中，其设计概念、共识机制、算法、代码和其他技术细节及参数可能会不断且频繁地更新和更改。尽管本材料包含了与Lista DAO相关的最新信息，但它并不是绝对完整的，可能仍会不时由Lista DAO进行调整和更新。Lista DAO既没有能力也没有义务向LISTA持有者通报每一个细节（包括开发进展和预期里程碑），因此信息披露不足是不可避免且合理的。

■ 开发失败：Lista DAO的开发可能无法按计划执行或实施，原因多种多样，包括但不限于任何数字资产、虚拟货币或LISTA价格的下降、未预见的技术困难以及活动资金不足。

■ 安全弱点：黑客或其他恶意团体或组织可能以各种方式干扰LISTA和/或Lista DAO，包括但不限于恶意软件攻击、拒绝服务攻击、基于共识的攻击、Sybil攻击、smurfing和spoofing。此外，第三方或Lista DAO或其附属机构的成员可能有意或无意地引入LISTA和/或Lista DAO的核心基础设施的弱点，这可能对LISTA和/或Lista DAO产生负面影响。此外，密码学和安全创新的未来高度不可预测，密码学的进步或技术进步（包括但不限于量子计算的发展）可能通过使支持该区块链协议的密码学共识机制失效，给LISTA和/或Lista DAO带来未知的风险。

■ 解散风险：像Lista DAO这样的早期项目涉及高度风险。面对初创公司的财务和运营风险是重大的，上述实体并不免疫这些风险。初创公司经常在产品开发、营销、融资和一般管理等领域遇到意外问题，这些问题往往无法解决。由于各种原因，包括但不限于加密货币和法定货币价值的不利波动、由于Lista DAO采用不足导致的LISTA效用下降、商业关系失败或知识产权所有权相关挑战，Lista DAO可能不再