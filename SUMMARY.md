# 目录

## 引言

* [概述](README.md)
* [抵押债务头寸](introduction/collateral-debt-position/README.md)
  * [抵押品](introduction/collateral-debt-position/collateral/README.md)
    * [经典抵押选项](introduction/collateral-debt-position/collateral/classic-collateral-options.md)
    * [Lista 创新区](introduction/collateral-debt-position/collateral/lista-innovation-zone.md)
    * [贷款清算](introduction/collateral-debt-position/collateral/loan-liquidation.md)
  * [lisUSD](introduction/collateral-debt-position/lisusd/README.md)
    * [价格稳定性](introduction/collateral-debt-position/lisusd/price-stability.md)
    * [算法市场操作 (AMO)](introduction/collateral-debt-position/lisusd/algorithmic-market-operations-amo/README.md)
      * [当前与预期借款利率](introduction/collateral-debt-position/lisusd/algorithmic-market-operations-amo/current-vs-expected-borrow-rates.md)
    * [lisUSD 的流动性](introduction/collateral-debt-position/lisusd/lisusds-liquidity.md)
  * [技术指南](introduction/collateral-debt-position/technical-guide.md)
* [流动性质押 - slisBNB](introduction/liquid-staking-slisbnb/README.md)
  * [关于 slisBNB](introduction/liquid-staking-slisbnb/about-slisbnb.md)
  * [奖励与费用](introduction/liquid-staking-slisbnb/rewards-and-fees.md)
  * [技术指南](introduction/liquid-staking-slisbnb/technical-guide.md)
* [路线图](introduction/roadmap.md)
* [常见问题解答](introduction/faq.md)

## 治理

* [LISTA](governance/lista/README.md)
  * [LISTA 分配](governance/lista/lista-distribution.md)
* [veLISTA](governance/velista/README.md)
  * [veLISTA 概述](governance/velista/velista-summary.md)
  * [veLISTA 锁定机制](governance/velista/velista-locking-mechanics.md)
  * [治理](governance/velista/governance/README.md)
    * [治理提案模板](governance/velista/governance/governance-proposal-template.md)
  * [协议费用](governance/velista/protocol-fees.md)
  * [veLISTA 发行](governance/velista/velista-emissions/README.md)
    * [LP 池](governance/velista/velista-emissions/lp-pools.md)
    * [推荐计划](governance/velista/velista-emissions/referral-programme.md)
    * [lisUSD 换手者](governance/velista/velista-emissions/lisusd-swappers.md)
  * [收入 / 成本](governance/velista/revenue-cost.md)
  * [分析](governance/velista/analytics.md)

## 用户指南

* [抵押债务头寸](user-guide/collateral-debt-position/README.md)
  * [提供抵押品](user-guide/collateral-debt-position/provide-collateral.md)
  * [借入 lisUSD](user-guide/collateral-debt-position/borrow-lisusd.md)
  * [耕种 lisUSD](user-guide/collateral-debt-position/farm-lisusd/README.md)
    * [在 Magpie 耕种](user-guide/collateral-debt-position/farm-lisusd/farming-on-magpie.md)
    * [在 Thena 耕种](user-guide/collateral-debt-position/farm-lisusd/farming-on-thena.md)
    * [在 Wombat 耕种](user-guide/collateral-debt-position/farm-lisusd/farming-on-wombat.md)
  * [偿还 lisUSD](user-guide/collateral-debt-position/repay-lisusd.md)
  * [提取抵押品](user-guide/collateral-debt-position/withdraw-collateral.md)
* [流动性质押 - slisBNB](user-guide/liquid-staking-slisbnb/README.md)
  * [如何兑换 slisBNB](user-guide/liquid-staking-slisbnb/how-to-swap-for-slisbnb.md)
  * [铸造 slisBNB](user-guide/liquid-staking-slisbnb/mint-slisbnb.md)
  * [从 slisBNB 兑换 BNB](user-guide/liquid-staking-slisbnb/redeem-bnb-from-slisbnb.md)
  * [将 slisBNB 桥接到以太坊](user-guide/liquid-staking-slisbnb/bridging-slisbnb-to-ethereum.md)
* [使用 Binance Web3 钱包](user-guide/using-binance-web3-wallet/README.md)
  * [将 BNB 流动性质押为 slisBNB](user-guide/using-binance-web3-wallet/liquid-staking-bnb-into-slisbnb.md)
  * [获取 lisUSD](user-guide/using-binance-web3-wallet/obtaining-lisusd.md)
  * [在 APX Finance 交易](user-guide/using-binance-web3-wallet/trading-on-apx-finance.md)
* [LISTA / veLISTA](user-guide/lista-velista/README.md)
  * [锁定 LISTA](user-guide/lista-velista/lock-lista.md)
  * [延长 LISTA 锁定](user-guide/lista-velista/extend-lista-lock.md)
  * [自动锁定](user-guide/lista-velista/auto-lock.md)
  * [解锁 LISTA](user-guide/lista-velista/unlock-lista.md)
  * [领取奖励](user-guide/lista-velista/claim-rewards.md)

## 安全

* [审计报告](security/audit-reports.md)
* [漏洞赏金 (Immunefi)](security/bug-bounty-immunefi.md)

## 开发者

* [概述](for-developer/overview.md)
* [LISTA 治理](for-developer/lista-governance/README.md)
  * [智能合约](for-developer/lista-governance/smart-contract.md)
* [抵押债务头寸](for-developer/collateral-debt-position/README.md)
  * [机制](for-developer/collateral-debt-position/mechanics.md)
  * [闪电贷](for-developer/collateral-debt-position/flash-loan.md)
  * [多数据源](for-developer/collateral-debt-position/multi-oracle.md)
  * [智能合约](for-developer/collateral-debt-position/smart-contract.md)
* [流动性质押(slisBNB)](for-developer/liquid-staking-slisbnb/README.md)
  * [机制](for-developer/liquid-staking-slisbnb/mechanics.md)
  * [跨链桥](for-developer/liquid-staking-slisbnb/cross-chain-bridge.md)
  * [智能合约](for-developer/liquid-staking-slisbnb/smart-contract.md)

## 合作伙伴关系

* [品牌套件](partnerships/brand-kit.md)
* [我们的渠道](partnerships/our-channels.md)

## 法律免责声明

* [法律免责声明](legal-disclaimer/legal-disclaimer.md)