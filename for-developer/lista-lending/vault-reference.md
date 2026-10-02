# Vault Reference (MoolahVault)

`MoolahVault` 是 Moolah 上的 ERC-4626 层：供应商存入一种贷款资产，策展人将其分配到各个市场，股份累积混合收益。可以通过以下界面**直接**调用 vault —— 从 Solidity 或任何无法使用 [SDK](../sdk.md) 的栈中调用。

有关已部署的 vault 地址，请参阅 [Smart Contract](smart-contract.md)。有关市场级别的合约，请参阅 [Contract & Interface Reference](contract-reference.md)；有关读取端的 REST API，请参阅 [Vault API](../services/lending-api/vault.md)。

---

## 在您存款之前：可能阻止您的三个因素

这些是导致存款失败的原因，而普通的 ERC-4626 客户端可能不会预料到。

**1. Vault 可能有白名单。** `deposit` 和 `mint` 都需要 `isWhiteList(receiver)`。检查条件是 `whiteList.length() == 0 || whiteList.contains(account)` —— **空列表意味着对所有人开放**，这是常见情况。一旦添加了任何地址，只有列出的接收者才能被铸造。假设之前请先读取：

```solidity
function isWhiteList(address account) external view returns (bool);
function getWhiteList() external view returns (address[] memory);
```

被阻止的存款会触发 `NotWhiteList()`。请注意，限制在于**接收者**，而不是调用者，因此代表他人存款受限于*他们*的状态。

**2. 容量是有限的，并且不是 `totalAssets`。** 供应队列中的每个市场都有一个上限，vault 只能吸收队列仍能容纳的部分。`maxDeposit` 遍历供应队列并汇总剩余空间：

```solidity
function maxDeposit(address) external view returns (uint256);
function maxMint(address) external view returns (uint256);
```

在确定存款大小之前调用 `maxDeposit`；超过它会触发 `AllCapsReached()`。当供应队列中包含同一市场两次时，`maxDeposit` 和 `maxMint` 都可能**过度报告** —— 该市场的余量会被每个条目计数一次。将其视为上限而不是承诺，并留出余量：精确等于 `maxDeposit` 的存款仍可能被拒绝。

**3. 提现受可达流动性限制，而不是您的余额。** vault 提现按提现队列顺序从市场中提取，流动性完全借出的市场无法提取。因此，持有者的股份在那一刻并不总是可以全部赎回：

```solidity
function maxWithdraw(address owner) external view returns (uint256);
function maxRedeem(address owner) external view returns (uint256);
```

超过可达金额会触发 `NotEnoughLiquidity()`。由于股份/资产四舍五入，这两个视图可能**低估**，因此将它们视为安全的下限。**不要将用户的全部股份余额视为可提现** —— 请引用 `maxWithdraw`。

---

## ERC-4626 界面

标准，具有通常的语义：

```solidity
function asset() external view returns (address);
function totalAssets() external view returns (uint256);

function deposit(uint256 assets, address receiver) external returns (uint256 shares);
function mint(uint256 shares, address receiver) external returns (uint256 assets);
function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
```

**批准 vault 本身**进行 `deposit` / `mint` —— 它通过 `transferFrom` 拉取资产。`withdraw` 和 `redeem` 从非调用者的 `owner` 消耗 ERC-20 的股份授权，符合标准。

`convertTo*` / `preview*` 转换考虑了尚未铸造的绩效费股份，因此在费用累积前获取的报价可能与结算时略有不同。要获得精确数字，请模拟调用。

`totalAssets` **不**扣除费用 —— 费用通过铸造股份给费用接收者来收取，而不是通过减少资产。它确实减去经纪人利息锁定缓冲区的 `currentLocked()`，因此它不仅仅是 vault 市场头寸的总和。

### 两个非标准助手

```solidity
function withdrawFor(uint256 assets, address owner, address sender) external returns (uint256 shares);
function redeemFor(uint256 shares, address owner, address sender) external returns (uint256 assets);
```

这些存在于提供商路由的流程中 —— 请参阅 [Providers](providers.md)，这是原生 BNB 到达 WBNB vault 的方式。

---

## 读取 vault 的分配

```solidity
function supplyQueueLength() external view returns (uint256);
function withdrawQueueLength() external view returns (uint256);
```

供应队列决定存款的去向；提现队列决定提现的可达性，按顺序。两者均由分配器管理（`setSupplyQueue`、`updateWithdrawQueue` 和 `reallocate` —— 最后一个也可以由机器人角色调用），而它们背后的每个市场上限由策展人管理（`setCap`、`setMarketRemoval`）。所有这些都是角色限制的，并且会在没有通知的情况下更改 —— 请读取队列而不是缓存它们。

每个市场的上限和队列更改可观察为事件；请参阅 [Events & Callbacks](events-and-callbacks.md) 了解 vault 事件集，包括 `SetCap`、`SetSupplyQueue` 和 `SetWithdrawQueue`。

---

## 回滚

| 错误 | 原因 |
| --- | --- |
| `NotWhiteList()` | **接收者**不在非空 vault 白名单上。 |
| `AllCapsReached()` | 供应队列中的每个市场都达到了其上限。 |
| `SupplyCapExceeded(Id)` | **重新分配**会将一个市场推过其上限 —— 分配器错误，而不是存款错误。存款会限制在上限并触发 `AllCapsReached()`。 |
| `NotEnoughLiquidity()` | 提现队列目前无法达到足够的流动性。 |
| `MarketNotEnabled(Id)` · `UnauthorizedMarket(Id)` | 该市场未启用此 vault —— 与策展人调用相关，而不是普通存款。 |
| `InconsistentAsset(Id)` | 市场的贷款代币与 vault 的 `asset()` 不匹配。 |