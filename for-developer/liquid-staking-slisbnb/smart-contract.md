# Smart Contract

slisBNB is Lista's yield-bearing liquid staking token for BNB. BNB is staked through `ListaStakeManager`, which delegates to BSC validators via the native StakeHub system contract and mints slisBNB to the staker. slisBNB can be bridged to Ethereum through LayerZero OFT contracts (lock on BSC, mint on Ethereum). See [Mechanics](mechanics.md) for the staking flow and [Cross-Chain Bridge](cross-chain-bridge.md) for the bridge architecture.

> The addresses below are manually curated for this page (not auto-synced). They are cross-checked against the Lista DAO contract source and the [CDP Smart Contract](../collateral-debt-position/smart-contract.md) reference. Verify against the relevant block explorer before integrating.

## Core Contracts (BNB Chain)

| Contract | Description | Address |
| --- | --- | --- |
| slisBNB | Liquid staking token (ERC-20, name `Staked Lista BNB`, symbol `slisBNB`) | [0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B](https://bscscan.com/address/0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B) |
| ListaStakeManager | Stakes BNB through the native StakeHub and mints/burns slisBNB | [0x1adB950d8bB3dA4bE104211D5AB038628e477fE6](https://bscscan.com/address/0x1adB950d8bB3dA4bE104211D5AB038628e477fE6) |

## Cross-Chain (LayerZero OFT)

slisBNB uses the LayerZero OFT standard. The adapter locks slisBNB on BNB Chain; the OFT mints/burns the equivalent on Ethereum. LayerZero endpoint IDs (EIDs): BNB Chain `30102`, Ethereum `30101`.

| Contract | Chain | Role | Address |
| --- | --- | --- | --- |
| ListaOFTAdapter | BNB Chain (EID 30102) | Lock/unlock adapter over the canonical slisBNB token | [0x837CB07f6B8a98731856092457524FF37b25E7B3](https://bscscan.com/address/0x837CB07f6B8a98731856092457524FF37b25E7B3) |
| ListaOFT | Ethereum (EID 30101) | Mint/burn OFT representing slisBNB on Ethereum | [0xf9B24C9364457Ea85792179D285855753549eBAa](https://etherscan.io/address/0xf9B24C9364457Ea85792179D285855753549eBAa) |

## Native BSC System Contracts

`ListaStakeManager` delegates, redelegates, and undelegates through BSC's built-in staking system contracts. These are fixed protocol addresses on BNB Chain.

| Contract | Description | Address |
| --- | --- | --- |
| StakeHub | Native BSC staking hub used for delegation, redelegation, and reward claims | [0x0000000000000000000000000000000000002002](https://bscscan.com/address/0x0000000000000000000000000000000000002002) |
| GovBNB | Native BSC governance token minted on delegation | [0x0000000000000000000000000000000000002005](https://bscscan.com/address/0x0000000000000000000000000000000000002005) |
