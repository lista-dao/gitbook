# 概述

<div align="center" data-full-width="true">

<figure><img src="../.gitbook/assets/image (44).png" alt=""><figcaption></figcaption></figure>

</div>

### Lista 机制：通过策略性资产利用赚取奖励

在 Lista 机制中，用户可以策略性地利用他们的资产——如 BNB、ETH、slisBNB、wBETH 和 BTCB——来赚取各种奖励。这个过程涉及几个关键步骤：

#### 1. **将资产存入交互（CDP）模块**

* 用户首先将他们的资产存入交互（CDP）模块，这些资产作为抵押。
* 通过使用这些抵押，用户可以借用 **LisUSD**。

#### 2. **借用并质押 LisUSD**

* 借用 LisUSD 后，用户可以选择将其质押在 **Jar Contract** 中。
* 质押的金额和借用的 LisUSD 都由 **ListaDistributor Contract** 追踪，以计算奖励。

#### 3. **质押 BNB 以获得 slisBNB 并赚取奖励**

* 用户可以通过 **Stake Manager** 质押 BNB 来获得 **slisBNB**。
* slisBNB 不仅可以赚取每两周的 **LISTA 代币奖励**，而且还可以作为抵押借用更多的 LisUSD，从而产生额外的奖励。

#### 4. **直接 BNB 奖励**

* 用户也可以通过质押 BNB 直接赚取 BNB 奖励。

#### 5. **将 LISTA 代币锁定在 veLista 中以获得额外奖励**

* 通过将 LISTA 代币锁定在 **veLista 合约**中，用户有资格获得额外的 LISTA 代币奖励。

\