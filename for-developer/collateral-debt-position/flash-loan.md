# Flash Loan

> **The lisUSD CDP is being wound down** — see [Mechanics](mechanics.md) for the live gates. Flash minting still works and is documented here for existing integrations and for auditors. New integrations should use [Lista Lending](../lista-lending/README.md), whose `Moolah.flashLoan` is in the [contract reference](../lista-lending/contract-reference.md).

`flash.sol` is a standard **ERC-3156** flash *minter*: it mints lisUSD to your contract, calls you back, and burns it again at the end of the same transaction. There is no collateral and no position — if the loan plus fee is not returned before the call ends, everything reverts.

**Mainnet lender:** [`0x64d94e715B6c03A5D8ebc6B2144fcef278EC6aAa`](https://bscscan.com/address/0x64d94e715B6c03A5D8ebc6B2144fcef278EC6aAa)

## The interface

```solidity
function maxFlashLoan(address token) external view returns (uint256);
function flashFee(address token, uint256 amount) external view returns (uint256);
function flashLoan(IERC3156FlashBorrower receiver, address token, uint256 amount, bytes calldata data) external returns (bool);
```

- **`token` must be lisUSD.** Anything else reverts `Flash/token-unsupported`; `maxFlashLoan` returns `0` for it.
- `flashFee` applies the `toll` rate and returns an 18-decimal wad.
- `data` is forwarded verbatim to your callback — it is the only channel for passing state in.

Your contract implements [`IERC3156FlashBorrower`](https://github.com/lista-dao/lista-dao-contracts/blob/master/contracts/interfaces/IERC3156FlashBorrower.sol):

```solidity
function onFlashLoan(address initiator, address token, uint256 amount, uint256 fee, bytes calldata data)
  external returns (bytes32);
```

It must return `keccak256("ERC3156FlashBorrower.onFlashLoan")` — a wrong value reverts `Flash/callback-failed`. Separately, it must hold `amount + fee` and have approved the lender by the time the callback returns; otherwise the lender's `transferFrom` reverts `Hay/insufficient-allowance` or `Hay/insufficient-balance`.

> **Flash loans cannot bid on CDP liquidations.** This fork makes the auction buy side permissioned — `Clipper.take` / `redo` are `auth` and `Interaction.buyFromAuction` is whitelisted. The liquidation surface that *is* open to third parties is on Lista Lending: see [Liquidator Integration](../lista-lending/liquidator-integration.md).

## Source

- [`flash.sol`](https://github.com/lista-dao/lista-dao-contracts/blob/master/contracts/flash.sol) — the lender, including the `max` ceiling and `toll` rate.
- [`flashBorrower.sol`](https://github.com/lista-dao/lista-dao-contracts/blob/master/contracts/mock/flashBorrower.sol) — a minimal borrower to copy.
- [`flash.test.js`](https://github.com/lista-dao/lista-dao-contracts/blob/master/test/flash.test.js) — a worked end-to-end example.
