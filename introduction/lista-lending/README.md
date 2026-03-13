# Lista Lending

<figure><img src="../../.gitbook/assets/image (61).png" alt=""><figcaption></figcaption></figure>

Lista Lending 是一个完全去中心化且无需许可的 P2P 借贷协议，专为 BNB Chain 设计，突破传统大型借贷池的限制，培育更包容和弹性的生态系统。

Lista Lending 的核心围绕一个基于金库的系统，汇集流动性并根据供需动态分配到不同的借贷和抵押对，我们称之为市场。

## 关键概念

### 抵押

借款人必须将支持的加密资产作为抵押物存入其选择的市场，以解锁与市场中抵押物价值成比例的借款能力。

### 借款

借款人指定他们希望从市场借入的资产数量并提供所需的抵押物。他们的贷款和抵押物的价值比例用贷款价值比（LTV）表示。当这个比率过高——通常是由于价格波动和/或利息累积，将触发清算，借款人可能会失去部分或全部抵押物。

### 利率

借款人按照商定的利率支付利息。利息随时间累积，并应在还款时支付。更多关于我们的利率模型，请阅读这里：[https://docs.bsc.lista.org/introduction/lista-lending/interest-rate-model-irm](https://docs.bsc.lista.org/introduction/lista-lending/interest-rate-model-irm)

### 还款

借款人可以随时归还贷款本金和利息，并在交易确认后取回抵押物。

### 清算贷款价值比（LLTV）

清算贷款价值比，或 LLTV 比率，是各个市场设定的预设阈值，用以保护贷款人。当贷款的 LTV 接近其对应的 LLTV 时，抵押物被视为不足，借款人面临被清算的风险。这时将触发清算。

### 清算机制

每当触发清算时，Lista 的智能合约将接管部分头寸，并尝试将其换成相应的债务资产并覆盖贷款。当 Lista 的智能合约无法完成清算过程并偿还贷款时，该头寸将被列在 Lista 的[清算区](https://lista.org/lending/liquidation)中，供所有人购买。Lista 清算区中列出的头寸将以折扣价出售以鼓励接管。更多关于我们的清算机制，请阅读这里：[https://docs.bsc.lista.org/introduction/lista-lending/liquidation](https://docs.bsc.lista.org/introduction/lista-lending/liquidation)

### 出借

出借人（供应商）将一定数量的资产存入 Lista 的金库，智能合约将这些资产与借款人配对，并获得他们借款利息的一部分。

### 提款

出借人可以随时（根据市场流动性）提取他们存入的资产和利息。

借款人只有在提议的提款不会将 LTV 推高至 LLTV 以上时，才能部分或全部提取他们的抵押物。