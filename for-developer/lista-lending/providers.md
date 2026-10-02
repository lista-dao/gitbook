# Providers

**Provider** 是一个注册在市场和代币上的合约，负责接管部分流程。当设置了抵押代币的 provider 时，Moolah 将其设为**独占网关**：只有 provider 可以调用 `supplyCollateral` / `withdrawCollateral` 来处理该市场，直接调用将会回退。因此，对于这些抵押品，provider *就是* 集成接口。

要了解哪个 provider 支持哪个抵押品，请参阅 [Integration Patterns](integration-patterns.md)；有关已部署地址，请参阅 [Smart Contract](smart-contract.md)。

在构建之前，检查市场是否被 provider 限制：

```solidity
function providers(Id id, address token) external view returns (address);
```

抵押代币的非零结果意味着您必须通过它进行路由。

---

## BNBProvider — native BNB

Lista 的 BNB 金库持有 **WBNB**。`BNBProvider` 是一个包装器，允许用户在一次调用中存入原生 BNB 并接收金库份额，并在退出时解包。没有它，您必须先自己将 BNB 包装成 WBNB；直接发送 BNB 到金库将不起作用。

```solidity
function deposit(address receiver) external payable returns (uint256 shares);
function mint(uint256 shares, address receiver) external payable returns (uint256 assets);
function withdraw(uint256 assets, address payable receiver, address owner) external returns (uint256 shares);
function redeem(uint256 shares, address payable receiver, address owner) external returns (uint256 assets);
```

金额是 `msg.value` — `deposit` 上没有资产参数。在 `mint` 上，您至少需要发送预览的成本 (`msg.value >= previewAssets`，否则 `invalid BNB amount`)，多余的部分将被退还。

每个实例**绑定到一个金库**，因此选择为您目标的金库部署的那个。

较新的实现增加了多金库形式，但**并非每个已部署的 provider 都运行它** — 以下调用在某些列出的地址中不存在，并在这些地址中返回空的 returndata。首先探测 `vaults`；如果它回退，您有一个单金库实例，并且只有上面的四个签名存在。

```solidity
function deposit(address vault, address receiver) external payable returns (uint256 shares);
function mint(address vault, uint256 shares, address receiver) external payable returns (uint256 assets);
function vaults(address vault) external view returns (bool);
```

在该实现中，`vaults(v)` 必须为 `true`，否则调用将回退 `vault not added` — 包括单参数形式，它通过 provider 自己的 `MOOLAH_VAULT` 路由。因此，从未注册的默认金库甚至会使 `deposit(receiver)` 回退。

无论哪种方式，金库自己的白名单仍然适用于**接收者** — 请参阅 [Vault Reference](vault-reference.md)。

**在退出时，无需批准任何操作。** `withdraw` 和 `redeem` 不会提取您的份额：provider 调用金库的 `withdrawFor` / `redeemFor`，只有注册的 provider 可以调用，金库直接从 `owner` 烧毁。提取您自己的头寸不需要任何授权。提取他人的需要*该所有者*已向**您** — 原始调用者，而不是 provider — 授予金库份额代币的 ERC-20 授权。

---

## SlisBNBProvider — slisBNB collateral

slisBNB 抵押品是 provider 限制的，因此这些是*您*可以自愿移动它的唯一方式 — 清算是一个单独的路径，直接扣押它，完全绕过 provider：

```solidity
function supplyCollateral(
  MarketParams memory marketParams,
  uint256 assets,
  address onBehalf,
  bytes calldata data
) external;

function withdrawCollateral(
  MarketParams memory marketParams,
  uint256 assets,
  address onBehalf,
  address receiver
) external;
```

**批准 provider**，而不是 Moolah — 它通过 `transferFrom` 从您那里提取 slisBNB。`marketParams.collateralToken` 必须是 slisBNB（否则 `invalid collateral token`），并且 `assets` 必须为非零。

在提款时，调用者必须是 `onBehalf` 或被授权（`unauthorized sender`）。

清算是*用户面对*网关的例外：Moolah 将扣押的抵押品直接转移给清算人，然后调用 provider 的 `liquidate(id, borrower)` 钩子。因此，抵押品可以在没有人调用 `withdrawCollateral` 的情况下离开头寸 — 但 provider 仍然被调用，并且在 `SlisBNBProvider` 上，该钩子重新同步头寸并烧毁相应的 `slisBNBx`，因此 Launchpool 资格跟随清算。

通过此 provider 提供还会铸造不可转让的 `slisBNBx` 证书，该证书携带 Binance Launchpool 资格，提款时会烧毁它。持有它的代理人，以及如何更改它，涵盖在 [slisBNBx Delegation](../clisbnb/delegation.md) — 包括证书仅涵盖用户部分，而不是费用部分。

---

## SmartProvider — StableSwap LP collateral

对于 Smart Lending 的 provider，请访问 [Smart Lending & StableSwap](stableswap-integration.md) — 它涵盖了供应/提款变体、价格差异保护和抵押代币的转移限制。

---

## 另请参阅

- [Contract & Interface Reference](contract-reference.md) — Moolah 强制执行的 provider 网关。