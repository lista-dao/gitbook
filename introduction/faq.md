# 常见问题解答

### Lista DAO是什么？ <a href="#what-is-lista" id="what-is-lista"></a>

Lista DAO是由LSDfi驱动的开源去中心化稳定币借贷协议。用户可以在Lista DAO上进行质押和流动性质押，以及使用多种去中心化抵押品借出lisUSD。Lista DAO存在于BNB Chain和Ethereum上，旨在利用创新的流动性质押解决方案，将lisUSD定位为加密空间中的首选稳定币。

### Lista DAO是否经过审计？ <a href="#is-lista-audited" id="is-lista-audited"></a>

是的，Lista DAO已经多次由一些最佳的Web3安全审计公司如Peckshield、Veridise、Slowmist、Blocksec和Supremacy进行审计。您可以在[此处](https://docs.bsc.lista.org/security)找到审计报告。

### lisUSD是什么？ <a href="#what-is-lisusd" id="what-is-lisusd"></a>

lisUSD是Lista DAO的去中心化稳定币，锚定美元，完全由BNB、ETH、slisBNB和wBETH等加密资产超额抵押。在第一阶段，lisUSD利用BNB Chain上的MakerDAO模型，提供一个去中心化且无偏见的稳定币产品。

### slisBNB是什么 <a href="#what-is-slisbnb" id="what-is-slisbnb"></a>

slisBNB是Lista DAO构建的BNB的本地收益型和流动性质押代币。slisBNB按照BNB的质押APR对BNB进行增值，允许用户在不同的DeFi平台上获得额外的收益，同时被动地获得质押奖励。

### 什么是抵押品？ <a href="#what-is-collateral" id="what-is-collateral"></a>

抵押品是借款人必须提供以获得贷款的任何资产，作为债务的保障。

### 为什么我无法从借贷库中提取我的资产？ <a href="#why-cant-i-withdraw-my-assets-from-a-vault" id="why-cant-i-withdraw-my-assets-from-a-vault"></a>

这很可能是由于其高利用率。存入库中的资产将被分配到几个市场作为借款人的贷款资产。这是大多数库的主要收入来源。库中借出资产与总资产之间的比率是利用率。

当一个库的利用率很高时，意味着大部分资产已被借出，库中几乎没有剩余流动性。如果发起提款并且请求的金额超过库存中的剩余金额，由于缺乏流动性，将会被拒绝。当库与市场配对时，抵押品和贷款资产的受欢迎程度非常不同，这种情况很常见。

不需要担心，因为随着时间的推移，将会有更多的存款和借款人将偿还他们的贷款，结果库中将会有更多的流动性。即使有人忘记偿还，当累积的利息推动其LTV超过LLTV比率时，他们的贷款可能会被清算。被清算的资产将被返回库中，将有更多的流动性可用。

如果库的利用率不高（低于90％），但您在提款时仍遇到错误，请通过我们的[Telegram](https://t.me/ListaDAO)或[Discord](https://discord.gg/listadao)社区联系我们的支持。

### 我在Lista DAO上的位置会被清算吗？ <a href="#will-my-position-be-liquidated-on-lista" id="will-my-position-be-liquidated-on-lista"></a>

是的，清算是像Lista DAO这样的借贷协议中的常见概念，因此，用户需要意译，如果他们不再有足够的抵押品来维持贷款的MCR，他们的贷款位置有被清算的风险。

例如，如果您是借款人，而您的抵押品价值下降到150%的MCR以下，将会发生清算。您仍然可以保留您借出的lisUSD，但您的借款位置将被关闭，您的抵押品将被用来补偿清算人。

请阅读我们的[清算文档](lista-lending/liquidation/)以获取更多信息。

### 用户如何通过lisUSD赚取收益？ <a href="#how-can-users-earn-on-lisusd" id="how-can-users-earn-on-lisusd"></a>

用户可以通过多种方式使用lisUSD赚取收益。他们可以在ListaDAO上质押他们的lisUSD，从而获得lisUSD奖励。他们还可以在PancakeSwap、Wombat Exchange、ThenaFi、Curve和Uniswap等多个流动性池中为slisBNB和lisUSD提供流动性，以进一步赚取交易和LP费用。

请注意，虽然我们努力维持价格稳定，但lisUSD可能不会始终完美地锚定美元，在紧张的市场条件下可能会稍微偏离。

### 用户是否有丢失资金的风险？ <a href="#are-users-at-risk-of-losing-their-funds" id="are-users-at-risk-of-losing-their-funds"></a>

作为一个非托管系统，所有发送到协议的代币将由智能合约持有和管理，不受任何人或法律实体的干扰。这意味着您的资金只会受到智能合约代码中设定的规则的约束。

尽管Lista DAO已经严格设计了我们的平台并审计了我们的代码，但可能还有其他未预见的风险，因此并非所有风险都可以完全排除。任何DeFi协议和投资都带有风险。Lista DAO已经在网上公开了我们的代码和审计报告，用户可以自行评估风险。

Lista DAO目前处于初始开发阶段，存在多种不可预见的风险。您承认并同意，参与获取LISTA、持有LISTA以及使用LISTA参与Lista DAO存在许多风险。在最坏的情况下，这可能导致持有的LISTA全部或部分损失。如果您决定获取LISTA或参与Lista DAO，您明确承认、接受并承担以下风险：

■ 不确定的法规和执法行动：Lista DAO、LISTA和分布式账本技术在许多司法管辖区的监管状态不明确或未定。数字资产的监管已成为全球所有主要国家监管的主要目标。无法预测监管机构何时、如何或是否会对此类技术及其应用（包括LISTA和/或Lista DAO）应用现有法规或制定新法规。监管行动可能以各种方式对LISTA和/或Lista DAO产生负面影响。如果监管行动或法律或法规的变更使得在某个司法管辖区的运营变得非法或商业上不可取，Lista DAO或其任何关联公司可能会停止在该司法管辖区的运营，或不再寻求获得必要的监管批准以在该司法管辖区运营。在咨询了广泛的法律顾问以尽可能降低法律风险后，Lista DAO已与GS Legal LLC的专业区块链部门合作，获得了代币分发的法律意见，并将按照市场惯例开展业务。

■ 信息披露不充分：截至目前，Lista DAO仍在开发中，其设计概念、共识机制、算法、代码和其他技术细节及参数可能会不断且频繁地更新和更改。虽然本材料包含了与Lista DAO相关的最新信息，但它并不是绝对完整的，可能仍会不时由Lista DAO进行调整和更新。Lista DAO既没有能力也没有义务向LISTA持有者通报每一个细节（包括开发进展和预期里程碑），因此不充分的信息披露是不可避免且合理的。

■ 开发失败：存在Lista DAO的开发未能按计划执行或实施的风险，原因多种多样，包括但不限于任何数字资产、虚拟货币或LISTA价格的下降、未预见的技术困难以及活动资金不足。

■ 安全弱点：黑客或其他恶意团体或组织可能以各种方式干扰LISTA和/或Lista DAO，包括但不限于恶意软件攻击、拒绝服务攻击、基于共识的攻击、Sybil攻击、smurfing和spoofing。此外，第三方或Lista DAO或其关联公司的成员可能有意或无意地引入LISTA和/或Lista DAO的核心基础设施中的弱点，这可能对LISTA和/或Lista DAO产生负面影响。此外，密码学和安全创新的未来高度不可预测，密码学的进步或技术进步（包括但不限于量子计算的发展）可能通过使支持该区块链协议的密码学共识机制失效，给LISTA和/或Lista DAO带来未知的风险。

■ 解散风险：像Lista DAO这样的初创项目存在高度风险。面对初创公司的财务和运营风险是重大的，上述实体并非免疫这些风险。初创公司经常在产品开发、营销、融资和一般管理等领域遇到意外问题，这些问题往往无法解决。由于各种原因，包括但不限于加密货币和法定货币价值的不利波动、由于Lista DAO的负面采用导致LISTA的实用性下降、商业关系失败或知识产权所有权相关挑战，Lista DAO可能不再可行运营，Lista DAO可能会被解散。

■ 其他风险：此外，上述简要提及的潜在风险并不详尽，还有其他风险（如条款和条件中更详细地列出的）与您参与Lista DAO以及获取、持有和使用LISTA相关，包括公司或分销商无法预见的风险。这些风险可能会以未预料的变化或上述风险的组合形式进一步实现。您应对公司、分销商及其各自的关联公司和Lista团队进行全面尽职调查，以及在参与同一或获取LISTA之前了解Lista DAO的整体框架、使命和愿景。