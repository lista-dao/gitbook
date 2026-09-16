# 清算

在 Lista Lending，清算是一个重要的风险管理工具，通过确保借款人保持足够的抵押来保护贷方的资本。此机制允许在借款人的贷款价值比（LTV）超过市场的清算贷款价值比（LLTV）阈值时，对借款人的头寸进行全部或部分清算，从而在支持其以金库为中心的无许可借贷模型的同时，确保市场稳定。

### 理解贷款价值比（LTV）

贷款价值比（LTV）是您的贷款价值与抵押品价值之间的比率。通过比较债务与抵押品价值，它是评估头寸风险的关键指标。

**如何计算 LTV**

$$
LTV = \frac{Loan\ Asset\ Amount}{Collateral\ Asset\ Amount\times \frac{Oracle\ Price}{Oracle\ Price\ Scale}}\times100\%
$$

其中：

Oracle Price 表示抵押资产和贷款资产价格之间的比率。

Oracle Price Scale 是 $$10^{36}$$，用于价格归一化。

示例：

在 Lista 的 BNB/USDT 市场中，如果您存入 1 BNB 并借出 500 USDT。

在某个时间点，Lista 从预言机获取的 BNB/USDT 价格是 $$8\times10^{38}$$。将此数字除以 $$10^{36}$$，我们将得到 BNB 的归一化价格：800 USDT。

然后该贷款的 LTV 是 $$\frac{500}{800}\times 100\% = 62.5\%$$

### 标准清算

标准清算是 Lista Lending 防止借款人违约的主要防线，嵌入在协议的核心合约中。每个市场都有其自己的清算贷款价值比（LLTV），这是一个用于触发清算的任意数值。

#### **何时头寸可被清算？**

当头寸的 LTV 超过其对应市场的 LLTV 时，该头寸即变得可被清算。

这可能由于以下原因发生：

* 抵押品价值下降（例如，BTCB 价格下跌）。
* 由于累积利息导致的债务增加。
* 两者的结合。

#### **清算如何运作**

当清算被触发时，任何外部方都可以偿还借款人的部分或全部债务并成为清算人，获得等值的抵押品加上由清算激励因子（LIF）决定的奖金。

LIF 因市场而异，由市场的 LLTV 决定：

$$
LIF=min(M,\ \frac{1}{\beta\times LLTV+(1-\beta)})
$$

其中：

* $$\beta$$ 是一个常数，0.3。
* $$M$$ 是最大激励因子，1.15。

当市场的 LLTV 为 80% 时，LIF ≈ 1.06（6% 奖金）。目前，Lista DAO 设置的最低 LIF 为 1.048。

为了激励及时清算，所有 LIF 奖金都归清算人所有；Lista 不收取费用。

#### **逐步示例**

假设您存入 100 USDT 并借出 91.5 USD1。该市场的 LLTV 为 91.5%。

您的 LTV 是 $$91.5/100 = 91.5\%$$，因此一旦利息开始累积，您的 LTV 将超过 LLTV。清算将被触发，清算人将介入偿还债务。（这也是为什么我们不建议借款接近 LLTV）

现在，清算人可以部分或全部偿还此贷款，并根据 LIF 获得部分抵押品加上奖金。对于 LLTV 为 91.5% 的市场，LIF 为：

$$
LIF=min(M,\ \frac{1}{\beta\times 0.915+(1-\beta)})=1.026
$$

这小于最低 LIF，1.048，因此 $$LIF=1.048$$。

这意味着将扣押一定数量的抵押品：

$$
Seized\ Collateral\ Value = Outstanding\ Loan\ Value\times LIF
$$

未偿还贷款为 91.5 USD1（加上少量利息）。如果预言机规定 1 USD1 = 1 USDT，则扣押的抵押品数量为：

$$
91.5\times LIF = 91.5\times 1.048 = 95.892\ USDT
$$

如果贷款全额偿还，这意味着清算人支付 91.5 USD1 加上少量利息，他们将收到略多于 95.892 USDT。他们的利润是：$$95.892\ USDT-91.5\ USD1\approx$4.392$$ 减去燃气费。

### 延迟清算

在 [LIP-024](https://snapshot.org/#/s:listavote.eth/proposal/0x1a15347f6b452049212bdf51ff1a46c0a7edf7ca8efe1004b32c15c2965f0f3b) 批准后，延迟清算在选定市场中推出，作为 LISTA 持有者的首个福利。

通常，当头寸的 LTV 超过其在 Lista 的 LLTV 时，将触发清算。通过延迟清算，符合条件的借款人将在选定市场中获得一个缓冲——一个更高的新 LLTV 阈值，以保护您的头寸 24 小时：

<table data-header-hidden><thead><tr><th width="95.890625"></th><th width="80.01953125"></th><th width="125.59375"></th><th width="113.46875"></th><th></th></tr></thead><tbody><tr><td>Collateral</td><td>Loan</td><td>Original LLTV</td><td>New LLTV</td><td>Market Hash</td></tr><tr><td>BTCB</td><td>U</td><td>86%</td><td>92%</td><td>0x6ef28e9f52ffd5e66b14ba95f3da17b782ce8c4a592218fa32f917ca10f4f054</td></tr><tr><td>BTCB</td><td>USD1</td><td>86%</td><td>92%</td><td>0x8de2e1f3e3935024a2667d8203983bdff70a1aee0c91665760e02c257d53032f</td></tr><tr><td>BTCB</td><td>USDT</td><td>80%</td><td>92%</td><td>0xea00a233473bc0585326eec959623a054798b7543205c5079bab49015a2bf810</td></tr><tr><td>slisBNB</td><td>BNB</td><td>96.5%</td><td>97%</td><td>0x2bb68bc7f70186f3d4f16db6a19986df6c6cdea3e589c1ae3d30b56b0632c5ec</td></tr><tr><td>slisBNB</td><td>lisUSD</td><td>85%</td><td>92%</td><td>0x7fe248d8459a88e50e8582c71219edbce1079437e58190aeab41ac503694f0a5</td></tr><tr><td>slisBNB</td><td>USD1</td><td>86%</td><td>92%</td><td>0x95f93825819b67a64610e6adb9ac5f70d5108f5121b9df6551e23a4a7a801b5b</td></tr><tr><td>slisBNB</td><td>U</td><td>86%</td><td>92%</td><td>0xaaf06d7c7fd32ac1b478bdf6f068d707ea32982f299b684ef79b1023a51ad3db</td></tr><tr><td>slisBNB</td><td>BNB</td><td>96.5%</td><td>97%</td><td>0x226935103b730aefad53849e4cf7d92f30083cc417222f395478dabdd9ff3cac</td></tr><tr><td>USD1</td><td>BNB</td><td>80%</td><td>92%</td><td>0xd384584abf6504425c9873f34a63372625d46cd1f2e79aeedc77475cacaca922</td></tr><tr><td>USD1</td><td>U</td><td>96.5%</td><td>97%</td><td>0x17230b8678f7efac75e99f4d9db9b2e5e74aabc1f34156b574b676a8e4e8e6f1</td></tr><tr><td>USDT</td><td>BNB</td><td>85%</td><td>92%</td><td>0xf4859576d776ccbc5c7848228da8edd47902d351b1195787742bf5a2927dfe8c</td></tr></tbody></table>

对于这些市场，受保护头寸的总规模取决于 7 天平均 LISTA 持有量：

<table data-header-hidden><thead><tr><th width="92.8984375"></th><th></th><th></th></tr></thead><tbody><tr><td>Tier</td><td>7-day Weighted Average LISTA Holding</td><td>Total Protected Position Size</td></tr><tr><td>1</td><td>≥ 10,000 LISTA</td><td>≤ $10,000</td></tr><tr><td>2</td><td>≥ 50,000 LISTA</td><td>≤ $50,000</td></tr><tr><td>3</td><td>≥ 200,000 LISTA</td><td>≤ $200,000</td></tr><tr><td>4</td><td>≥ 1,000,000 LISTA</td><td>≤ $1,000,000</td></tr><tr><td>5</td><td>≥ 5,000,000 LISTA</td><td>≤ $10,000,000</td></tr><tr><td>6</td><td>≥ 15,000,000 LISTA</td><td>≤ $50,000,000</td></tr></tbody></table>

通过延迟清算，符合条件的借款人的头寸将处于以下状态之一：

* **Guarded**: LTV 低于原始 LLTV。头寸健康，并在市场对您不利时预先获得保护资格。
* **Protected**: LTV 介于原始 LLTV 和新 LLTV 之间。24 小时宽限期开始。考虑偿还贷款或增加抵押品以降低其 LTV。
* **Out of Guard**: 延迟清算未激活，可能是由于 $LISTA 持有量不足或在其 LTV 超过原始 LLTV 时剩余的等级容量已耗尽。将触发清算。

受保护的头寸将有 24 小时的时间偿还或增加更多抵押品以降低其 LTV。如果在 24 小时后，LTV 仍高于原始 LLTV 阈值，清算将照常触发。

如果头寸的 LTV 超过原始 LLTV，但其规模超过剩余的等级容量，仍将触发部分或全部清算。在进行 1 次或多次清算后，如果所有待清算头寸的总规模低于最大保护规模，这些头寸将再次受到保护。

### 智能借贷清算

在智能借贷中的清算运作类似，但抵押品的价值计算略有不同。有关更多详细信息，请参阅[本文](https://blog.lista.org/everything-you-need-to-know-about-liquidation-on-lista-smart-lending)。