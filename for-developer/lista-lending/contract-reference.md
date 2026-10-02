# 合约和接口参考

**Moolah** 是一个单例，持有每个 Lista Lending 市场。可以直接从 Solidity 调用它，或者从任何无法使用 [SDK](../sdk.md) 的堆栈调用；以下是您需要的签名、结构和 Lista 特定控制。

Moolah 由 Morpho 提供支持，并基于 Morpho Blue 智能合约构建，然后通过 Lista 特定控制进行扩展。关于它的层次结构：ERC-4626 vault 在 [Vault Reference](vault-reference.md)，提供者门控的抵押品在 [Providers](providers.md)，固定期限经纪人界面在 [Broker Reference](broker-reference.md)。每个市场——无论抵押品、预言机还是 IRM——都存在于这个合约中，并由市场 `Id` 地址化。有关已部署地址，请参阅 [Smart Contract](smart-contract.md) 参考；有关更高层次的流程，请参阅 [Integration Patterns](integration-patterns.md)；有关回调接口和发出的事件，请参阅 [Events & Callbacks](events-and-callbacks.md)。

---

## 类型和结构

### `Id`

```solidity
type Id is bytes32;
```

市场的标识符是 ABI 编码的 `MarketParams` 的 `keccak256` 哈希值（五个 32 字节的字，按结构顺序）。因此，具有相同参数的两个市场将合并为相同的 `Id`。

```solidity
Id id = Id.wrap(keccak256(abi.encode(marketParams)));
```

相同的值通过 `idToMarketParams(Id)` 视图（反向映射）在链上公开，并用作 `position`、`market`、提供者、经纪人和两个白名单的键。

### `MarketParams`

市场的不可变定义。一旦创建，这些值就不能更改；新的组合只是一个新的市场。

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `loanToken` | `address` | 提供和借入的资产。 |
| `collateralToken` | `address` | 作为抵押品提供的资产。 |
| `oracle` | `address` | 价格来源；必须公开 `peek(address)`。Lista 部署在 `IOracle` 路径上的每个预言机，除了 `IdleOracle`（其闲置抵押品返回字面 `0`），返回 8 位小数价格——传统 CDP 自己的 `peek()` 界面是 18 位小数，但这是一个单独的、不相关的合约。Moolah 本身从不验证小数惯例：市场创建仅探测 `peek` 不会恢复——参见 [Consuming Oracle Prices](../multi-oracle/consuming-prices.md)。 |
| `irm` | `address` | 利率模型。必须通过 `isIrmEnabled` 启用。 |
| `lltv` | `uint256` | 清算贷款价值比，按 `WAD`（`1e18`）缩放。必须通过 `isLltvEnabled` 启用。 |

### `Position`

每个用户、每个市场的状态：`mapping(Id => mapping(address => Position))`。

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `supplyShares` | `uint256` | 用户拥有的供给方份额。 |
| `borrowShares` | `uint128` | 用户欠的借款方（债务）份额。 |
| `collateral` | `uint128` | 用户提供的抵押品余额。 |

> 对于 `feeRecipient`，`supplyShares` 不包括自上次利息累积以来累积的费用份额。

### `Market`

每个市场的汇总会计：`mapping(Id => Market)`。

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `totalSupplyAssets` | `uint128` | 总提供资产（不包括自上次累积以来的利息）。 |
| `totalSupplyShares` | `uint128` | 未偿还的总供给份额。 |
| `totalBorrowAssets` | `uint128` | 总借入资产（不包括自上次累积以来的利息）。 |
| `totalBorrowShares` | `uint128` | 未偿还的总借入份额。 |
| `lastUpdate` | `uint128` | 上次利息累积的时间戳。非零值表示市场存在。 |
| `fee` | `uint128` | 市场利息费用，按 `WAD` 缩放。上限为 `MAX_FEE`。 |

份额使用 OpenZeppelin 的虚拟份额方法（`VIRTUAL_SHARES = 1e6`，`VIRTUAL_ASSETS = 1`）来减轻份额价格操纵；转换在协议的有利方面进行四舍五入。

### `Authorization` 和 `Signature`

由 `setAuthorizationWithSig` 用于无气体（EIP-712）授权委托。

| `Authorization` 字段 | 类型 | 含义 |
| --- | --- | --- |
| `authorizer` | `address` | 授予授权的账户（和恢复的签名者）。 |
| `authorized` | `address` | 被授权管理 `authorizer` 的头寸的账户。 |
| `isAuthorized` | `bool` | 要设置的授权值。 |
| `nonce` | `uint256` | 必须等于 `authorizer` 的当前 `nonce`；防止重放。 |
| `deadline` | `uint256` | 签名过期时间戳。 |

`Signature` 是一个标准的 `{ uint8 v; bytes32 r; bytes32 s; }`。EIP-712 域是 `EIP712Domain(uint256 chainId,address verifyingContract)`；类型哈希是 `Authorization(address authorizer,address authorized,bool isAuthorized,uint256 nonce,uint256 deadline)`。当前链的分隔符可通过 `domainSeparator()` 读取。

---

## 核心外部函数

当一个函数同时接受 `assets` 和 `shares` 时，**必须有且只有一个为零**（由 `exactlyOneZero` 强制执行）；另一侧通过份额数学推导。

### 市场创建

```solidity
function createMarket(MarketParams memory marketParams) external;
```

创建市场。除非 `irm` 和 `lltv` 已启用，`loanToken`/`collateralToken`/`oracle` 非零，并且市场尚不存在，否则恢复。记录 `lastUpdate = block.timestamp`，将市场 `fee` 设置为 `defaultMarketFee`，存储反向映射，探测两个代币的预言机，并初始化 IRM。发出 `CreateMarket`。当 `OPERATOR` 角色有成员时，只有 `OPERATOR` 可以创建市场；否则创建是无权限的。

> **批准实际拉取代币的合约——这并不总是 Moolah。** 对于没有提供者或经纪人阻碍的直接核心调用，`supply` 和 `supplyCollateral` 使用 `transferFrom` 拉取，其中支出者是 Moolah 单例，因此批准 Moolah。门控是每条腿，而不是每个市场：一个 **抵押品提供者** 接管 `supplyCollateral` / `withdrawCollateral`；一个 **经纪人** 接管 `borrow` / `repay`。经纪人不门控抵押品——在没有抵押品提供者的经纪人市场上，您仍然在 Moolah 上调用 `supplyCollateral` 并批准 Moolah。两种情况将拉取路由到其他地方：当设置了 **抵押品提供者** 时，Moolah 要求 `msg.sender == provider`，因此提供者本身调用 `supplyCollateral` 并且必须已经从您那里拉取代币（例如 `SmartProvider`/`SlisBNBProvider` 都在调用 Moolah 之前执行 `transferFrom(msg.sender, address(this), ...)`）——**批准提供者，而不是 Moolah**。当设置了 **经纪人** 时，`Moolah.repay` 要求 `msg.sender == broker`，因此最终用户不能直接调用它——经纪人本身从用户那里拉取还款（例如 `LendingBrokerOperatorLib` 执行 `transferFrom(user, address(this), ...)`）然后转发给 Moolah——**批准经纪人合约，而不是 Moolah，用于经纪人市场上的还款。** 参见 [Integration Patterns](integration-patterns.md)。

### 提供 / 提取（贷款侧流动性）

```solidity
function supply(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, bytes memory data)
  external returns (uint256 assetsSupplied, uint256 sharesSupplied);
```

代表 `onBehalf` 提供贷款资产，铸造供给份额。首先累积利息。如果 `data` 非空，则在通过 `transferFrom` 拉取代币之前回调调用者的 `onMoolahSupply`。受每个市场白名单和 vault 黑名单的约束，以及结果头寸的 `minLoan` 底线。

```solidity
function withdraw(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, address receiver)
  external returns (uint256 assetsWithdrawn, uint256 sharesWithdrawn);
```

销毁 `onBehalf` 的供给份额并将资产发送给 `receiver`。调用者必须是 `onBehalf` 或授权者。如果它会将 `totalBorrowAssets` 推高于 `totalSupplyAssets`（`insufficient liquidity`），则恢复。

### 借款 / 还款（债务侧）

```solidity
function borrow(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, address receiver)
  external returns (uint256 assetsBorrowed, uint256 sharesBorrowed);
```

借用 `onBehalf` 的抵押品贷款资产并将其发送给 `receiver`。累积利息，然后要求结果头寸健康（`_isHealthy`）并且市场保持 `totalBorrowAssets <= totalSupplyAssets`。访问取决于市场的路由：如果设置了 **经纪人**，只有经纪人可以借款（并且必须是接收者）；否则如果调用者是市场的 **提供者**，接收者必须是该提供者；否则调用者必须是 `onBehalf` 或授权者。受白名单和 `minLoan` 底线的约束。

```solidity
function repay(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, bytes memory data)
  external returns (uint256 assetsRepaid, uint256 sharesRepaid);
```

偿还 `onBehalf` 的债务，销毁借款份额。首先累积利息；如果 `data` 非空，则在拉取代币之前回调 `onMoolahRepay`。如果为市场设置了经纪人，只有经纪人可以偿还。部分偿还将导致债务低于 `minLoan` 恢复。

> **要完全关闭一个头寸，请传递完整的 `borrowShares` 并将 `assets = 0`。** 读取债务为资产并偿还该数字会在您的读取和执行之间累积利息后留下低于 `minLoan` 的尘埃，并且整个调用恢复——以这种方式构建的全部偿还按钮对每个用户都失败。

### 抵押品管理

```solidity
function supplyCollateral(MarketParams memory marketParams, uint256 assets, address onBehalf, bytes memory data) external;
```

为 `onBehalf` 提供抵押品。**不**累积利息（不需要，节省 gas）。如果为抵押品代币设置了提供者，只有提供者可以调用。如果 `data` 非空，则在拉取代币之前回调 `onMoolahSupplyCollateral`。受白名单的约束。

```solidity
function withdrawCollateral(MarketParams memory marketParams, uint256 assets, address onBehalf, address receiver) external;
```

将抵押品提取到 `receiver`。累积利息，然后要求头寸保持健康。如果设置了提供者，只有提供者可以调用（并且必须是接收者）；否则调用者必须是 `onBehalf` 或授权者。

### 清算

```solidity
function liquidate(MarketParams memory marketParams, address borrower, uint256 seizedAssets, uint256 repaidShares, bytes memory data)
  external returns (uint256 seized, uint256 repaid);
```

清算不健康的 `borrower`。`seizedAssets` / `repaidShares` 中必须有且只有一个为零；另一个使用清算激励因子 `min(MAX_LIQUIDATION_INCENTIVE_FACTOR, 1 / (1 - LIQUIDATION_CURSOR * (1 - lltv)))` 推导。累积利息，检查头寸在预言机价格下不健康，将抵押品扣押给调用者，并拉取偿还的贷款资产。如果抵押品达到零，剩余债务将作为坏账实现为市场的供给侧。受每个市场的 **清算白名单** 限制。如果 `data` 非空，则在还款转移之前调用 `onMoolahLiquidate`。

```solidity
function liquidateBrokerPosition(MarketParams memory marketParams, address borrower, uint256 badDebtShares)
  external returns (uint256 seized, uint256 repaid);
```

经纪人专用路径，将经纪人市场借款人的 `badDebtShares` 记入市场的供给侧——损失通过减少 `totalSupplyAssets` 在所有供应商之间社会化，并且费用接收者的头寸不受影响。只有市场的经纪人可以调用；此路径不执行健康检查，因此经纪人负责确定头寸不健康。

### 闪电贷

```solidity
function flashLoan(address token, uint256 assets, bytes calldata data) external;
```

将 `token` 的 `assets` 转移给调用者，调用 `onMoolahFlashLoan`，然后在同一交易中拉回相同的 `assets`。可以访问合约的整个 `token` 余额（所有市场的流动性和抵押品合并）。闪电 **费用为零**。如果代币在闪电贷黑名单上或 `assets` 为零，则恢复。不符合 ERC-3156。`whenNotPaused` 适用；有关重入模型，请参见 [Reentrancy guard](#reentrancy-guard)。

### 授权

```solidity
function setAuthorization(address authorized, bool newIsAuthorized) external;
function setAuthorizationWithSig(Authorization calldata authorization, Signature calldata signature) external;
```

`setAuthorization` 设置 `authorized` 是否可以管理 `msg.sender` 在所有市场的头寸。`setAuthorizationWithSig` 通过 EIP-712 签名执行相同操作，消耗授权者的 `nonce` 并要求 `block.timestamp <= deadline`。任何人都可以始终管理自己的头寸，无论这些标志如何。

### 利息累积

```solidity
function accrueInterest(MarketParams memory marketParams) external;
```

无权限地为市场累积利息：从 IRM 查询 `borrowRate`，在经过的时间内复合（连续复合的三项泰勒近似），增长 `totalBorrowAssets`/`totalSupplyAssets`，并在市场 `fee` 非零时铸造费用份额给 `feeRecipient`。发出 `AccrueInterest`。利息承载的入口点——`supply`、`withdraw`、`borrow`、`repay`、`withdrawCollateral`、`liquidate` 和 `liquidateBrokerPosition`——在触及余额之前内部累积利息。`supplyCollateral` 故意跳过累积（抵押品既不赚取也不欠利息，因此节省 gas），而 `flashLoan` 不累积。

---

## 视图函数

| 视图 | 签名 | 返回 |
| --- | --- | --- |
| Position | `position(Id id, address user)` | 用户在市场中的 `Position` 结构。 |
| Market | `market(Id id)` | `Market` 会计结构。 |
| Params by id | `idToMarketParams(Id id)` | 市场的 `MarketParams`（`Id` 哈希的反向）。 |
| Authorization | `isAuthorized(address authorizer, address authorized)` | `authorized` 是否可以管理 `authorizer` 的头寸。 |
| Nonce | `nonce(address authorizer)` | 授权者的当前 EIP-712 nonce。 |
| Domain separator | `domainSeparator()` | 当前链的 EIP-712 域分隔符。 |
| Health | `isHealthy(MarketParams, Id, address borrower)` | 借款人的头寸是否健康。 |
| Price | `getPrice(MarketParams)` | 以贷款资产为单位的抵押品价格，按 `10 ** (36 + quoteDecimals - baseDecimals)` 缩放。 |
| IRM enabled | `isIrmEnabled(address irm)` | IRM 是否可以用于新市场。 |
| LLTV enabled | `isLltvEnabled(uint256 lltv)` | LLTV 是否可以用于新市场。 |
| Fee recipient | `feeRecipient()` | 全局费用接收者。 |
| Default fee | `defaultMarketFee()` | 应用于新创建市场的费用。 |

**计算市场 `Id`** 离链是 `keccak256(abi.encode(loanToken, collateralToken, oracle, irm, lltv))`；链上等效的是 `MarketParamsLib.id(marketParams)`。反向（`Id` → 参数）是 `idToMarketParams`。

### 相关常量

这些是接口的编译时常量，不是可调整参数——没有治理调用可以更改它们。

| 常量 | 值 | 角色 |
| --- | --- | --- |
| `WAD` | `1e18` | 固定点比例用于利率、费用和 `lltv`。 |
| `ORACLE_PRICE_SCALE` | `1e36` | 用于健康/清算数学的内部价格比例。 |
| `MAX_FEE` | `0.25e18` (25%) | 任何市场费用的上限。 |
| `LIQUIDATION_CURSOR` | `0.3e18` | 清算激励公式的输入。 |
| `MAX_LIQUIDATION_INCENTIVE_FACTOR` | `1.15e18` | 清算激励因子的上限。 |

---

## Lista 特定扩展

这些控制是 Morpho Blue 基础上的附加内容，是 Moolah 与普通部署的区别所在。

### 最低贷款底线（`minLoanValue` / `minLoan`）

```solidity
function minLoan(MarketParams memory marketParams) external view returns (uint256);
function minLoanValue() external view returns (uint256);
```

`minLoanValue` 是以预言机的 8 位小数 USD 单位表示的协议范围内的底线。`minLoan(marketParams)` 使用预言机价格和代币小数将其转换为市场的贷款代币金额。提供、借款和还款都强制执行一个 **非零** 结果头寸保持在或高于此底线，这防止了不经济的清算尘埃头寸。该值是当前的、可由管理者调整的链上值（`setMinLoanValue`，`MANAGER` 角色），而不是固定承诺。

### 清算白名单

```solidity
function getLiquidationWhitelist(Id id) external view returns (address[] memory);
function isLiquidationWhitelist(Id id, address account) external view returns (bool);
```

每个市场的合格清算人的允许列表。当市场的列表 **为空时，清算对任何人开放**；一旦添加任何地址，只有列出的地址可以调用该市场的 `liquidate`。

第三方清算人不应直接在此合约上调用 `liquidate`——通过 `PublicLiquidator` 进行。到达此处受限的市场需要 **双方** 对齐：`BOT` 必须在 `PublicLiquidator` 上打开市场或借款人，*并且* `PublicLiquidator` 本身必须在此市场的 `liquidationWhitelist` 上。参见 [Liquidator Integration](liquidator-integration.md)。

### 提供/借款白名单

```solidity
function getWhiteList(Id id) external view returns (address[] memory);
function isWhiteList(Id id, address account) external view returns (bool);
```

可选的每个市场门控 `supply`、`supplyCollateral` 和 `borrow`（针对 `onBehalf` 检查）。一个 **空列表意味着市场开放**；非空列表将这些操作限制为列出的账户。

### Vault 和闪电贷黑名单

```solidity
function vaultBlacklist(address account) external view returns (bool);
function flashLoanTokenBlacklist(address token) external view returns (bool);
```

`vaultBlacklist` 阻止黑名单上的 `onBehalf` 接收新的供给。`flashLoanTokenBlacklist` 禁用特定代币的 `flashLoan`。

### 提供者和经纪人路由

```solidity
function providers(Id id, address token) external view returns (address);
function brokers(Id id) external view returns (address);
```

一个 **提供者** 是每个市场和代币注册的，其效果取决于它支持的代币。一个 **抵押品代币** 提供者是一个独占门控：设置时，只有提供者可以调用 `supplyCollateral`/`withdrawCollateral`（并且在提取时 `receiver` 必须是提供者）。一个 **贷款代币** 提供者不是一个独占门控——它只限制借款接收者：如果贷款代币提供者是 `borrow` 调用者，`receiver` 必须是提供者；普通授权借款人不受影响，普通的贷款资产 `supply`/`withdraw` 从不受提供者门控。一个 **经纪人** 是每个市场注册的，当存在时，门控借款和还款发起——只有经纪人可以 `borrow` 或 `repay`。对于经纪人市场，`_isHealthy` 仍然使用 **普通市场价格**（`_getPrice` 使用 `user = address(0)`）定价抵押品，但用经纪人的总债务（Moolah 本金 + 在经纪人处累积的利息）替换借款人的债务；`liquidateBrokerPosition` 是一个单独的经纪人专用坏账记账，不执行健康检查（健康责任在于经纪人）。`setMarketBroker` 验证经纪人的 `LOAN_TOKEN`、`COLLATERAL_TOKEN` 和 `MARKET_ID` 是否与市场匹配。参见 [Integration Patterns](integration-patterns.md) 了解这些层如何组合。

### 弹性预言机路由

市场通过 `MarketParams` 中的 `oracle` 读取价格，公开 `peek(address asset)`。每个市场命名自己的预言机，因此哪个合约回答——是一个 **弹性预言机** 聚合每个资产的主/枢轴/后备来源，还是一个特定资产的适配器——是每个市场的配置；读取 `marketParams.oracle` 并将其与 [Standard Collaterals](../multi-oracle-standard.md) / [bStock Collaterals](../multi-oracle-bstock.md) 表进行检查。当存在经纪人并提供用户地址时，价格解析通过经纪人路由，因此有效价格反映用户的固定期限/固定利率头寸；健康检查否则使用普通预言机价格。预言机选择是每个市场的安全责任。参见 [Consuming Oracle Prices](../multi-oracle/consuming-prices.md)。

### 重入保护

核心变异入口点——`supply`、`withdraw`、`borrow`、`repay`、`supplyCollateral`、`withdrawCollateral`、`liquidate` 和 `liquidateBrokerPosition`——是 `nonReentrant`。`flashLoan` 故意 **不是** `nonReentrant`（其安全性来自同一交易的还款不变量）。上述所有内容还额外受 `whenNotPaused` 约束。

### 暂停，以及对您的意义

暂停是可以停止每个 `whenNotPaused` 入口点的特权控制：`PAUSER` 可以停止供给、提取、借款、还款、抵押品移动、清算和 `flashLoan`。视图不受影响。处理其恢复。它不是唯一可以在您之下更改的状态——`providers`、`brokers` 和 `minLoanValue` 是单独的映射/变量，不是 `MarketParams` 或 `Market` 的一部分，因此 `market()` 或 `idToMarketParams()` 读取不会告诉您它们是否也已更改；重新读取它们，或观看 [Events & Callbacks](events-and-callbacks.md)，而不是假设缓存的读取仍然有效。`createMarket` 还在任何 `OPERATOR` 存在时受到限制。

其他所有内容——启用 IRMs 和 LLTVs、设置费用、白名单、提供者、经纪人、`minLoanValue` 和合约升级——都是角色门控的，因此第三方无法调用其中任何一个。升级权限位于 OpenZeppelin `TimelockController` 之后——在其上读取 `getMinDelay()` 以获取生效的延迟。