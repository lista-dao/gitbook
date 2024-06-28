# Flash Loan

Flash Loans are uncollateralized loans that allow the user to borrow lisUSD as long as the borrowed amount (and a fee) is returned before the end of the transaction.

{% hint style="warning" %}
To use Flash Loans and get profit from them, you need a good understanding of BNB Chain (and Smart Chain), programming, and smart contracts.
{% endhint %}

### Application of Flash Loans

There are various applications of Flash Loans.

An obvious example is arbitrage between assets, where the user can flash-loan lisUSD to purchase BNB in a Dutch auction that happens during somebody's [Lista loan liquidation](https://docs.helio.money/protocol/loan-liquidation), immediately swap lisUSD for another asset on a DEX, then immediately swap the obtained asset for lisUSD on another DEX where the asset's ratio is higher, and repay Lista the flash loan + interest, keeping the difference — all within one loan transaction.

### Involved entities

1. flashLender — Lista smart contract implementing the "server side" of the flash loans functionality.
2. flashBorrower — the smart contract implementing the "client side", which EOA can copy, modify, and deploy to interact through with flashLender. A stub example of the smart contract is available later on this page.
3. EOA (Externally Owned Account) — an account that interacts with the copy of flashBorrower they deploy. Effectively, EOA is a developer who copies flashBorrower, modifies, and deploys it on BSC to interact with flashLender through.

flashLender can be used to borrow (mint) and repay (burn) [Lista destablecoins](https://github.com/lista-dao/lista-dao-contracts/blob/master/contracts/hay.sol), with a fee, in one transaction. EOA needs to interact with their own deployed copy of flashBorrower, which in turn interacts with flashLender.

### Flash Loan Fee

To get the fee, call the `flashFee(address token, uint256 amount)` function that returns the fee amount in 18 Decimals.

### Code example

flashLender — [flash.sol](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/flash.sol)

flashBorrower — [flashBorrower.sol](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/mock/flashBorrower.sol)

### Step-by-step

#### 1. Set up your flashBorrower contract

Your contract must conform to the [ERC3156FlashBorrower ](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/interfaces/IERC3156FlashBorrower.sol)interface by implementing the `onFlashLoan()` function.&#x20;

To interact with flashLender, your contract must implement _`flashBorrow(token, amount)`_ and _`onFlashLoan(initiator, token, amount, fee, data)`_, which is a callback function called during the execution of _`flashLoan()`._&#x20;

Implement any custom logic within _`onFlashLoan()`._

Here's an example stub contract you can look through to better understand how to implement flashBorrower.

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
* The flashBorrower must implement the [IERC3156FlashBorrower](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/interfaces/IERC3156FlashBorrower.sol), and [onFlashLoan()](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/interfaces/IERC3156FlashBorrower.sol#L30) must return the [CALLBACK\_SUCCESS](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/flash.sol#L108) hash.&#x20;
{% endhint %}

#### 2. Understand how to interact with flashLender

Understand the parameters used in flashLender:

1. `CALLBACK_SUCCESS` — Hash of custom string, returned on success.
2. `token` (address) — address of the BNB ERC-20 token that EOA flash-loans.
3. `amount` (uint256) — amount of the flash loan.
4. `receiver` (IERC3156FlashBorrower) — address of the flashBorrowed deployed by the EOA.
5. `data` (bytes calldata) — rudimentary non-used parameter left not to change the `flashLoan()` signature.

Understand the functions you want to interact with:

1. `maxFlashLoan(address token)` — returns “max” if _token_ is supported destablecoin.
2. `flashFee(address token, uint256 amount)` — applies “toll” on _amount_ and returns if _token_ is a supported destablecoin.
3. `flashLoan(IERC3156FlashBorrower receiver, address token, uint256 amount, bytes calldata data)` — mints _token `amount`_ to _`receiver`_ with extra _data_ (if any), and expects a return equal to `CALLBACK_SUCCESS`.
4. `function accrue()` — sends the surplus fee to _vow.sol_.

If you're curious, understand the MakerDao parameters/constants used in the [flash.sol](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/flash.sol).

1. `vat` — Address of vat.sol.
2. `hayJoin` — Address of hayJoin.sol.
3. `hay` — Address of hay.sol.
4. `vow` — Address of vow.sol.
5. `max` — Maximum allowed borrowable amount.
6. `toll` — Fee on return of loan.
7. `WAD` — 18 Decimals.
8. `RAY` — 27 Decimals.
9. `RAD` — 45 Decimals.
10. `CALLBACK_SUCCESS` — Hash of custom string, returned on success.

{% hint style="info" %}
For a deeper understanding of the MakerDao contract, such as var, hay, vow, etc, start with the [vat docs](https://docs.makerdao.com/smart-contract-modules/core-module/vat-detailed-documentation) and proceed to other smart contracts documented there.
{% endhint %}

#### 3. Interact with flashLender&#x20;

flashLender is available by the following addresses:

* Testnet — coming soon
* Mainnet — [0x64d94e715B6c03A5D8ebc6B2144fcef278EC6aAa](https://bscscan.com/address/0x64d94e715B6c03A5D8ebc6B2144fcef278EC6aAa)&#x20;

A typical interaction follows this workflow:

1. An EOA calls _`flashBorrow(token, amount)`_ on a borrowing contract _flashBorrower.sol_.
2. _flashBorrower_ approves _flashLender_ in advance to repay the loan with a fee. Then it calls the _`flashLoan(receiver, token, amount, data)`_ function on _flashLender_ which mints a specified amount to the _flashBorrower_.
3. The same function _flashLoan(receiver, token, amount, data)_ then calls (CALLBACK) the the _`onFlashLoan(initiator, token, amount, fee, data)`_ function on the _flashBorrower_, which implements the custom logic of whatever the EOA wants to do with the borrowed lisUSD, then _`onFlashLoan()`_ returns the KECCAK256 of “`ERC3156FlashBorrower.onFlashLoan`" if its execution was successful. The custom logic is thought-up and implemented completely by the EOA.
4. flashLender then burns the minted loan and stores the fee as surplus.

{% hint style="info" %}
* The flashBorrower must implement the [I](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/interfaces/IERC3156FlashBorrower.sol), and [onFlashLoan()](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/interfaces/IERC3156FlashBorrower.sol#L30) must return the [CALLBACK\_SUCCESS](https://github.com/helio-money/helio-smart-contracts/blob/master/contracts/flash.sol#L108) hash.&#x20;
{% endhint %}

### Close-to-life usage example

Look into [the tests ](https://github.com/helio-money/helio-smart-contracts/blob/master/test/flash.test.js)to find a close-to-life usage example.

