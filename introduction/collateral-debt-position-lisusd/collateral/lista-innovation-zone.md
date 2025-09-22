# Lista 创新区

Lista 创新区是 Lista DAO 的一项新举措，旨在通过将新的 Liquid Restaking Tokens (LRTs) 和 Liquid Staking Derivatives (LSDs) 列为借入 lisUSD 的潜在抵押选项，将它们整合到我们的生态系统中。此举反映了我们对跟上加密货币和 DeFi 领域快速创新的承诺，确保 Lista 在采纳新技术和资产类别方面不落后。

然而，我们也意识到这些新资产可能带来的增加的风险，这可能会影响 Lista 平台的稳定性和安全性。因此，在 Lista 创新区列出的资产将受到更严格的安全检查，并需要更高的抵押比例要求。

以下是 Lista 创新区下的资产列表：

* USD1 (World Liberty Finance)
* solvBTC (Solv Protocol)
* SolvBTC.BNN (Babylon)
* Stone (Stakestone)
* sUSDX (Stables Labs)
* pumpBTC (PumpBTC)
* mBTC (Magpie)
* mCAKE (Magpie)
* mwBETH (EigenPie)
* USDF (Astherus)
* asUSDF (Astherus)

### Pancake Swap LP 抵押

用户还可以利用他们的 PancakeSwap LP 位置在我们的创新区借入 lisUSD，同时保持对收益机会的曝光。

在第一阶段，将支持以下 LP 对：

* USDT/WBNB V3 5bp
* USDT/USDC V3

#### 集成的关键特性 <a href="#id-6149" id="id-6149"></a>

**支持的 LP 代币**：集成支持 PancakeSwap 的 V2、V3、Infinity 和 StableSwap LP 代币，从第一阶段开始，首先支持持有最高总价值锁定 (TVL) 的代币，计划逐步扩展。

**抵押估值**：由于 LP 代币没有直接的市场定价，我们的自定义 LP Oracle 和 LP 管理系统将提供 LP 代币的准确估值，并内置安全因素以减轻抵押不足和清算风险。

**风险管理**：为了保护协议，我们实施了以下风险管理措施：

1. 在使用 LP Oracle 和 LP 管理器进行 LP 价格计算时采用保守的安全因素。这意味着我们将有
2. 每种 LP 类型的借款上限，以及在主要代币（BTC、ETH、BNB）在 10 分钟内价格下跌超过 5% 时暂停借款的断路器。

**清算过程**：如果抵押价值低于贷款价值比 (LTV) 阈值，我们的系统支持在触发荷兰式拍卖前赎回 LP，最大化用户的恢复价值。

**利润分享**：为了加强与 PancakeSwap 的合作关系，从 lisUSD 借款和清算费用中产生的 50% 利息将与 PancakeSwap 分享，促进双方增长和生态系统利益。

#### 示例 <a href="#id-8ec5" id="id-8ec5"></a>

这里有一个视频示例，展示用户如何在我们的 CDP 区使用 Pancake swap LP 代币借入 lisUSD。在这个示例中，我们将使用 USDT/USDC V3 LP 代币作为示例。

{% embed url="https://www.loom.com/share/96cac51ad21f497a9edaa9d2506b07ce" %}