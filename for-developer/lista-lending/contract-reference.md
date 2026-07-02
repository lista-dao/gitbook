# Contract & Interface Reference

This page is the interface-level reference for the **Moolah** core contract — the singleton that holds every Lista Lending market. It is intended for auditors, security researchers, and integrators calling the contract directly (e.g. from Solidity, or from a non-TypeScript stack that cannot use the [SDK](../sdk.md)).

Moolah is powered by Morpho and built on the Morpho Blue smart contracts, then extended with Lista-specific controls. Every market — regardless of collateral, oracle, or IRM — lives inside this one contract and is addressed by a market `Id`. For deployed addresses, see the [Smart Contract](smart-contract.md) reference; this page does not restate address tables. For higher-level flows see [Integration Patterns](integration-patterns.md); for the callback interfaces and emitted events see [Events & Callbacks](events-and-callbacks.md).

All facts below are derived from `src/moolah/Moolah.sol` and `src/moolah/interfaces/IMoolah.sol`.

---

## Types & structs

### `Id`

```solidity
type Id is bytes32;
```

A market's identifier is the `keccak256` hash of the ABI-encoded `MarketParams` (five 32-byte words, in struct order). Two markets with identical parameters therefore collapse to the same `Id`.

```solidity
Id id = Id.wrap(keccak256(abi.encode(marketParams)));
```

The same value is exposed on-chain via the `idToMarketParams(Id)` view (the reverse mapping) and is used as the key for `position`, `market`, providers, brokers, and both whitelists.

### `MarketParams`

The immutable definition of a market. Once created, these values cannot change; a new combination is simply a new market.

| Field | Type | Meaning |
| --- | --- | --- |
| `loanToken` | `address` | The asset supplied and borrowed. |
| `collateralToken` | `address` | The asset posted as collateral. |
| `oracle` | `address` | Price source; must expose `peek(address)` returning an 8-decimal price. |
| `irm` | `address` | Interest Rate Model. Must be enabled via `isIrmEnabled`. |
| `lltv` | `uint256` | Liquidation Loan-To-Value, scaled by `WAD` (`1e18`). Must be enabled via `isLltvEnabled`. |

### `Position`

Per-user, per-market state: `mapping(Id => mapping(address => Position))`.

| Field | Type | Meaning |
| --- | --- | --- |
| `supplyShares` | `uint256` | Supply-side shares owned by the user. |
| `borrowShares` | `uint128` | Borrow-side (debt) shares owed by the user. |
| `collateral` | `uint128` | Collateral balance posted by the user. |

> For `feeRecipient`, `supplyShares` does not include fee shares accrued since the last interest accrual.

### `Market`

Aggregate per-market accounting: `mapping(Id => Market)`.

| Field | Type | Meaning |
| --- | --- | --- |
| `totalSupplyAssets` | `uint128` | Total supplied assets (excl. interest since last accrual). |
| `totalSupplyShares` | `uint128` | Total supply shares outstanding. |
| `totalBorrowAssets` | `uint128` | Total borrowed assets (excl. interest since last accrual). |
| `totalBorrowShares` | `uint128` | Total borrow shares outstanding. |
| `lastUpdate` | `uint128` | Timestamp of the last interest accrual. A non-zero value means the market exists. |
| `fee` | `uint128` | Market fee on interest, scaled by `WAD`. Capped at `MAX_FEE`. |

Shares use OpenZeppelin's virtual-shares method (`VIRTUAL_SHARES = 1e6`, `VIRTUAL_ASSETS = 1`) to mitigate share-price manipulation; conversions round in the protocol's favor.

### `Authorization` & `Signature`

Used by `setAuthorizationWithSig` for gasless (EIP-712) authorization delegation.

| `Authorization` field | Type | Meaning |
| --- | --- | --- |
| `authorizer` | `address` | The account granting authorization (and the recovered signer). |
| `authorized` | `address` | The account being authorized to manage `authorizer`'s positions. |
| `isAuthorized` | `bool` | The authorization value to set. |
| `nonce` | `uint256` | Must equal `authorizer`'s current `nonce`; prevents replay. |
| `deadline` | `uint256` | Signature expiry timestamp. |

`Signature` is a standard `{ uint8 v; bytes32 r; bytes32 s; }`. The EIP-712 domain is `EIP712Domain(uint256 chainId,address verifyingContract)`; the type hash is `Authorization(address authorizer,address authorized,bool isAuthorized,uint256 nonce,uint256 deadline)`. The current chain's separator is readable via `domainSeparator()`.

---

## Core external functions

Signatures below are exact. Where a function takes both `assets` and `shares`, **exactly one must be zero** (enforced by `exactlyOneZero`); the other side is derived by the shares math.

### Market creation

```solidity
function createMarket(MarketParams memory marketParams) external;
```

Creates a market. Reverts unless `irm` and `lltv` are enabled, `loanToken`/`collateralToken`/`oracle` are non-zero, and the market does not already exist. Records `lastUpdate = block.timestamp`, sets the market `fee` to `defaultMarketFee`, stores the reverse mapping, probes the oracle for both tokens, and initializes the IRM. Emits `CreateMarket`. When the `OPERATOR` role has members, only an `OPERATOR` may create markets; otherwise creation is permissionless.

### Supply / withdraw (loan-side liquidity)

```solidity
function supply(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, bytes memory data)
  external returns (uint256 assetsSupplied, uint256 sharesSupplied);
```

Supplies loan assets on behalf of `onBehalf`, minting supply shares. Accrues interest first. If `data` is non-empty, calls back `onMoolahSupply` on the caller before pulling tokens via `transferFrom`. Subject to the per-market whitelist and vault blacklist, and to the `minLoan` floor on the resulting position.

```solidity
function withdraw(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, address receiver)
  external returns (uint256 assetsWithdrawn, uint256 sharesWithdrawn);
```

Burns supply shares of `onBehalf` and sends assets to `receiver`. Caller must be `onBehalf` or authorized. Reverts if it would push `totalBorrowAssets` above `totalSupplyAssets` (`insufficient liquidity`).

### Borrow / repay (debt-side)

```solidity
function borrow(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, address receiver)
  external returns (uint256 assetsBorrowed, uint256 sharesBorrowed);
```

Borrows loan assets against `onBehalf`'s collateral and sends them to `receiver`. Accrues interest, then requires the resulting position to be healthy (`_isHealthy`) and the market to keep `totalBorrowAssets <= totalSupplyAssets`. Access depends on the market's routing: if a **broker** is set, only the broker may borrow (and must be the receiver); else if the caller is the market's **provider**, the receiver must be that provider; otherwise the caller must be `onBehalf` or authorized. Subject to the whitelist and the `minLoan` floor.

```solidity
function repay(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, bytes memory data)
  external returns (uint256 assetsRepaid, uint256 sharesRepaid);
```

Repays `onBehalf`'s debt, burning borrow shares. Accrues interest first; if `data` is non-empty, calls back `onMoolahRepay` before pulling tokens. If a broker is set for the market, only the broker may repay. A partial repay that would leave debt below `minLoan` reverts.

### Collateral management

```solidity
function supplyCollateral(MarketParams memory marketParams, uint256 assets, address onBehalf, bytes memory data) external;
```

Posts collateral for `onBehalf`. Does **not** accrue interest (not required, saves gas). If a provider is set for the collateral token, only the provider may call. If `data` is non-empty, calls back `onMoolahSupplyCollateral` before pulling tokens. Subject to the whitelist.

```solidity
function withdrawCollateral(MarketParams memory marketParams, uint256 assets, address onBehalf, address receiver) external;
```

Withdraws collateral to `receiver`. Accrues interest, then requires the position to remain healthy. If a provider is set, only the provider may call (and must be the receiver); otherwise the caller must be `onBehalf` or authorized.

### Liquidation

```solidity
function liquidate(MarketParams memory marketParams, address borrower, uint256 seizedAssets, uint256 repaidShares, bytes memory data)
  external returns (uint256 seized, uint256 repaid);
```

Liquidates an unhealthy `borrower`. Exactly one of `seizedAssets` / `repaidShares` must be zero; the other is derived using the liquidation incentive factor `min(MAX_LIQUIDATION_INCENTIVE_FACTOR, 1 / (1 - LIQUIDATION_CURSOR * (1 - lltv)))`. Accrues interest, checks the position is unhealthy at the oracle price, seizes collateral to the caller, and pulls the repaid loan assets. If collateral reaches zero, remaining debt is realized as bad debt against the market's supply side. Gated by the per-market **liquidation whitelist**. If `data` is non-empty, `onMoolahLiquidate` is called before the repay transfer.

```solidity
function liquidateBrokerPosition(MarketParams memory marketParams, address borrower, uint256 badDebtShares)
  external returns (uint256 seized, uint256 repaid);
```

Broker-only path to write down `badDebtShares` of a broker-market borrower against the market's supply side — the loss is socialized across all suppliers by reducing `totalSupplyAssets`, and the fee recipient's position is not touched. Callable only by the market's broker; this path performs **no** health check, so the broker is responsible for determining that the position is unhealthy.

### Flash loans

```solidity
function flashLoan(address token, uint256 assets, bytes calldata data) external;
```

Transfers `assets` of `token` to the caller, invokes `onMoolahFlashLoan`, then pulls the same `assets` back in the same transaction. Has access to the contract's entire balance of `token` (all markets' liquidity and collateral combined). The flash **fee is zero**. Reverts if the token is on the flash-loan blacklist or `assets` is zero. Not ERC-3156 compliant. Note this function is `whenNotPaused` but is **not** guarded by `nonReentrant` (unlike supply/withdraw/borrow/repay/collateral/liquidate).

### Authorization

```solidity
function setAuthorization(address authorized, bool newIsAuthorized) external;
function setAuthorizationWithSig(Authorization calldata authorization, Signature calldata signature) external;
```

`setAuthorization` sets whether `authorized` may manage `msg.sender`'s positions across all markets. `setAuthorizationWithSig` does the same via an EIP-712 signature, consuming the authorizer's `nonce` and requiring `block.timestamp <= deadline`. Anyone may always manage their own positions regardless of these flags.

### Interest accrual

```solidity
function accrueInterest(MarketParams memory marketParams) external;
```

Permissionlessly accrues interest for a market: queries `borrowRate` from the IRM, compounds it over the elapsed time (three-term Taylor approximation of continuous compounding), grows `totalBorrowAssets`/`totalSupplyAssets`, and mints fee shares to `feeRecipient` when the market `fee` is non-zero. Emits `AccrueInterest`. The interest-bearing entry points — `supply`, `withdraw`, `borrow`, `repay`, `withdrawCollateral`, and `liquidate` — accrue interest internally before touching balances. `supplyCollateral` deliberately skips accrual (collateral neither earns nor owes interest, so it saves gas), and `flashLoan` does not accrue.

---

## View functions

| View | Signature | Returns |
| --- | --- | --- |
| Position | `position(Id id, address user)` | The `Position` struct for a user in a market. |
| Market | `market(Id id)` | The `Market` accounting struct. |
| Params by id | `idToMarketParams(Id id)` | The `MarketParams` for a market (reverse of the `Id` hash). |
| Authorization | `isAuthorized(address authorizer, address authorized)` | Whether `authorized` may manage `authorizer`'s positions. |
| Nonce | `nonce(address authorizer)` | The authorizer's current EIP-712 nonce. |
| Domain separator | `domainSeparator()` | The EIP-712 domain separator for the current chain. |
| Health | `isHealthy(MarketParams, Id, address borrower)` | Whether a borrower's position is healthy. |
| Price | `getPrice(MarketParams)` | Collateral price in loan-asset terms, scaled by `10 ** (36 + quoteDecimals - baseDecimals)`. |
| IRM enabled | `isIrmEnabled(address irm)` | Whether an IRM may be used for new markets. |
| LLTV enabled | `isLltvEnabled(uint256 lltv)` | Whether an LLTV may be used for new markets. |
| Fee recipient | `feeRecipient()` | The global fee recipient. |
| Default fee | `defaultMarketFee()` | Fee applied to newly created markets. |

**Computing a market `Id`** off-chain is `keccak256(abi.encode(loanToken, collateralToken, oracle, irm, lltv))`; on-chain the equivalent is `MarketParamsLib.id(marketParams)`. The reverse (`Id` → params) is `idToMarketParams`.

### Relevant constants

Verified from `ConstantsLib.sol` / `MathLib.sol`. These are compile-time constants of the interface, not adjustable parameters.

| Constant | Value | Role |
| --- | --- | --- |
| `WAD` | `1e18` | Fixed-point scale for rates, fees, and `lltv`. |
| `ORACLE_PRICE_SCALE` | `1e36` | Internal price scale used in health/liquidation math. |
| `MAX_FEE` | `0.25e18` (25%) | Upper bound on any market fee. |
| `LIQUIDATION_CURSOR` | `0.3e18` | Input to the liquidation incentive formula. |
| `MAX_LIQUIDATION_INCENTIVE_FACTOR` | `1.15e18` | Cap on the liquidation incentive factor. |

---

## Lista-specific extensions

These controls are additions on top of the Morpho Blue base and are what distinguishes Moolah from a vanilla deployment. See also [Protocol Extensions](protocol-extensions.md) for the conceptual overview.

### Minimum loan floor (`minLoanValue` / `minLoan`)

```solidity
function minLoan(MarketParams memory marketParams) external view returns (uint256);
function minLoanValue() external view returns (uint256);
```

`minLoanValue` is a protocol-wide floor denominated in the oracle's 8-decimal USD unit. `minLoan(marketParams)` converts it into the market's loan-token amount using the oracle price and token decimals. Supply, borrow, and repay all enforce that a **non-zero** resulting position stays at or above this floor, which prevents dust positions that are uneconomical to liquidate. The value is a current, manager-adjustable on-chain value (`setMinLoanValue`, `MANAGER` role), not a fixed promise.

### Liquidation whitelist

```solidity
function batchToggleLiquidationWhitelist(Id[] memory ids, address[][] memory accounts, bool isAddition) external; // MANAGER
function getLiquidationWhitelist(Id id) external view returns (address[] memory);
function isLiquidationWhitelist(Id id, address account) external view returns (bool);
```

Per-market allowlist of eligible liquidators. When a market's list is **empty, liquidation is open to anyone**; once any address is added, only listed addresses may call `liquidate` for that market.

### Supply/borrow whitelist

```solidity
function setWhiteList(Id id, address account, bool isAddition) external; // MANAGER
function getWhiteList(Id id) external view returns (address[] memory);
function isWhiteList(Id id, address account) external view returns (bool);
```

Optional per-market gate on `supply`, `supplyCollateral`, and `borrow` (checked against `onBehalf`). An **empty list means the market is open**; a non-empty list restricts these actions to listed accounts.

### Vault & flash-loan blacklists

```solidity
function setVaultBlacklist(address account, bool isBlacklisted) external;         // MANAGER
function vaultBlacklist(address account) external view returns (bool);
function setFlashLoanTokenBlacklist(address token, bool isBlacklisted) external;  // MANAGER
function flashLoanTokenBlacklist(address token) external view returns (bool);
```

`vaultBlacklist` blocks a blacklisted `onBehalf` from receiving new supply. `flashLoanTokenBlacklist` disables `flashLoan` for a specific token.

### Providers & brokers routing

```solidity
function setProvider(Id id, address provider, bool isAddition) external;      // MANAGER
function providers(Id id, address token) external view returns (address);
function setMarketBroker(Id id, address broker, bool isAddition) external;    // MANAGER
function brokers(Id id) external view returns (address);
```

A **provider** is registered per market and token, and its effect depends on which token it backs. A **collateral-token** provider is an exclusive gate: when set, only the provider may call `supplyCollateral`/`withdrawCollateral` (and on withdraw the `receiver` must be the provider). A **loan-token** provider is *not* an exclusive gate — it only constrains the borrow receiver: if the loan-token provider is the `borrow` caller, `receiver` must be the provider; ordinary authorized borrowers are unaffected, and plain `supply`/`withdraw` of the loan asset are never provider-gated. A **broker** is registered per market and, when present, gates borrow and repay origination — only the broker may `borrow` or `repay`. For a broker market, `_isHealthy` still prices collateral with the **plain market price** (`_getPrice` with `user = address(0)`) but replaces the borrower's debt with the broker's total debt (Moolah principal + interest accrued at the broker); `liquidateBrokerPosition` is a separate broker-only bad-debt write-down that performs **no** health check (health responsibility sits with the broker). `setMarketBroker` validates that the broker's `LOAN_TOKEN`, `COLLATERAL_TOKEN`, and `MARKET_ID` match the market. See [Integration Patterns](integration-patterns.md) for how these layers compose.

### Resilient oracle routing

Markets read prices through the `oracle` in `MarketParams`, which exposes `peek(address asset)` returning an 8-decimal price. Lista typically points this at a **Resilient Oracle** that aggregates a main / pivot / fallback source per asset with a freshness tolerance, and at asset-specific adaptors for tokens such as `slisBNB`. When a broker is present and a user address is supplied, price resolution can route through the broker so the effective price reflects the user's fixed-term/fixed-rate position; health checks otherwise use the plain oracle price. Oracle selection is a per-market safety responsibility. See [Multi-Oracle](../multi-oracle.md).

### Reentrancy guard

The core mutating entry points — `supply`, `withdraw`, `borrow`, `repay`, `supplyCollateral`, `withdrawCollateral`, `liquidate`, and `liquidateBrokerPosition` — are `nonReentrant`. `flashLoan` is intentionally **not** `nonReentrant` (its safety comes from the same-transaction repayment invariant). All of the above are additionally `whenNotPaused`.

### Role-based access & pausing

Moolah uses OpenZeppelin `AccessControlEnumerable`. Privileged operations are gated by role, never by a hard-coded address:

| Role | Scope (examples) |
| --- | --- |
| `DEFAULT_ADMIN_ROLE` | Authorizes contract upgrades; root of role administration. |
| `MANAGER` | Enables IRMs/LLTVs, sets fees, whitelists/blacklists, providers/brokers, `minLoanValue`, unpause. |
| `PAUSER` | Pauses the contract (halting the `whenNotPaused` functions). |
| `OPERATOR` | When any `OPERATOR` exists, gates `createMarket`. |

Pausing (`pause`/`unpause`) freezes the guarded entry points without affecting views.

### Upgradeability

Moolah is a UUPS-upgradeable contract (`UUPSUpgradeable`), initialized once via `initialize(admin, manager, pauser, minLoanValue)` with the constructor disabled. Upgrades are authorized only by `DEFAULT_ADMIN_ROLE` (`_authorizeUpgrade`). Operationally, upgrade authority is held behind a timelock; see [Protocol Extensions](protocol-extensions.md).

---

## See also

- [Integration Patterns](integration-patterns.md) — provider and broker layers, and how direct calls route through them.
- [Events & Callbacks](events-and-callbacks.md) — the `onMoolah*` callback interfaces and emitted events for indexers.
- [Protocol Extensions](protocol-extensions.md) — conceptual overview of the Lista-specific controls.
- [Smart Contract](smart-contract.md) — deployed contract addresses.
- [Moolah Lending SDK](../sdk.md) — the TypeScript path that wraps these calls.
