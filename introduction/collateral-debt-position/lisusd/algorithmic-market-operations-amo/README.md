# 算法市场操作 (AMO)

为了维持 lisUSD 的价格稳定性和 $1 的锚定，平衡 lisUSD 在流通市场和 LPs 中的供需至关重要。之前，lisUSD 的借款利率会定期调整，以间接影响 lisUSD 的供需。随着我们的 AMO 的推出，Lista DAO 将实施动态借款利率，类似于 Curve Finance 的 [MonetaryPolicy contracts](https://docs.curve.fi/crvUSD/monetarypolicy/) 用于 crvUSD，以进一步加强 lisUSD 的价格稳定性。

最初，Lista 核心团队将根据市场条件决定参数。在未来，参数更改将需要提案和社区投票。

此外，为确保我们平台的稳定性和响应性，核心团队保留灵活调整借款利率以应对重大市场波动的权利。这种方法使我们能够适应快速变化的市场条件，无需进行快照提案。

用户可以放心，任何调整都将经过仔细考虑，以保持平衡并与市场现实保持一致。

## 利率机制

lisUSD 市场中的利率不是静态的，而是基于一系列因素波动，包括：

1. 通过 Binance oracle 确定的 lisUSD 价格。
2. 变量 r0 和 Beta。

### 计算借款利率 (r) 的公式如下：

![](https://lh7-us.googleusercontent.com/docsz/AD\_4nXfRbturnppWrw7w0t-PLXhA2vzUoiV-iNor96k0jyzwnkHgvWjGfpEo85koiXXrodJJdSlZKPgDfYANjMgBFRgzIrQuoNqbLL\_m6Ku7XoCEPIUOFU2D6hvjwJTgzzcDyMAEoIlnBlIy4fW\_S2m7\_Dwghk5v?key=qpnu5MtZ54GEwy9P7UA52A)

### 此计算中的关键变量包括：

**r:** 年利率 (APY)

**r0**: 默认年利率，每种抵押品类型不同，启动智能合约时配置

**exp(x)**: x 的指数函数 (e\*e\*e\*...\*e)

**Price(lisUSD)**: 当前 lisUSD 价格，从 oracle 获取

**Beta**: 调整参数，启动智能合约时配置

_注意\* 对于每种不同的抵押品，将设置不同的 r0。然而，r0 的最大值始终被限制在 200% 或更低。_

_注意\* 对于每种不同的抵押品，将设置不同的 Beta。如 r 计算所示，Beta 对 x 有巨大影响，从而影响 r。_

### 示例：

r0 = 8%，Price(lisUSD) = $0.98，Beta = 2%\
r = 8% \* exp\[(1 - 0.98)/2%] = 21.746%

这意味着如果 lisUSD 的价格是 $0.98，r0 = 8% 和 Beta = 2%，当前的借款利率将是 21.746%。用户将偿还 lisUSD，减少供应。

## 计算 r

为了精确和一致性，r 和 r0 都以 10^27 的形式表示，以表示精度，并按秒计算。

### 计算 r 的步骤如下：

1. 检索当前的 lisUSD 价格以获取 price(lisUSD)。（r0, Beta 对每种抵押品固定）
2. 每 15 分钟或当用户与合约互动时（借款、偿还）更新当前借款利率
3. 根据当前利率计算借款利息

计算利率 (r) 的确切公式如下：

![](https://lh7-us.googleusercontent.com/docsz/AD\_4nXfgarTeoLR1RoaLXOnfPPHESQmX4s-A14bVKyUlWWtxtY6XIYSqS1Tz\_jFC8Uc6CMPQ8Yopx9FZ8ltTyRyqy9bXRZTiFGrq7WEGitmIROHEHnA2LoLJUfy\_sd6uaRRJlbbGuvyr0ER-YCKi1yZ9URa5dEtL?key=qpnu5MtZ54GEwy9P7UA52A)

**r**: 每秒利率，以 10^27 表示，转换为 APY，始终小于 200%

**r0**: 默认率，每种抵押品类型不同，启动智能合约时配置

**exp(x)**: x 的指数函数 ((e\*e\*...\*e)

**Price(target)**: 目标价格 ($1)，以 10^8 表示

**Price(lisUSD)**: 当前 lisUSD 价格，从 Binance oracle 获取，以 10^8 表示

**Beta**: 调整参数，启动智能合约时配置，暂定范围：(3 \* 10^5, 10^8)

**APY(Default)**: 确认 r0

所有智能合约细节可以在 [这里](./#source-code-parameters) 找到。

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

Price(lisUSD):

[Oracle 地址](https://bscscan.com/address/0xf3afD82A4071f272F403dC176916141f44E6c750#readProxyContract)

```solidity
uint256 price = oracle.peek(address _lisUSD)
```

Beta:

```solidity
DynamicDutyCalculator.ilks(address _collateral).beta
```