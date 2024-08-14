# 闪电贷款

闪电贷款是无抵押贷款，用户可以借用lisUSD，只要在交易结束前归还借款金额（和费用）。

{% hint style="warning" %}
要使用闪电贷款并从中获利，你需要对BNB链（和智能链）、编程和智能合约有深入的理解。
{% endhint %}

### 闪电贷款的应用

闪电贷款有各种应用。

一个明显的例子是资产之间的套利，用户可以闪电贷款lisUSD在某人的[Lista贷款清算](https://docs.helio.money/protocol/loan-liquidation)期间购买在荷兰拍卖中的BNB，立即在DEX上将lisUSD换成另一种资产，然后立即在另一个DEX上将获得的资产换成lisUSD，其中该资产的比率更高，然后偿还Lista闪电贷款+利息，保留差额——所有这些都在一次贷款交易中完成。

### 参与实体

1. flashLender — 实现闪电贷款功能的"服务器端"的Lista智能合约。
2. flashBorrower — 实现"客户端"的智能合约，EOA可以复制、修改并部署以通过flashLender进行交互。本页面后面提供了一个智能合约的示例。
3. EOA（Externally Owned Account） — 与他们部署的flashBorrower副本进行交互的账户。实际上，EOA是一个复制flashBorrower，修改并在BSC上部署它以通过flashLender进行交互的开发者。

flashLender可以在一次交易中借用（铸造）和偿还（销毁）[Lista稳定币](https://github.com/lista-dao/lista-dao-contracts/blob/master/contracts/hay.sol)，并收取费用。EOA需要与他们自己部署的flashBorrower副本进行交互，该副本反过来与flashLender进行交互。

### 闪电贷款费用

要获取费用，调用`flashFee(address token, uint256 amount)`函数，该函数返回18位小数的费用金额。

### 代码示例

flashLender — [flash.sol](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/flash.sol)

flashBorrower — [flashBorrower.sol](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/mock/flashBorrower.sol)

### 逐步操作

#### 1. 设置你的flashBorrower合约

你的合约必须符合[ERC3156FlashBorrower](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/interfaces/IERC3156FlashBorrower.sol)接口，通过实现`onFlashLoan()`函数。

要与flashLender交互，你的合约必须实现`flashBorrow(token, amount)`和`onFlashLoan(initiator, token, amount, fee, data)`，这是在执行`flashLoan()`期间调用的回调函数。

在`onFlashLoan()`中实现任何自定义逻辑。

以下是一个示例存根合约，你可以通过它更好地理解如何实现flashBorrower。

```
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IERC3156FlashBorrower.sol";
import "../interfaces/IERC3156FlashLender.sol";

contract FlashBorrower is IERC3156FlashBorrower {
    enum Action {NORMAL, OTHER}

    IERC3156FlashLender lender;

    constructor (IERC3156FlashLender lender_) {
        lender = lender_;
    }

    /// @dev ERC-3156 Flash loan callback
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns(bytes32) {
        require(
            msg.sender == address(lender),
            "FlashBorrower: Untrusted lender"
        );
        require(
            initiator == address(this),
            "FlashBorrower: Untrusted loan initiator"
        );
        (Action action) = abi.decode(data, (Action));
        if (action == Action.NORMAL) {
            // do one thing
        } else if (action == Action.OTHER) {
            // do another
        }
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }

    /// @dev Initiate a flash loan
    function flashBorrow(
        address token,
        uint256 amount
    ) public {
        bytes memory data = abi.encode(Action.NORMAL);
        uint256 _allowance = IERC20(token).allowance(address(this), address(lender));
        uint256 _fee = lender.flashFee(token, amount);
        uint256 _repayment = amount + _fee;
        IERC20(token).approve(address(lender), _allowance + _repayment);
        lender.flashLoan(this, token, amount, data);
    }
}
```

{% hint style="info" %}
* flashBorrower必须实现[IERC3156FlashBorrower](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/interfaces/IERC3156FlashBorrower.sol)，并且[onFlashLoan()](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/interfaces/IERC3156FlashBorrower.sol#L30)必须返回[CALLBACK\_SUCCESS](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/flash.sol#L108)哈希。
{% endhint %}

#### 2. 理解如何与flashLender交互

理解在flashLender中使用的参数：

1. `CALLBACK_SUCCESS` — 成功返回的自定义字符串的哈希。
2. `token` (address) — EOA闪电贷款的BNB ERC-20代币的地址。
3. `amount` (uint256) — 闪电贷款的金额。
4. `receiver` (IERC3156FlashBorrower) — EOA部署的flashBorrowed的地址。
5. `data` (bytes calldata) — 基础的未使用参数，保留不改变`flashLoan()`签名。

理解你想要交互的函数：

1. `maxFlashLoan(address token)` — 如果_token_是支持的destablecoin，返回“max”。
2. `flashFee(address token, uint256 amount)` — 对_amount_应用“toll”，并返回如果_token_是支持的destablecoin。
3. `flashLoan(IERC3156FlashBorrower receiver, address token, uint256 amount, bytes calldata data)` — 用额外的_data_（如果有的话）向_receiver_铸造_token `amount`_，并期望返回等于`CALLBACK_SUCCESS`的值。
4. `function accrue()` — 将剩余的费用发送到_vow.sol_。

如果你感到好奇，理解在[flash.sol](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/flash.sol)中使用的MakerDao参数/常量。

1. `vat` — vat.sol的地址。
2. `hayJoin` — hayJoin.sol的地址。
3. `hay` — hay.sol的地址。
4. `vow` — vow.sol的地址。
5. `max` — 允许的最大可借金额。
6. `toll` — 贷款回报的费用。
7. `WAD` — 18位小数。
8. `RAY` — 27位小数。
9. `RAD` — 45位小数。
10. `CALLBACK_SUCCESS` — 成功返回的自定义字符串的哈希。

{% hint style="info" %}
要深入理解MakerDao合约，如var、hay、vow等，从[vat文档](https://docs.makerdao.com/smart-contract-modules/core-module/vat-detailed-documentation)开始，然后继续阅读其他在那里记录的智能合约。
{% endhint %}

#### 3. 与flashLender交互

flashLender可以通过以下地址获取：

* 测试网 — 即将推出
* 主网 — [0x64d94e715B6c03A5D8ebc6B2144fcef278EC6aAa](https://bscscan.com/address/0x64d94e715B6c03A5D8ebc6B2144fcef278EC6aAa)

典型的交互遵循这个工作流程：

1. EOA在借款合约_flashBorrower.sol_上调用`flashBorrow(token, amount)`。
2. _flashBorrower_提前批准_flashLender_偿还贷款和费用。然后它在_flashLender_上调用`flashLoan(receiver, token, amount, data)`函数，该函数向_flashBorrower_铸造指定的金额。
3. 同样的函数`flashLoan(receiver, token, amount, data)`然后调用（回调）_flashBorrower_上的`onFlashLoan(initiator, token, amount, fee, data)`函数，该函数实现了EOA想要用借来的lisUSD做什么的自定义逻辑，然后`onFlashLoan()`如果执行成功，则返回“`ERC3156FlashBorrower.onFlashLoan`"的KECCAK256。自定义逻辑完全由EOA想出并实现。
4. flashLender然后销毁铸造的贷款，并将费用存储为剩余。

{% hint style="info" %}
* flashBorrower必须实现[I](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/interfaces/IERC3156FlashBorrower.sol)，并且[onFlashLoan()](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/interfaces/IERC3156FlashBorrower.sol#L30)必须返回[CALLBACK\_SUCCESS](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/flash.sol#L108)哈希。
{% endhint %}

### 接近实际使用的示例

查看[测试](https://github.com/helio-money/helio-smart-contracts/blob/master/test/flash.test.js)以找到接近实际使用的示例。