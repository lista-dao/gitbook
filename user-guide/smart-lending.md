# 智能借贷

以我们的slisBNB/BNB金库为例，假设我们借款USD1。在顶部导航栏中选择“Lending”下的“Smart Lending Zone”。或者，在[Lista的借贷页面](https://lista.org/lending/borrow?onlySmartLending=1&utm_source=gitbook&utm_medium=article&utm_campaign=smart-lending)上，切换“Smart Lending”并选择[此金库](https://lista.org/lending/smart-market/bsc/0x9ae45397a8063220d4cdb41ad9268d4c173dd18ca778171e9dee0644dfbe4cbd?tab=market&utm_source=gitbook&utm_medium=article&utm_campaign=smart-lending)。

<figure><img src="../.gitbook/assets/Smart Lending.png" alt=""><figcaption></figcaption></figure>

#### 提供抵押品并借款

1. 提供抵押品（slisBNB、BNB或两者兼有）：

您的资产将被存入Lista的DEX中的一个LP，您可以选择提供其中任何一个或两者的特定比例。

* 切换到Custom Ratio以任意比例提供slisBNB和/或BNB。Lista将在存入LP之前自动重新平衡。
* 切换到Fixed Ratio以与LP相同的比例提供slisBNB和BNB。如果存款风险使池子失衡超出其阈值（例如，一种资产过多），则Fixed Ratio将变为强制性，要求以与LP中完全相同的比例存入slisBNB和BNB以维持池子稳定。

![](<../.gitbook/assets/unknown (1).png>)![](<../.gitbook/assets/unknown (2).png>)

2. 设置您的滑点容忍度。然后输入您希望借款的USD1金额，点击“Supply & Borrow”，并批准并转移您的资产。成功存款后，您将收到您的贷款。
3. 您也可以只提供抵押品而不借款任何资产。这样，您将能够从这个金库中获得最大回报。记住，您随时可以回来并用您的抵押品进行借款。

![](<../.gitbook/assets/unknown (3).png>)

请注意，当您提供抵押品时，资产可能会通过DEX聚合器进行交换以满足请求。如果您以Custom Ratio提供资产并且您的滑点容忍度过低，Lista的智能合约可能无法进行交换，您的交易将失败。

#### 还款和提取

1. 首先，部分或全部还清您借的资产。可提取的抵押品数量取决于您未偿还的贷款。

![](<../.gitbook/assets/unknown (4).png>)

2. 选择以与LP中相同的比例或自定义比例提取两种资产，通过切换Fixed Ratio和Custom Ratio。点击“Repay & Withdraw”来还款并提取您的抵押品。

如果LP中的一种资产供应不足，即低于某个百分比阈值，提款将被限制为Fixed Ratio，或只能提取另一种资产。

![](<../.gitbook/assets/unknown (5).png>)![](<../.gitbook/assets/unknown (6).png>)

3. 您也可以只还款贷款并让您的抵押品继续产生利息。

请注意，当您提取时，资产可能会通过DEX聚合器进行交换以满足请求。

从技术上讲，您也可以通过Smart Lending交换资产，只需存入一种资产作为抵押品并只提取另一种资产而不借款。

#### 清算

当您在抵押品上借款时，请密切关注价格波动，因为每当您的LTV低于某个阈值时，Lista的清算过程将被触发，您的部分抵押品将被出售以偿还您的贷款。有关更多信息，请参阅我们的[清算文档](https://docs.bsc.lista.org/introduction/lista-lending/liquidation)。

\
<br>