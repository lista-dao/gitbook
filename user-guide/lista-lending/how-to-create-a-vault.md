# 如何手动创建金库

Lista Lending 允许在 BNB Chain 上无需许可地创建借贷金库，使策展人能够部署自定义流动性池以优化收益并管理风险。Lista 金库接受单一贷款资产（例如，lisUSD）并将存款分配到多个 Lista 市场。本指南将指导您部署和配置金库的过程，使您能够在 Lista DAO 生态系统中策划借贷机会。

金库是可升级的智能合约，提供灵活性以适应市场需求，同时保持非托管安全性。策展人可以设置分配策略、费用和风险参数，使 Lista Lending 成为量身定制的 DeFi 解决方案的强大工具。

#### 先决条件

在创建 Lista 金库之前，请确保您具备以下条件：

* BNB Chain 钱包：配置了 BNB Chain 的钱包（例如，MetaMask），并有足够的 BNB 以支付燃气费。
* 开发环境：安装了 Node.js 的 Solidity 开发环境（例如，Hardhat, Foundry）。
* 贷款资产：将用作金库贷款资产的 ERC-20 代币（例如，lisUSD, BNB）。
* 市场知识：熟悉 Lista Lending 市场（贷款/抵押品对）以有效分配流动性。
* 选择 Oracle：Chainlink（主要）、Binance Oracle（比较）、Redstone（备份）用于价格提要。

## 创建金库 - 指南

### 步骤 1：定义金库参数

要部署金库，请指定以下参数：

1. 贷款资产：用户将存入和借出的单一资产（例如，lisUSD）。
2. 初始市场：最初分配流动性的 Lista 市场列表（例如，pt-clisBNB/lisUSD）。
3. LLTV 选项：固定清算贷款价值比率为 80%。
4. Oracle：Chainlink（主要）、Binance Oracle（比较）、Redstone（备份）用于市场的价格数据。
5. 费用结构：
   * 协议费：由 Lista DAO 设置（借款利息的 0-25%）。
   * 金库费：可选的策展人费用，最高可达金库利润的 50%。
6. 定时锁：参数更改的可选延迟（例如，24 小时）。
7. 角色：
   * 所有者：您，部署者，监督金库策略。
   * 策展人：可选角色，用于设置上限和其他重要参数（最初可以是所有者）。
   * 监护人：可选角色，用于风险监督（例如，暂停操作）。
   * 分配器：分配金库市场的角色。

***

### 步骤 2：部署金库

#### 步骤 2.1：准备参数

#### 部署前，您需要准备以下参数：

* #### manager：管理者地址（必须是定时锁合约），这将与所有者角色相同
* #### asset：资产地址
* #### name：金库的名称，主要用于显示和识别
* #### symbol：金库的缩写或股票代码。
* #### 这个符号是表示金库的更短方式，通常用于界面和列表中。
* #### curator：策展人地址（必须是定时锁合约）
* #### allocator：分配器地址（不需要是定时锁合约）

#### 所有这些参数都需要值（在您的参考图像中标记为“TODO”）。

#### 步骤 2.2：克隆存储库

#### 导航到 Moolah 存储库的特定分支：

#### `git clone https://github.com/lista-dao/moolah.git`

`cd moolah`

`git checkout feature/deployScripts`

#### 步骤 2.3 填写参数

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXeGvAXo0gAEzsaOkYxIK1Dm0adyqL92MlzaInn7f_XazsyW77r5QT_wQ8-GtQveOJTqVSYH-KlSPAYdi4fZhWk-VnzBb-xITBSokRxl-WtoMxzaUG-kI7HXHMSrmNUu9BO32ITa?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>

#### 步骤 2.4：执行部署脚本

运行以下命令将金库合约部署到 BSC 网络：

`forge script script/deploy_moolahVault.sol --rpc-url bsc --broadcast --verify -vvv`

此命令将：

* #### 执行部署脚本
* #### 连接到 BSC 网络
* #### 广播部署合约的交易
* #### 在区块链浏览器上验证合约
* #### 提供详细日志的详细输出（-vvv）

#### 确保您的钱包中有足够的资金来支付燃气费，并且您的环境已正确配置为 Foundry。

***

### 步骤 3：配置金库

以下是您可以用来配置金库的方法。

#### 3.1 设置费用

角色：`MANAGER`\
方法：`setFee`\
参数：

* `newFee (uint256)`: 新的费用值，精度为 1e18。

#### 3.2 设置费用接收者

角色：`MANAGER`\
方法：`setFeeRecipient`\
参数：

* `newFeeRecipient (address)`: 将接收收取费用的地址。

#### 3.3 设置 Skim 接收者

角色：`MANAGER`\
方法：`setSkimRecipient`\
参数：

* `newSkimRecipient (address)`: 将接收错误转移代币的地址。

#### 3.4 设置市场供应上限

角色：`CURATOR`\
方法：`setCap`\
参数：

* `loanToken (address)`: 市场的贷款代币。
* `collateralToken (address)`: 抵押代币。
* `oracle (address)`: 市场的价格 oracle。
* `irm (address)`: 利率模型。
* `lltv (uint256)`: 贷款价值比阈值。
* `newSupplyCap (uint256)`: 指定市场的最大存款上限。<br>

注意：这些参数应与创建市场时使用的配置相匹配。

#### 3.5 设置存款队列

角色：`ALLOCATOR`\
方法：`setSupplyQueue`\
参数：

* `newSupplyQueue (bytes32[])`: 定义存款顺序的 marketIds 数组。存款将按指定顺序路由到市场。

#### 3.6 更新取款队列

角色：`ALLOCATOR`\
方法：`updateWithdrawQueue`\
参数：

* `indexes (uint256[])`: 重新排序现有取款队列的索引数组。<br>

注意：索引指的是当前取款队列中的位置。

#### 3.7 设置市场移除

角色：`CURATOR`\
方法：`setMarketRemoval`\
参数：

* `loanToken (address)`
* `collateralToken (address)`
* `oracle (address)`
* `irm (address)`
* `lltv (uint256)`&#x20;

注意：这标志着市场的移除。只有在金库在该市场的位置为零且调用了 updateWithdrawQueue 函数后，市场才会被移除。

#### 3.8 角色管理

#### 3.8.1 授予角色

角色：`ADMIN` 或 `MANAGER`\
方法：`grantRole`\
参数：

* `role (bytes32)`: 角色标识符。
* `account (address)`: 要分配角色的地址。

#### 3.8.2 撤销角色

角色：`ADMIN` 或 `MANAGER`\
方法：`revokeRole`\
参数：

* `role (bytes32)`: 角色标识符。
* `account (address)`: 要移除角色的地址。

***

### 步骤 4：部署定时锁

#### 4.1：准备参数

首先，您需要准备三个关键的地址参数：

* 提议者地址：将创建交易的地址
* 执行者地址：将执行交易的地址
* 取消者地址：将取消交易的地址

在开始部署之前，请确保您已决定这三个地址。您应该在表格中填写您想要使用的实际地址。

#### 4.2：部署定时锁合约

导航到位于 [https://github.com/lista-dao/moolah](https://github.com/lista-dao/moolah) 的存储库并切换到 `feature/deployScripts` 分支。

#### 4.3：填写参数

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXcWIqKdLYE030gQ7c8ycJepyI9iJaILG5K-CrdqY-_84AUR40c4GD66fl63cfvc53-b8d4K1FgjUGqAM_oGfq1U2xRzuCCpO2zHisDLaxhp_Www77LcdH86uKidjyysTdsSc3JI?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>

运行以下命令部署定时锁合约：

`forge script script/deploy_timeLock.sol --rpc-url bsc -vvv --broadcast --verify`

此命令将：

* 执行定时锁合约的部署脚本
* 连接到 BSC 网络
* 提供详细输出（-vvv）
* 广播交易到网络
* 在 BSC Scan 上验证合约

确保您的部署钱包中有足够的资金来支付燃气费，并且您已正确配置环境变量以进行网络和验证服务的身份验证。

### 步骤 5：验证和激活

1. 在 BscScan 上验证
   * 将您的金库合约代码提交给 BscScan 以确保透明度（使用已部署的地址）。
2. 测试存款
   * 存入少量的贷款资产（例如，10 lisUSD）以确保金库功能正常。
   * 通过 Lista Lending 界面检查分配和 APY。
3. 正式上线
   * 向社区（例如，Lista DAO Discord）宣布您的金库以吸引存款人。

#### 部署后管理

* 监控性能：通过 Lista Lending 仪表板跟踪 APY 和市场条件。
* 重新平衡流动性：根据需要使用分配器角色调整分配。
* 如有必要，进行升级：利用可升级设计修改参数或添加功能（需要所有者权限）。
* 处理坏账：根据金库设置手动结算或分配未实现的坏账。