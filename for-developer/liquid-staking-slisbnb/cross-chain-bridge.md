# 跨链桥

跨链转移机制使用户能够在不同的区块链网络之间无缝转移代币。该过程涉及在源链上锁定代币，通过去中心化网络验证交易，并在目的链上铸造代币。

关键组件包括 ListaOFTAdapter、ListaOFT 合约、LayerZero 端点以及如 Lista Guardian、去中心化验证网络（DVN）和执行器等链下服务。这些组件共同工作，以确保跨链转移的安全、可靠和高效。

**1. 主要合约结构**

* ListaOFTAdapter
  * 转移限制器：执行转移限制以管理流动性，防止垃圾邮件，并确保遵守转移政策。
  * 紧急开关：在首次出现问题时停止所有交易，提供一个迅速的措施以避免潜在的危机。
  * 代币锁定器：在从 BSC 到 Ethereum 转移时锁定代币，在从 Ethereum 到 BSC 转移时解锁代币。
* LayerZero
  * LayerZero 端点：使用 MessageLib 库促进跨链通信。
* ListaOFT
  * 转移限制器：与 ListaOFTAdapter 中的类似，确保接收端的转移控制。
  * 紧急开关：与 ListaOFTAdapter 中的类似，提供紧急停止能力。

**2. 链下服务**

* Lista Guardian
  * 一个连续监控跨链桥的链下服务
  * 在任何紧急情况出现时停止所有跨链交易
* LayerZero
  * 去中心化验证网络（DVN）
    * 验证：一个去中心化节点网络，在执行前验证跨链交易以确保其有效性并防止欺诈活动。
  * 执行器
    * 交易执行：提交 DVN 的验证结果并执行 lzReceive() 方法以在目的链上处理交易。

**3. 跨链交互流程**

从 BSC 到 Ethereum：

1. 用户 A 发起转移，发送请求并附带 X 数量的代币。
2. ListaOFTAdapter 处理请求，应用转移限制器和紧急开关检查。
3. ListaOFTAdapter 锁定 X 数量的代币。
4. 请求被发送到 BSC 上的 LayerZero 端点。
5. 消息通过去中心化验证网络（DVN）广播并验证。
6. 验证后，执行器在 Ethereum 上的 LayerZero 端点调用 lzReceive()。
7. Ethereum 上的 LayerZero 端点将请求转发给 ListaOFT 合约。
8. ListaOFT 在 Ethereum 上为用户 A 的地址铸造等量的代币。

从 Ethereum 到 BSC 对于用户 B：

1. 用户 B 发起转移，附带 Y 数量的代币。
2. ListaOFT 处理请求，应用转移限制器和紧急开关检查。
3. ListaOFT 销毁 Y 数量的代币。
4. 请求被发送到 Ethereum 上的 LayerZero 端点。
5. 消息通过与用户 A 相同的 DVN 和执行器路径。
6. 验证后，执行器在 BSC 上的 LayerZero 端点调用 lzReceive()。
7. BSC 上的 LayerZero 端点将请求转发给 ListaOFTAdapter 合约。
8. ListaOFTAdapter 为用户 B 的地址在 BSC 上解锁等量的代币。

**4. 安全措施**

* 转移限制器：通过执行严格的转移限制来确保适当的流动性管理并防止恶意转移。
* 紧急开关：在首次出现问题时作为关键的安全措施停止所有交易，防止任何未经授权的代币铸造。两个紧急开关都由 Lista Guardian 控制，当检测到异常时，它可以通过在两条链上启动紧急开关来停止交易。
* Lista Guardian：
  * 紧急开关：一个在紧急情况下可以通过在两条链上启动紧急开关来停止交易的链下服务。
  * 持续对账：通过全线对账过程确保链间的代币供应准确无误。
  * 大额转移警报：监控异常大的转移以检测和缓解潜在攻击。