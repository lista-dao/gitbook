# 代币生命周期

`slisBNBx` 的生命周期由 `SlisBNBxMinter` 严格控制。用户和外部合约不能直接铸造。

| 步骤 | 操作 | 结果 |
| --- | --- | --- |
| 1. 存款 | 用户将 `slisBNB` 或 `slisBNB/BNB LP` 存入 Moolah，通过相关的提供者/抵押合约。 | 抵押记录下来，提供者调用 `SlisBNBxMinter`。 |
| 2. 铸造 | 铸币厂根据 BNB 等值抵押价值计算 `slisBNBx` 并调用 `slisBNBx.mint()`。 | `slisBNBx` 记入用户或委托地址。 |
| 3. 持有 | 用户持有 `slisBNBx`（不可转让）。 | 持有者有资格参与 Launchpool。 |
| 4. 提取 | 用户从 Moolah 提取全部或部分抵押品。 | 调用 `SlisBNBxMinter` 进行比例燃烧。 |
| 5. 燃烧 | 铸币厂根据移除的抵押品燃烧相应的 `slisBNBx`。 | `slisBNBx` 供应减少且始终保持抵押支持。 |

## 注意事项

* 铸造和燃烧总是跟随抵押状态。
* 部分提款只燃烧相应比例的金额。
* 此生命周期适用于 Moolah 集成，不适用于传统的 CDP。