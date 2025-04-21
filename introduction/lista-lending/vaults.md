# 金库

Lista Vault支持单一贷款资产，并将存入资金分配到多个Lista市场。通过向金库存款，用户可以从借款人支付的利息中赚取被动收益。

金库整合了自动化风险管理，动态调整所有存入资产的风险敞口，免除用户自行管理这些因素的需要。用户保留对其资金的完全控制权，可以随时监控金库的状态，并在选择时随时提取其流动性。

任何用户都可以作为供应商存入金库，以赚取来自借款人利息支付的被动收益。

主要特点：

1. 金库简化了跨借贷市场管理头寸的过程
2. 专门的策展人管理每个Lista金库，以保护金库存款人的安全。
3. 存款或提款没有锁定期
4. 所有金库操作都在链上，并通过策展人访问进行管理，以确保明确的监督和风险控制。

### 默认参数

* 贷款价值比率（LTV）
  * 限于以下固定选项：
    * LTV（贷款至价值比率）基于抵押品的质量确定。
    * 在Lista借贷的第一阶段，由于我们的抵押品质量相对较高，LTV比率设定为80%。
    * 对于ptclisBNB 0427，由于其到期日临近，我们也分配了非常高的LTV
    * 不允许自定义比率

* 利率模型（IRM）
  * 只有一种IRM利率设定方法可用（AdaptiveCurveIRM）
* 费用
  * 由Lista DAO确定；金库不能独立修改此费用。

### 核心规则

#### 1. 预言机

Lista借贷将利用一篮子不同的预言机及备份，以确保通过预言机定价大大减少风险价格操纵

* 首次支持：
  * Chainlink（主预言机）
  * Binance Oracle（检查预言机）
  * Redstone（备份预言机）

#### 2. 金库所有者

* 可决定将资金投资于哪些市场。
* 默认情况下，存款人将风险管理委托给金库所有者，后者拥有完全控制权。
* 金库所有者将对存入金库的资产发生的事情负全部责任。

#### 3. 自定义坏账处理

坏账可以分期摊销（分散，逐渐减少）或手动处理。

#### 4. 账户管理功能

通过传统函数调用或基于[EIP-712](https://eips.ethereum.org/EIPS/eip-712)标准的消息签名操作。

#### 5. 时间锁

金库所有者可以选择设置时间锁，以管理关键参数更改和风险管理流程。

#### 6. 金库费用

金库可以独立收取费用，最高可达其生成利润的50%，具体用途由金库所有者决定。

#### 7. 分配者

金库可以指定分配者或策展人角色，负责在各个市场战略性地分配流动性。

—------------------—------------------—------------------—------------------—------------------—---------------

### 创建金库指南

#### 概述

Lista借贷在BNB链上启用无需许可的借贷金库创建，允许策展人部署自定义流动性池，以优化收益并管理风险。Lista金库接受单一贷款资产（例如，lisUSD）并将存款分配到多个Lista市场。本指南将引导您部署和配置金库，使您能够在Lista DAO生态系统内策划借贷机会。

金库是可升级的智能合约，提供灵活性以适应市场需求，同时保持非托管安全性。策展人可以设置分配策略、费用和风险参数，使Lista借贷成为量身定制的DeFi解决方案的强大工具。

#### 先决条件

在创建Lista金库之前，请确保您具备以下条件：

* BNB链钱包：配置了BNB链的钱包（例如，MetaMask），并有足够的BNB支付燃气费。
* 开发环境：具备Solidity开发设置（例如，Hardhat, Foundry）和已安装的Node.js。
* 贷款资产：将用作金库贷款资产的ERC-20代币（例如，lisUSD, BNB）。
* 市场知识：熟悉Lista借贷市场（贷款/抵押品对），以有效分配流动性。
* 预言机选择：Chainlink（主要），Binance Oracle（比较），Redstone（备份）用于价格提要。

***

#### 步骤1：定义金库参数

部署金库时，请指定以下参数：

1. 贷款资产：用户将存入和借出的单一资产（例如，lisUSD）。
2. 初始市场：最初分配流动性的Lista市场列表（例如，pt-clisBNB/lisUSD）。
3. LLTV选项：固定清算贷款至价值比率为80%
4. 预言机：Chainlink（主要），Binance Oracle（比较），Redstone（备份）用于市场价格数据。
5. 费用结构：
   * 协议费用：由Lista DAO设置（借款利息的0-25%）。
   * 金库费用：可选的策展人费用，最高可达金库利润的50%。
6. 时间锁：可选的参数更改延迟（例如，24小时）
7. 角色：
   * 所有者：您，部署者，监督金库策略。
   * 策展人：可选角色，用于设置上限和其他重要参数（最初可以是所有者）。
   * 监护人：可选的风险监督角色（例如，暂停操作）。
   * 分配者：分配金库市场的角色

#### 步骤2：部署金库 步骤2.1：准备参数

#### 部署前，您需要准备以下参数：

* #### 管理者：管理者地址（必须是时间锁合约），这将与所有者角色相同
* #### 资产：资产地址
* #### 名称：金库的名称，主要用于显示和识别目的
* #### 符号：金库的缩写或股票代码。
* #### 这个符号是表示金库的简短方式，通常用于界面和列表中。
* #### 策展人：策展人地址（必须是时间锁合约）
* #### 分配者：分配者地址（不需要是时间锁合约）

#### 所有这些参数需要值（在您的参考图像中标记为“TODO”）。

### 步骤2.2：克隆存储库

#### 导航到Moolah存储库的特定分支：

#### git clone https://github.com/lista-dao/moolah.git

#### cd moolah

#### git checkout feature/deployScripts

### 步骤2.3 填写参数

![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXeGvAXo0gAEzsaOkYxIK1Dm0adyqL92MlzaInn7f_XazsyW77r5QT_wQ8-GtQveOJTqVSYH-KlSPAYdi4fZhWk-VnzBb-xITBSokRxl-WtoMxzaUG-kI7HXHMSrmNUu9BO32ITa?key=ZbB0Bdp_i9xaaxZIxmtWD2y_)

### 步骤2.4：执行部署脚本

#### 运行以下命令将金库合约部署到BSC网络：

#### forge script script/deploy\_moolahVault.sol --rpc-url bsc --broadcast --verify -vvv

#### 这个命令将：

* #### 执行部署脚本
* #### 连接到BSC网络
* #### 广播交易以部署合约
* #### 在区块链浏览器上验证合约
* #### 提供详细日志的详细输出（-vvv）

#### 确保您的钱包中有足够的资金支付燃气费，并且您的环境已正确配置Foundry。

\


#### 步骤3：配置金库

### 这里是您可以用来配置金库的方法。

### 1. 设置费用

角色：MANAGER\
方法：setFee\
参数：

* newFee (uint256): 新的费用值，精度为1e18。\
  \


***

### 2. 设置费用接收者

角色：MANAGER\
方法：setFeeRecipient\
参数：

* newFeeRecipient (address): 将接收收集费用的地址。\
  \


***

### 3. 设置Skim接收者

角色：MANAGER\
方法：setSkimRecipient\
参数：

* newSkimRecipient (address): 将接收错误转移代币的地址。\
  \


***

### 4. 设置市场供应上限

角色：CURATOR\
方法：setCap\
参数：

* loanToken (address): 市场的贷款代币。
* collateralToken (address): 市场的抵押代币。
* oracle (address): 市场的价格预言机。
* irm (address): 利率模型。
* lltv (uint256): 贷款至价值阈值。
* newSupplyCap (uint256): 指定市场的最大存款上限。\


注意：这些参数应与创建市场时使用的配置相匹配。

***

### 5. 设置存款队列

角色：ALLOCATOR\
方法：setSupplyQueue\
参数：

* newSupplyQueue (bytes32\[]): 定义存款顺序的marketIds数组。存款将按指定顺序路由到市场。\
  \


***

### 6. 更新提款队列

角色：ALLOCATOR\
方法：updateWithdrawQueue\
参数：

* indexes (uint256\[]): 重排序现有提款队列的索引数组。\
  \


注意：索引指的是当前提款队列中的位置。

***

### 7. 设置市场移除

角色：CURATOR\
方法：setMarketRemoval\
参数：

* loanToken (address)
* collateralToken (address)
* oracle (address)
* irm (address)
* lltv (uint256)\


注意：这标志着市场将被移除。只有在金库在该市场的位置为零且调用了updateWithdrawQueue函数后，市场才会被移除。

***

### 8. 角色管理

#### 8.1 授予角色

角色：ADMIN或MANAGER\
方法：grantRole\
参数：

* role (bytes32): 角色标识符。
* account (address): 要分配角色的地址。\


#### 8.2 撤销角色

角色：ADMIN或MANAGER\
方法：revokeRole\
参数：

* role (bytes32): 角色标识符。
* account (address): 要移除角色的地址。



#### 步骤4：部署时间锁

### 步骤4.1：准备参数

首先，您需要准备三个关键地址参数：

* proposer address: 将创建交易的地址
* executor address: 将执行交易的地址
* canceller address: 将取消交易的地址

在开始部署之前，请确保您已决定使用这三个地址。您应该在表格中填写实际要使用的地址。

### 步骤4.2：部署时间锁合约

导航到[https://github.com/lista-dao/moolah](https://github.com/lista-dao/moolah)的存储库，并切换到feature/deployScripts分支。

步骤4.3 填写参数

![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXcWIqKdLYE030gQ7c8ycJepyI9iJaILG5K-CrdqY-_84AUR40c4GD66fl63cfvc53-b8d4K1FgjUGqAM_oGfq1U2xRzuCCpO2zHisDLaxhp_Www77LcdH86uKidjyysTdsSc3JI?key=ZbB0Bdp_i9xaaxZIxmtWD2y_)

运行以下命令部署时间锁合约：

forge script script/deploy\_timeLock.sol --rpc-url bsc -vvv --broadcast --verify

这个命令将：

* 执行时间锁合约的部署脚本
* 连接到BSC网络
* 提供详细输出（-vvv）
* 广播交易到网络
* 在BSC Scan上验证合约

确保您的部署钱包中有足够的资金支付燃气费，并且您已正确配置了用于网络和验证服务的环境变量。

\


#### 步骤5：验证和激活



1. 在BscScan上验证
   * 将您的金库合约代码提交给BscScan，以确保透明度（使用已部署的地址）。
2. 测试存款
   * 存入少量的贷款资产（例如，10 lisUSD）以确保金库功能正常。
   * 通过Lista借贷界面检查分配和APY。
3. 正式启动
   * 向社区（例如，Lista DAO Discord）宣布您的金库，以吸引存款人。

#### 部署后管理

* 监控性能：通过Lista借贷仪表板跟踪APY和市场条件。
* 重新平衡流动性：根据需要使用分配者角色调整分配。
* 如有必要，进行升级：利用可升级设计修改参数或添加功能（需要所有者权限）。
* 处理坏账：根据金库设置手动结算或分配未实现的坏账。