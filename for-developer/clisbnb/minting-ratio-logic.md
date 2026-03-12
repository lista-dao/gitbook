# 铸币比率逻辑

两个抵押模块从BNB等值抵押价值中派生出总的`slisBNBx`。在最终分配之前，应用两个连续的调整：

1. 抵押折扣
2. Lista DAO绩效费

## 步骤1：抵押折扣

| 抵押模块 | 折扣率 | 影响 |
| --- | --- | --- |
| `slisBNB`（通过`SlisBNBProvider`） | `0%` | 完整的BNB等值值被用作铸币基础。 |
| `slisBNB/BNB LP`（通过`SmartProvider`） | `0.2%` | LP的BNB等值值在收费前乘以`0.998`。 |

## 步骤2：绩效费（Lista DAO）

| 抵押模块 | 绩效费 | 费用基础 |
| --- | --- | --- |
| `slisBNB`（通过`SlisBNBProvider`） | `3%` | 应用于完整的BNB等值值。 |
| `slisBNB/BNB LP`（通过`SmartProvider`） | `1.8367%` | 应用于折扣后的（`0.998x`）BNB等值值。 |

## 公式

### `slisBNB`模块

```text
gross slisBNBx = 存入的slisBNB x slisBNB/BNB汇率
Lista费用      = gross slisBNBx x 3%
用户slisBNBx  = gross slisBNBx x 97%
```

### `slisBNB/BNB LP`模块

```text
gross slisBNBx = LP的BNB等值 x (1 - 0.2%) = LP值 x 0.998
Lista费用      = gross slisBNBx x 1.8367%
用户slisBNBx  = gross slisBNBx x (1 - 1.8367%)
```