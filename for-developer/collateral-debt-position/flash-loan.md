# 闪电贷

> **lisUSD CDP 正在逐步关闭** — 请参阅[机制](mechanics.md)以获取实时信息。闪电铸造仍然有效，因此现有的集成可以继续运行。新的集成应使用 [Lista Lending](../lista-lending/README.md)，其 `Moolah.flashLoan` 在[合约参考](../lista-lending/contract-reference.md)中。

`flash.sol` 是一个标准的 **ERC-3156** 闪电*铸造器*：它将 lisUSD 铸造到您的合约中，回调您，并在同一交易结束时再次销毁它。没有抵押品和头寸——如果贷款加上费用在调用结束前未归还，一切将回滚。

**主网贷款人：** [`0x64d94e715B6c03A5D8ebc6B2144fcef278EC6aAa`](https://bscscan.com/address/0x64d94e715B6c03A5D8ebc6B2144fcef278EC6aAa)（[智能合约](smart-contract.md)页面上的 `FlashMinter`）

## 接口

```solidity
function maxFlashLoan(address token) external view returns (uint256);
function flashFee(address token, uint256 amount) external view returns (uint256);
function flashLoan(IERC3156FlashBorrower receiver, address token, uint256 amount, bytes calldata data) external returns (bool);
```

- **`token` 必须是 lisUSD。** 其他任何东西都会回滚 `Flash/token-unsupported`；`maxFlashLoan` 对其返回 `0`。
- `flashFee` 应用 `toll` 费率并返回一个 18 位小数的 wad。
- `data` 被逐字转发到您的回调中——这是传递状态的唯一通道。

## 编写借款人

实现 [`IERC3156FlashBorrower`](https://github.com/lista-dao/lista-dao-contracts/blob/master/contracts/interfaces/IERC3156FlashBorrower.sol) 并在 `onFlashLoan` 中执行三件事：拒绝不是贷款人的调用者，运行您的逻辑，并在返回 `keccak256("ERC3156FlashBorrower.onFlashLoan")` 之前批准贷款人的 `amount + fee`。

```solidity
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IERC3156FlashBorrower.sol";
import "../interfaces/IERC3156FlashLender.sol";

contract FlashBorrower is IERC3156FlashBorrower {
    IERC3156FlashLender lender;

    constructor(IERC3156FlashLender lender_) {
        lender = lender_;
    }

    function flashBorrow(address token, uint256 amount) public {
        bytes memory data = abi.encode(/* your parameters */);
        lender.flashLoan(this, token, amount, data);
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns (bytes32) {
        require(msg.sender == address(lender), "untrusted lender");
        require(initiator == address(this), "untrusted initiator");

        // ... 您的逻辑。它必须使此合约持有 `amount + fee`。

        IERC20(token).approve(address(lender), amount + fee);
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }
}
```

返回除该哈希之外的任何内容，调用将回滚 `Flash/callback-failed`。跳过批准，或在 `amount + fee` 之前结束回调，贷款人的 `transferFrom` 将回滚 `LisUSD/insufficient-allowance` 或 `LisUSD/insufficient-balance`。

> **闪电贷无法竞标 CDP 清算。** 此分叉使拍卖买方有权限限制——`Clipper.take` / `redo` 是 `auth`，`Interaction.buyFromAuction` 是白名单。对第三方开放的清算面在 Lista Lending 上：请参阅[清算人集成](../lista-lending/liquidator-integration.md)。

## 来源

- [`flash.sol`](https://github.com/lista-dao/lista-dao-contracts/blob/master/contracts/flash.sol) — 包括 `max` 上限和 `toll` 费率的贷款人。
- [`flashBorrower.sol`](https://github.com/lista-dao/lista-dao-contracts/blob/master/contracts/mock/flashBorrower.sol) — 更完整的借款人，带有对解码 `data` 的分支。
- [`flash.test.js`](https://github.com/lista-dao/lista-dao-contracts/blob/master/test/flash.test.js) — 一个完整的端到端示例。