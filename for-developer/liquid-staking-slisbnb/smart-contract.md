# 智能合约

slisBNB 是 Lista 的 BNB 的收益型流动质押代币。BNB 通过 `ListaStakeManager` 进行质押，该管理器通过原生 StakeHub 系统合约委托给 BSC 验证者，并向质押者铸造 slisBNB。slisBNB 可以通过 LayerZero OFT 合约桥接到以太坊（在 BSC 上锁定，在以太坊上铸造）。有关质押流程，请参见 [Mechanics](mechanics.md)，有关跨链桥接架构，请参见 [Cross-Chain Bridge](cross-chain-bridge.md)。

## 核心合约（BNB 链）

| 合约 | 描述 | 地址 |
| --- | --- | --- |
| slisBNB | 流动质押代币（ERC-20，名称 `Staked Lista BNB`，符号 `slisBNB`） | [0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B](https://bscscan.com/address/0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B) |
| ListaStakeManager | 通过原生 StakeHub 质押 BNB 并铸造/销毁 slisBNB | [0x1adB950d8bB3dA4bE104211D5AB038628e477fE6](https://bscscan.com/address/0x1adB950d8bB3dA4bE104211D5AB038628e477fE6) |

## 跨链（LayerZero OFT）

slisBNB 使用 LayerZero OFT 标准。适配器在 BNB 链上锁定 slisBNB；OFT 在以太坊上铸造/销毁等值代币。LayerZero 端点 ID（EIDs）：BNB 链 `30102`，以太坊 `30101`。

| 合约 | 链 | 角色 | 地址 |
| --- | --- | --- | --- |
| ListaOFTAdapter | BNB 链 (EID 30102) | 在规范 slisBNB 代币上进行锁定/解锁的适配器 | [0x837CB07f6B8a98731856092457524FF37b25E7B3](https://bscscan.com/address/0x837CB07f6B8a98731856092457524FF37b25E7B3) |
| ListaOFT | 以太坊 (EID 30101) | 在以太坊上代表 slisBNB 的铸造/销毁 OFT | [0xf9B24C9364457Ea85792179D285855753549eBAa](https://etherscan.io/address/0xf9B24C9364457Ea85792179D285855753549eBAa) |

## 原生 BSC 系统合约

`ListaStakeManager` 通过 BSC 的内置质押系统合约进行委托、重新委托和取消委托。这些是 BNB 链上的固定协议地址。

| 合约 | 描述 | 地址 |
| --- | --- | --- |
| StakeHub | 用于委托、重新委托和奖励领取的原生 BSC 质押中心 | [0x0000000000000000000000000000000000002002](https://bscscan.com/address/0x0000000000000000000000000000000000002002) |
| GovBNB | 在委托时铸造的原生 BSC 治理代币 | [0x0000000000000000000000000000000000002005](https://bscscan.com/address/0x0000000000000000000000000000000000002005) |

slisBNB 作为 LayerZero OFT 桥接到以太坊 — 参见 [Cross-Chain Bridge](cross-chain-bridge.md)。