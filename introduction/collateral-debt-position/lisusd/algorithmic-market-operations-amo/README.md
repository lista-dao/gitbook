# 算法市场操作 (AMO)

为了维持lisUSD的价格稳定性和$1的锚定，平衡流通市场和LPs中的lisUSD供需至关重要。以前，lisUSD的借款利率会定期调整，以间接影响lisUSD的供需。随着我们AMO的启动，Lista DAO将实施动态借款利率，类似于Curve Finance的[MonetaryPolicy合约](https://docs.curve.fi/crvUSD/monetarypolicy/)对crvUSD的处理，以进一步增强lisUSD的价格稳定性。

一开始，Lista核心团队将根据市场条件决定参数。在未来，参数变更将需要提案和社区投票。

## 利率机制

lisUSD市场的利率不是静态的，而是根据一系列因素波动，包括：

1. 通过Binance oracle确定的lisUSD的价格。
2. 变量r0和Beta。

### 计算借款利率（r）的公式如下：

![](https://lh7-us.googleusercontent.com/docsz/AD\_4nXfRbturnppWrw7w0t-PLXhA2vzUoiV-iNor96k0jyzwnkHgvWjGfpEo85koiXXrodJJdSlZKPgDfYANjMgBFRgzIrQuoNqbLL\_m6Ku7XoCEPIUOFU2D6hvjwJTgzzcDyMAEoIlnBlIy4fW\_S2m7\_Dwghk5v?key=qpnu5MtZ54GEwy9P7UA52A)

### 此计算中的关键变量包括：

**r：** 年化收益率 (APY)

**r0：** 默认年利率，每种抵押品类型不同，启动智能合约时配置

**exp(x)：** x的指数函数 (e\*e\*e\*...\*e)

**Price(lisUSD)：** lisUSD的当前价格，从oracle获取

**Beta：** 调整参数，启动智能合约时配置

_注\* 对于每种不同的抵押品，都会设置不同的r0。然而，r0的最大值在任何时候都将被限制在200%或以下。_

_注\* 对于每种不同的抵押品，都会设置不同的Beta。如在r的计算中所见，Beta对x，从而对r有巨大的影响。_

### 示例：

r0 = 8%，Price(lisUSD) = $0.98，Beta = 2%\
r = 8% \* exp\[(1 - 0.98)/2%] = 21.746%；

这意味着如果lisUSD的价格是$0.98，r0 = 8% 且 Beta = 2%，当前的借款利率将是21.746%。用户将偿还lisUSD，减少供应。

## 计算r

为了精确和一致，r和r0都以10^27表示，以表示精度，并按秒计算。

### 计算r时的步骤如下：

1. 获取lisUSD的当前价格以得到price(lisUSD)。（r0，Beta对每种抵押品固定）
2. 每15分钟或当用户与合约交互（借款，偿还）时更新当前借款利率
3. 根据当前利率计算借款利息

计算利率（r）的确切公式如下：

![](https://lh7-us.googleusercontent.com/docsz/AD\_4nXfgarTeoLR1RoaLXOnfPPHESQmX4s-A14bVKyUlWWtxtY6XIYSqS1Tz\_jFC8Uc6CMPQ8Yopx9FZ8ltTyRyqy9bXRZTiFGrq7WEGitmIROHEHnA2LoLJUfy\_sd6uaRRJlbbGuvyr0ER-YCKi1yZ9URa5dEtL?key=qpnu5MtZ54GEwy9P7UA52A)

**r：** 每秒利率，以10^27表示，转换为APY，任何时候都不超过200%

**r0：** 默认利率，每种抵押品类型不同，启动智能合约时配置

**exp(x)：** x的指数函数 ((e\*e\*...\*e)

**Price(target)：** 目标价格（$1），以10^8计算

**Price(lisUSD)：** lisUSD的当前价格，从Binance oracle获取，以10^8表示

**Beta：** 调整参数，启动智能合约时配置，暂定范围：(3 \* 10^5, 10^8)

**APY(Default)：** 确认r0

所有智能合约细节可以在[这里](./#source-code-parameters)找到。

## 源代码参数：

r0:

```solidity
DynamicDutyCalculator.ilks(address _collateral).rate0
```

exp(x):

```solidity
  function exp(int256 delta, int256 beta) internal pure returns (uint256) {
        if (delta < 0) {
            int256 power = delta * FixedMath0x.FIXED_1 / beta;
            int256 _r = FixedMath0x._exp(power);
            return uint256(_r) * 1e18 / uint256(FixedMath0x.FIXED_1);
        } else if (delta > 0 ) {
            delta = -1 * delta;
            int256 power = delta * FixedMath0x.FIXED_1 / beta;
            int256 _r = FixedMath0x._exp(power);
            return uint256(FixedMath0x.FIXED_1) * 1e18 / uint256(_r);
        } else {
            return 1e18;
        }
    }
```

Price(target):

```solidity
uint256 constant PEG = 1e8;
```

Price(lisUSD):&#x20;

[Oracle地址](https://bscscan.com/address/0xf3afD82A4071f272F403dC176916141f44E6c750#readProxyContract)

```solidity
uint256 price = oracle.peek(address _lisUSD)
```

Beta:&#x20;

```solidity
DynamicDutyCalculator.ilks(address _collateral).beta

```