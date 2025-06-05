# LISTA (LIP-016) 永久锁定

变更概览

Lista DAO 已成功通过 [LIP-016](https://snapshot.box/#/s:listavote.eth/proposal/0x8de005cbdcdc084942bfbff5a39577d1f88403dcea1e650d71b6a5a358c41888) 提案，引入一种永久的代币锁定机制，增强了 LISTA 的通缩特性。此更新取代了之前的再分配模型，通过将 LISTA 代币永久锁定在一个新的、无法检索的合约地址中，有效地将它们从流通中移除。

此战略转变旨在：

* 随时间减少 LISTA 的流通供应量。
* 增强长期价值增值。
* 通过实施持续的通缩模型，与生态系统的可持续性保持一致。

#### 机制

* 每周收入的 40% 将继续用于从公开市场购买 LISTA。
* 代币将不再锁定在 veLISTA 中，而是发送到一个永久冻结地址。
* 该地址中的 LISTA 代币无法被提取、转移或以任何方式使用。

### 冻结地址详情

新的冻结合约确保所有发送到该地址的 LISTA 代币被永久移除流通，加强了协议的通缩模型。

冻结地址：0x000000000000000000000000000000000000dEaD&#x20;

在 BSCScan 上查看：[https://bscscan.com/address/0xE4153Eb04417bE05b8d6B2222E4Cdd8AE674ee76](https://bscscan.com/address/0xE4153Eb04417bE05b8d6B2222E4Cdd8AE674ee76)