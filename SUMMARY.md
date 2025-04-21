# 目录

## 引言

* [概述](README.md)
* [抵押债务头寸 - lisUSD](introduction/collateral-debt-position-lisusd/README.md)
  * [抵押品](introduction/collateral-debt-position-lisusd/collateral/README.md)
    * [经典抵押选项](introduction/collateral-debt-position-lisusd/collateral/classic-collateral-options.md)
    * [Lista 创新区](introduction/collateral-debt-position-lisusd/collateral/lista-innovation-zone.md)
    * [贷款清算](introduction/collateral-debt-position-lisusd/collateral/loan-liquidation.md)
  * [lisUSD](introduction/collateral-debt-position-lisusd/lisusd/README.md)
    * [稳定池 - 价格稳定模块 (PSM)](introduction/collateral-debt-position-lisusd/lisusd/stable-pool-price-stability-module-psm.md)
    * [lisUSD 储蓄率 (LSR)](introduction/collateral-debt-position-lisusd/lisusd/lisusd-saving-rate-lsr.md)
    * [D3M - 直接存款模块](introduction/collateral-debt-position-lisusd/lisusd/d3m-direct-deposit-module.md)
    * [算法市场操作 (AMO)](introduction/collateral-debt-position-lisusd/lisusd/algorithmic-market-operations-amo/README.md)
      * [当前与预期借款利率](introduction/collateral-debt-position-lisusd/lisusd/algorithmic-market-operations-amo/current-vs-expected-borrow-rates.md)
    * [lisUSD 的流动性](introduction/collateral-debt-position-lisusd/lisusd/lisusds-liquidity.md)
  * [技术指南](introduction/collateral-debt-position-lisusd/technical-guide.md)
* [流动性质押 - slisBNB](introduction/liquid-staking-slisbnb/README.md)
  * [关于 slisBNB](introduction/liquid-staking-slisbnb/about-slisbnb.md)
  * [奖励与费用](introduction/liquid-staking-slisbnb/rewards-and-fees.md)
  * [技术指南](introduction/liquid-staking-slisbnb/technical-guide.md)
* [Lista 借贷](introduction/lista-lending/README.md)
  * [金库](introduction/lista-lending/vaults.md)
  * [市场](introduction/lista-lending/markets.md)
  * [清算](introduction/lista-lending/liquidation.md)
  * [预言机](introduction/lista-lending/oracle.md)
  * [闪电贷](introduction/lista-lending/flash-loan.md)
  * [用户流程](introduction/lista-lending/user-flow.md)
* [币安 Launchpool: clisBNB](introduction/binance-launchpool-clisbnb/README.md)
  * [用 slisBNB 铸造 clisBNB](introduction/binance-launchpool-clisbnb/minting-clisbnb-with-slisbnb.md)
* [BNB 验证器: Lista DAO](introduction/bnb-validator-lista-dao.md)
* [路线图](introduction/roadmap.md)
* [常见问题解答](introduction/faq.md)

## 治理

* [LISTA](governance/lista/README.md)
  * [LISTA 分配](governance/lista/lista-distribution.md)
* [veLISTA](governance/velista/README.md)
  * [veLISTA 概述](governance/velista/velista-summary.md)
  * [Lista DAO: 解锁 veLISTA 功能](governance/velista/lista-dao-unlocking-velista-utility.md)
  * [veLISTA 锁定机制](governance/velista/velista-locking-mechanics.md)
  * [治理](governance/velista/governance/README.md)
    * [治理提案模板](governance/velista/governance/governance-proposal-template.md)
  * [协议费用](governance/velista/protocol-fees.md)
  * [veLISTA 发行](governance/velista/velista-emissions/README.md)
    * [LP 池](governance/velista/velista-emissions/lp-pools.md)
  * [veLISTA 投票](governance/velista/gauge-voting-for-velista.md)
  * [veLISTA 贿赂市场](governance/velista/velista-bribe-market.md)
  * [自动复合](governance/velista/auto-compounding.md)
  * [永久锁定 LISTA (LIP-016)](governance/velista/permanent-locking-of-lista-lip-016.md)
  * [收入/成本](governance/velista/revenue-cost.md)
  * [分析](governance/velista/analytics.md)

## 用户指南

* [抵押债务头寸](user-guide/collateral-debt-position/README.md)
  * [提供抵押品](user-guide/collateral-debt-position/provide-collateral.md)
  * [借入 lisUSD](user-guide/collateral-debt-position/borrow-lisusd.md)
  * [偿还 lisUSD](user-guide/collateral-debt-position/repay-lisusd.md)
  * [提取抵押品](user-guide/collateral-debt-position/withdraw-collateral.md)
  * [将 clisBNB 委托给您的币安 web3 MPC 钱包](user-guide/collateral-debt-position/delegating-clisbnb-to-your-binance-web3-mpc-wallet.md)
* [流动性质押 - slisBNB](user-guide/liquid-staking-slisbnb/README.md)
  * [如何兑换 slisBNB](user-guide/liquid-staking-slisbnb/how-to-swap-for-slisbnb.md)
  * [铸造 slisBNB](user-guide/liquid-staking-slisbnb/mint-slisbnb.md)
  * [从 slisBNB 兑换 BNB](user-guide/liquid-staking-slisbnb/redeem-bnb-from-slisbnb.md)
  * [将 slisBNB 桥接到以太坊](user-guide/liquid-staking-slisbnb/bridging-slisbnb-to-ethereum.md)
* [使用币安 Web3 钱包](user-guide/using-binance-web3-wallet/README.md)
  * [将 BNB 流动性质押为 slisBNB](user-guide/using-binance-web3-wallet/liquid-staking-bnb-into-slisbnb.md)
  * [获取 lisUSD](user-guide/using-binance-web3-wallet/obtaining-lisusd.md)
  * [在 APX Finance 上交易](user-guide/using-binance-web3-wallet/trading-on-apx-finance.md)
* [LISTA / veLISTA](user-guide/lista-velista/README.md)
  * [锁定 LISTA](user-guide/lista-velista/lock-lista.md)
  * [延长 LISTA 锁定](user-guide/lista-velista/extend-lista-lock.md)
  * [自动锁定](user-guide/lista-velista/auto-lock.md)
  * [解锁 LISTA](user-guide/lista-velista/unlock-lista.md)
  * [领取奖励](user-guide/lista-velista/claim-rewards.md)
  * [在 Lista DAO 上质押外部 LP 代币](user-guide/lista-velista/staking-external-lp-tokens-on-lista-dao.md)
  * [Gauge 投票](user-guide/lista-velista/gauge-voting.md)

## 安全

* [审计报告](security/audit-reports.md)
* [Bug 赏金 (Immunefi)](security/bug-bounty-immunefi.md)

## 开发者

* [概述](for-developer/overview.md)
* [LISTA 治理](for-developer/lista-governance/README.md)
  * [智能合约](for-developer/lista-governance/smart-contract.md)
* [抵押债务头寸](for-developer/collateral-debt-position/README.md)
  * [机制](for-developer/collateral-debt-position/mechanics.md)
  * [闪电贷](for-developer/collateral-debt-position/flash-loan.md)
  * [多预言机](for-developer/collateral-debt-position/multi-oracle.md)
  * [智能合约](for-developer/collateral-debt-position/smart-contract.md)
* [流动性质押(slisBNB)](for-developer/liquid-staking-slisbnb/README.md)
  * [机制](for-developer/liquid-staking-slisbnb/mechanics.md)
  * [跨链桥](for-developer/liquid-staking-slisbnb/cross-chain-bridge.md)
  * [智能合约](for-developer/liquid-staking-slisbnb/smart-contract.md)
* [clisBNB](for-developer/clisbnb/README.md)
  * [智能合约](for-developer/clisbnb/smart-contract.md)

***

* [Lista 借贷](lista-lending/README.md)
  * [智能合约](lista-lending/smart-contract.md)

## 合作伙伴关系

* [品牌套件](partnerships/brand-kit.md)
* [我们的频道](partnerships/our-channels.md)

## 法律免责声明

* [法律免责声明](legal-disclaimer/legal-disclaimer.md)