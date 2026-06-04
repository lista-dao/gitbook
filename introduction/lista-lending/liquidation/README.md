# 清算

Lista Lending 的清算是一种重要的风险管理工具，通过确保借款人保持足够的抵押品来保护贷款人的资本。这种机制使得当借款人的贷款价值比（LTV）超过市场的清算贷款价值比（LLTV）阈值时，可以全面或部分清算借款人的头寸，确保市场稳定，同时支持其以金库为中心的无许可借贷模式。

### 理解贷款价值比（LTV）比率

贷款价值比（LTV）是您的贷款价值与您的抵押品价值之间的比率。这是一个评估头寸风险的关键指标，通过比较债务与抵押品价值来进行评估。

**如何计算 LTV**

$$
LTV = \frac{Loan\ Asset\ Amount}{Collateral\ Asset\ Amount\times \frac{Oracle\ Price}{Oracle\ Price\ Scale}}\times100\%
$$

其中：

Oracle Price 是抵押资产与贷款资产价格之间的比率。

Oracle Price Scale 是 $$10^{36}$$，用于价格标准化。

示例：

在 Lista 的 BNB/USDT 市场，如果您存入 1 BNB 并借出 500 USDT。

在某个时刻，Lista 从预言机获取的 BNB/USDT 价格是 $$8\times10^{38}$$。将这个数字除以 $$10^{36}$$，我们将得到 BNB 的标准化价格：800 USDT。

那么这笔贷款的 LTV 是 $$\frac{500}{800}\times 100\% = 62.5\%$$

### 标准清算

标准清算是 Lista Lending 防止借款人违约的主要防御手段，嵌入在协议的核心合约中。每个市场都有自己的清算贷款价值比（LLTV），这是一个用作触发清算的任意数字。

#### **何时可以清算头寸？**

当头寸的 LTV 超过其相应市场的 LLTV 时，该头寸就可以被清算。

这可能是由于：

* 抵押品价值下降（例如，BTCB 价格下跌）。
* 由于累积的利息而增加的债务。
* 两者的结合。

#### **清算如何工作**

当触发清算时，任何外部方可以偿还部分或全部借款人的债务，并成为清算人，获得等值的抵押品加上由清算激励因子（LIF）确定的奖励。

LIF 根据市场的 LLTV 而有所不同：

$$
LIF=min(M,\ \frac{1}{\beta\times LLTV+(1-\beta)})
$$

其中：

* $$\beta$$ 是一个常数，0.3。
* $$M$$ 是最大激励因子，1.15。

当市场的 LLTV 为 80% 时，LIF ≈ 1.06（6% 奖励）。目前，Lista DAO 设置了最低 LIF 为 1.048。

为了激励及时清算，所有 LIF 奖励都归清算人所有；Lista 不收取费用。

#### **逐步示例**

假设您存入 100 USDT 并借出 91.5 USD1。这个市场的 LLTV 是 91.5%。

您的 LTV 是 $$91.5/100 = 91.5\%$$，因此一旦开始累积利息，您的 LTV 将超过 LLTV。将触发清算，清算人将介入偿还债务。（这也是为什么我们不建议借款接近 LLTV）

现在，清算人可以部分或全部偿还这笔贷款，并根据 LIF 获得一些抵押品加上奖励。对于这个市场，LLTV 为 91.5%，LIF 为：

$$
LIF=min(M,\ \frac{1}{\beta\times 0.915+(1-\beta)})=1.026
$$

这比最小 LIF，1.048 小，所以 $$LIF=1.048$$。

这意味着将没收一定数量的抵押品：

$$
Seized\ Collateral\ Value = Outstanding\ Loan\ Value\times LIF
$$

未偿还的贷款是 91.5 USD1（加上微不足道的利息）。如果预言机规定 1 USD1 = 1 USDT，那么没收的抵押品数量将是：

$$
91.5\times LIF = 91.5\times 1.048 = 95.892\ USDT
$$

如果贷款全部偿还，这意味着清算人支付 91.5 USD1 加上微不足道的利息，他们将获得略多于 95.892 USDT。他们的利润是：$$95.892\ USDT-91.5\ USD1\approx$4.392$$ 减去燃料费。

### 延迟清算

在 [LIP-024](https://snapshot.org/#/s:listavote.eth/proposal/0x1a15347f6b452049212bdf51ff1a46c0a7edf7ca8efe1004b32c15c2965f0f3b) 获得批准后，为选定市场推出了延迟清算，这是 LISTA 持有者的第一个好处。

通常情况下，当某个头寸的 LTV 超过其 LLTV 时，在 Lista 上会触发清算。通过延迟清算，符合条件的借款人将获得一个缓冲期 - 一个更高的新 LLTV 阈值，以保护您的头寸 24 小时，适用于选定市场：

<table data-header-hidden><thead><tr><th width="95.890625"></th><th width="80.01953125"></th><th width="125.59375"></th><th width="113.46875"></th><th></th></tr></thead><tbody><tr><td>抵押品</td><td>贷款</td><td>原始 LLTV</td><td>新 LLTV</td><td>市场哈希</td></tr><tr><td>BTCB</td><td>U</td><td>86%</td><td>92%</td><td>0x6ef28e9f52ffd5e66b14ba95f3da17b782ce8c4a592218fa32f917ca10f4f054</td></tr><tr><td>BTCB</td><td>USD1</td><td>86%</td><td>92%</td><td>0x8de2e1f3e3935024a2667d8203983bdff70a1aee0c91665760e02c257d53032f</td></tr><tr><td>BTCB</td><td>USDT</td><td>80%</td><td>92%</td><td>0xea00a233473bc0585326eec959623a054798b7543205c5079bab49015a2bf810</td></tr><tr><td>slisBNB</td><td>BNB</td><td>96.5%</td><td>97%</td><td>0x2bb68bc7f70186f3d4f16db6a19986df6c6cdea3e589c1ae3d30b56b0632c5ec</td></tr><tr><td>slisBNB</td><td>lisUSD</td><td>85%</td><td>92%</td><td>0x7fe248d8459a88e50e8582c71219edbce1079437e58190aeab41ac503694f0a5</td></tr><tr><td>slisBNB</td><td>USD1</td><td>86%</td><td>92%</td><td>0x95f93825819b67a64610e6adb9ac5f70d5108f5121b9df6551e23a4a7a801b5b</td></tr><tr><td>slisBNB</td><td>U</td><td>86%</td><td>92%</td><td>0xaaf06d7c7fd32ac1b478bdf6f068d707ea32982f299b684ef79b1023a51ad3db</td></tr><tr><td>slisBNB</td><td>BNB</td><td>96.5%</td><td>97%</td><td>0x226935103b730aefad53849e4cf7d92f30083cc417222f395478dabdd9ff3cac</td></tr><tr><td>USD1</td><td>BNB</td><td>80%</td><td>92%</td><td>0xd384584abf6504425c9873f34a63372625d46cd1f2e79aeedc77475cacaca922</td></tr><tr><td>USD1</td><td>U</td><td>96.5%</td><td>97%</td><td>0x17230b8678f7efac75e99f4d9db9b2e5e74aabc1f34156b574b676a8e4e8e6f1</td></tr><tr><td>USDT</td><td>BNB</td><td>85%</td><td>92%</td><td>0xf4859576d776ccbc5c7848228da8edd47902d351b1195787742bf5a2927dfe8c</td></tr><tr><td>ETH</td><td>lisUSD</td><td>80%</td><td>92%</td><td></td></tr><tr><td>wBETH</td><td>lisUSD</td><td>80%</td><td>92%</td><td></td></tr></tbody></table>

对于这些市场，受保护头寸的总规模取决于 7 天平均 LISTA 持有量：

<table data-header-hidden><thead><tr><th width="92.8984375"></th><th></th><th></th></tr></thead><tbody><tr><td>等级</td><td>7 天加权平均 LISTA 持有量</td><td>总受保护头寸规模</td></tr><tr><td>1</td><td>≥ 10,000 LISTA</td><td>≤ $10,000</td></tr><tr><td>2</td><td>≥ 50,000 LISTA</td><td>≤ $50,000</td></tr><tr><td>3</td><td>≥ 200,000 LISTA</td><td>≤ $200,000</td></tr><tr><td>4</td><td>≥ 1,000,000 LISTA</td><td>≤ $1,000,000</td></tr><tr><td>5</td><td>≥ 5,000,000 LISTA</td><td>≤ $10,000,000</td></tr><tr><td>6</td><td>≥ 15,000,000 LISTA</td><td>≤ $50,000,000</td></tr></tbody></table>

有了延迟清算，符合条件的借款人的头寸将处于以下状态之一：

* **受保护**：LTV 低于原始 LLTV。头寸健康并且在市场对您不利时预先有资格获得保护。
* **受保护**：LTV 在原始和新 LLTV 之间。开始 24 小时宽限期。考虑偿还您的贷款或增加抵押品以降低其 LTV。
* **超出保护范围**：由于 $LISTA 持有量不足或在其 LTV 跨越原始 LLTV 时剩余等级容量已耗尽，延迟清算未激活。将触发清算。

受保护的头寸将获得 24 小时的时间来偿还或增加更多抵押品以降低其 LTV。如果 24 小时后，LTV 仍高于原始 LLTV 阈值，将像往常一样触发清算。

如果某个头寸的 LTV 跨越了原始 LLTV，但其规模超过了剩余等级容量，则仍将触发部分或全部清算。在进行一次或多次清算后，如果所有待清算头寸的总规模低于最大受保护规模，这些头寸将再次受到保护。

### 智能借贷清算

智能借贷的清算工作方式类似，但计算抵押品价值的方式略有不同。有关更多详细信息，请参阅[此文章](https://blog.lista.org/everything-you-need-to-know-about-liquidation-on-lista-smart-lending)。