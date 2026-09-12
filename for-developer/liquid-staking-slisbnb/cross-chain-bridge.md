# Cross-Chain Bridge

slisBNB moves between BNB Smart Chain and Ethereum as a **LayerZero OFT**. Deployed addresses and endpoint IDs are on [Smart Contract](smart-contract.md).

## Architecture

Supply is never duplicated: the token is locked on its home chain and minted as a representation on the destination chain.

| Contract | Chain | Role |
| --- | --- | --- |
| `ListaOFTAdapter` | BNB Smart Chain | Locks slisBNB on the way out, releases it on the way back. slisBNB itself is a plain ERC-20 — the adapter wraps it rather than the token being OFT-aware. |
| `ListaOFT` | Ethereum | Mints on arrival, burns on the way back. Supply here is always backed by the amount locked in the adapter. |
| LayerZero Endpoint | both | Message transport. |

Both sides carry the same two controls: a **transfer limiter** that bounds size per transfer, and an **emergency pause**.

## Trust model

A transfer is not final when the source transaction confirms. LayerZero's **DVN** verifies the message on the destination chain and an **Executor** delivers it by calling `lzReceive`; the destination mint happens only then. So the bridge inherits LayerZero's verification assumptions, plus one Lista-side addition: the **Lista Guardian**, an off-chain monitor that can trip the emergency pause on either side.

The practical consequence is that a transfer can be accepted on the source chain and still not settle promptly — treat destination arrival as asynchronous and confirm it rather than inferring it from the send.

## Calling it

Use LayerZero's own `SendParam` / `quoteSend` interface; nothing about the call shape is Lista-specific. Two Lista-side conditions make `send()` revert and neither shows up in a LayerZero quote:

* **Dust.** The OFT uses `sharedDecimals = 6`, so amounts are truncated to a multiple of `1e12`. Pass an `amountLD` and `minAmountLD` that are already dust-removed, or the truncated amount falls below `minAmountLD` and the call reverts.
* **Limiter or pause.** A transfer above the live per-transfer limit, or any transfer while paused, reverts. Quote against the current limit rather than a cached one.

## See also

* [Smart Contract](smart-contract.md) — adapter, OFT and endpoint IDs.
* [LayerZero OFT documentation](https://docs.layerzero.network/v2/developers/evm/oft/quickstart) — `SendParam`, `quoteSend` and the messaging model.
