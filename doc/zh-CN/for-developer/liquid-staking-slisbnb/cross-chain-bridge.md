# 跨链桥

跨链传输机制使用户能够在不同的区块链网络之间无缝转移代币。该过程涉及在源链上锁定代币，通过去中心化网络验证交易，并在目标链上铸造代币。

关键组件包括 ListaOFTAdapter，ListaOFT 合约，LayerZero 端点，以及像 Lista Guardian，去中心化验证网络（DVN）和执行器这样的链下服务。这些组件共同确保了安全、可靠、高效的跨链转移。

**1. 主要合约结构**

* ListaOFTAdapter
  * 转账限制器：执行转账限制以管理流动性，防止垃圾邮件，并确保符合转账政策。
  * 紧急开关：在出现问题的第一时间停止所有交易，提供了一种避免潜在危机的尖锐措施。
  * 代币锁定器：在从 BSC 到 Ethereum 的转移中锁定代币，并在从 Ethereum 到 BSC 的转移中解锁代币。
* LayerZero
  * LayerZero 端点：使用 MessageLib 库促进跨链通信。
* ListaOFT
  * 转账限制器：与 ListaOFTAdapter 中的类似，确保在接收端控制转账。
  * 紧急开关：与 ListaOFTAdapter 中的类似，提供紧急停止能力。

**2. 链下服务**

* Lista Guardian
  * 一个连续监控跨链桥的链下服务
  * 在出现任何紧急情况时停止所有跨链交易
* LayerZero
  * 去中心化验证网络（DVN）
    * 验证：一个去中心化节点网络，在执行前验证跨链交易以确保其有效性并防止欺诈活动。
  * 执行器
    * 交易执行：提交 DVN 的验证结果，并执行 lzReceive() 方法在目标链上处理交易。

\
\

**3. 跨链交互流程**

<div data-full-width="true">

<figure><img src="../../.gitbook/assets/image (8).png" alt=""><figcaption></figcaption></figure>

</div>

从 BSC 到 Ethereum：

1. 用户 A 通过发送请求，转移 X 数量的代币。
2. ListaOFTAdapter 处理请求，应用转账限制器和紧急开关检查。
3. ListaOFTAdapter 锁定 X 数量的代币。
4. 请求发送到 BSC 上的 LayerZero 端点。
5. 该消息由去中心化验证网络（DVN）广播并验证。
6. 验证后，执行器在 Ethereum 上的 LayerZero 端点上调用 lzReceive()。
7. Ethereum 上的 LayerZero 端点将请求转发到 ListaOFT 合约。
8. ListaOFT 在 Ethereum 上为用户 A 的地址铸造等量的代币。

从 Ethereum 到 BSC 的用户 B：

1. 用户 B 发起转移 Y 数量的代币。
2. ListaOFT 处理请求，应用转账限制器和紧急开关检查。
3. ListaOFT 销毁 Y 数量的代币。
4. 请求发送到 Ethereum 上的 LayerZero 端点。
5. 消息通过 DVN 和执行器，如用户 A 所述的路径。
6. 验证后，执行器在 BSC 上的 LayerZero 端点上调用 lzReceive()。
7. BSC 上的 LayerZero 端点将请求转发到 ListaOFTAdapter 合约。
8. ListaOFTAdapter 解锁等量的代币到 BSC 上的用户 B 的地址。

**4. 安全措施**

* 转账限制器：通过执行严格的转账限制，确保适当的流动性管理并防止恶意转账。
* 紧急开关：作为一个关键的安全防护，能在出现问题的第一时间停止所有交易，防止任何未经授权的代币铸造。两个紧急开关都由 Lista Guardian 控制，当检测到异常时，可以通过在两条链上打开紧急开关来停止交易。
* Lista Guardian: 
  * 紧急开关：一个在紧急情况下可以通过在两条链上打开紧急开关来停止交易的链下服务。
  * 持续对账：通过全线对账过程，确保跨链的代币供应准确。
  * 大额转账警报：监控异常大的转账以检测和减轻潜在的攻击。