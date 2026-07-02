# Moolah Lending SDK (TypeScript)

The Moolah Lending SDK is the canonical TypeScript integration path for Lista Lending (Moolah) on BNB Chain and Ethereum. It is published on public npm under the `@lista-dao` scope and is MIT-licensed.

The SDK is **wallet-agnostic and transport-light**: read methods call the chain (via [viem](https://viem.sh)) or the public Lista API, and write methods return an array of plain transaction-step descriptors (`StepParam[]`) that you execute with your own wallet client. The SDK never holds keys, never signs, and never broadcasts on your behalf.

For the contract-level mechanics behind these calls, see [Integration Patterns](lista-lending/integration-patterns.md) and the [Smart Contract](lista-lending/smart-contract.md) reference. For the underlying REST surface, see the [Moolah Lending API](services/lending-api/README.md).

---

## Packages

| Package | Version | Description |
| --- | --- | --- |
| [`@lista-dao/moolah-sdk-core`](https://www.npmjs.com/package/@lista-dao/moolah-sdk-core) | `1.0.12` | Core types, pure calculation/simulation functions, contract ABIs, the `Decimal` precision utility, and `MoolahApiClient`. No wallet or chain dependency for the pure functions. |
| [`@lista-dao/moolah-lending-sdk`](https://www.npmjs.com/package/@lista-dao/moolah-lending-sdk) | `1.0.11` | The high-level `MoolahSDK` builder. Reads chain/API data and returns transaction steps (`StepParam[]`). Re-exports a curated subset of the core package (`Decimal`, `MoolahApiClient`, contract-address helpers, builder step functions, and types). |

`moolah-lending-sdk` depends on `moolah-sdk-core`, so installing the lending SDK pulls the core package in and re-exports a curated convenience subset of it — the core types, `Decimal`, `MoolahApiClient`, and the contract-address helpers. The pure **simulate functions**, interest-rate helpers, and contract **ABIs** are *not* re-exported; import those directly from `@lista-dao/moolah-sdk-core` (as the examples below do). Install `moolah-sdk-core` on its own if you only want the pure calculation/type layer without the builder.

## Installation

```bash
# For integrators building transactions with their own wallet
pnpm add @lista-dao/moolah-lending-sdk

# For core utilities / types / ABIs only
pnpm add @lista-dao/moolah-sdk-core
```

The SDK targets ES modules (`"type": "module"`) and ships its own type declarations. `viem` is a peer of the transaction-building flow; install it in your app if you plan to execute the returned steps.

```bash
pnpm add viem
```

## Initializing the SDK

`MoolahSDK` is configured with per-chain RPC URLs keyed by numeric chain ID.

```typescript
import { MoolahSDK } from "@lista-dao/moolah-lending-sdk";

const sdk = new MoolahSDK({
  rpcUrls: {
    56: "https://bsc-dataseed.binance.org", // BSC mainnet
    1: "https://eth.llamarpc.com",          // Ethereum mainnet
  },
});
```

| Config field | Type | Notes |
| --- | --- | --- |
| `rpcUrls` | `Record<string, string \| string[]>` | RPC endpoint(s) per chain ID. Pass an array to use multiple endpoints for a chain. **Required.** |
| `apiBaseUrl` | `string` | Override the Lista API base URL used by API-backed read methods. Defaults to the public production API. |
| `publicClients` | `Record<string, PublicClient>` | Supply your own viem `PublicClient` per chain ID instead of having the SDK build one from `rpcUrls`. |
| `transport` / `transportByChainId` | `SdkTransportConfig` | Optional `timeout`, `retryCount`, `retryDelay` tuning, globally or per chain ID. |

> **Networks.** Lista Lending runs on BNB Chain (chain ID `56`) and Ethereum (chain ID `1`). The SDK accepts a chain ID anywhere a `chainId` argument is shown below.

`sdk.getApiChain(chainId)` maps a chain ID to the string the API expects (`"bsc"` or `"ethereum"`), which you pass to the API-backed list methods.

```typescript
const chain = sdk.getApiChain(56); // "bsc"
```

---

## Read operations

Read methods are split by source: **Chain** methods read on-chain state through your RPC; **API** methods read from the public Lista API. Human-scaled economic amounts are returned as [`Decimal`](#decimal-utility) rather than `number` or `bigint`; raw on-chain integers — share amounts, timestamps, rate caps/floors, and the `MarketParams` struct — remain `bigint`.

| Method | Source | Returns |
| --- | --- | --- |
| `getMarketExtraInfo(chainId, marketId)` | Chain | `MarketExtraInfo` — market on-chain state (rates, liquidity, LLTV, price rate). |
| `getMarketUserData(chainId, marketId, user)` | Chain | `MarketUserData` — a user's position in a market. |
| `getMarketUserDataWithBroker(chainId, marketId, user, broker)` | Chain | `MarketUserData` merged with fixed-term broker positions. |
| `getMarketRuntimeData(chainId, marketId, wallet)` | Chain | `MarketRuntimeData` — combined extra info + write config + user data in one call. |
| `getWriteConfig(chainId, marketId)` | Chain | `WriteMarketConfig` — the config needed to build write transactions. |
| `getVaultInfo(chainId, address)` | Chain | `VaultInfo` — ERC-4626 vault on-chain state. |
| `getVaultUserData(chainId, address, user)` | Chain | `VaultUserData` — a user's vault position. |
| `getSmartMarketExtraInfo(chainId, marketId)` | Chain | `SmartMarketExtraInfo` — Smart Lending (LP-collateral) market state. |
| `getSmartMarketUserData(chainId, marketId, user)` | Chain | `SmartMarketUserData` — a user's Smart Lending position. |
| `getBrokerFixedTerms(chainId, broker)` | Chain | `FixedTermAndRate[]` — available fixed terms/rates for a broker. |
| `getBrokerUserPositions(chainId, broker, user)` | Chain | `BrokerUserPositionsData` — a user's broker positions. |
| `getMarketInfo(chainId, marketId)` | API | `MarketInfo` — market metadata (curator, descriptions, display APY). |
| `getMarketList(params)` | API | `ApiMarketList` — paginated market discovery. |
| `getVaultList(params)` | API | `ApiVaultList` — paginated vault discovery. |
| `getVaultMetadata(address)` | API | `ApiVaultInfo` — vault metadata (name, APY). |
| `getMarketVaultDetails(marketId, params)` | API | Vaults that allocate to a given market. |
| `getHoldings(params)` | API | A user's holdings (`type: "vault"` or `type: "market"`). |

```typescript
const chainId = 56;

// On-chain reads
const marketExtra = await sdk.getMarketExtraInfo(chainId, marketId);
const userData = await sdk.getMarketUserData(chainId, marketId, userAddress);

// API reads (paginated discovery)
const chain = sdk.getApiChain(chainId); // "bsc"
const markets = await sdk.getMarketList({ chain, page: 1, pageSize: 20, order: "desc" });
const vaults = await sdk.getVaultList({ chain, page: 1, pageSize: 20 });
```

`MarketExtraInfo` and `MarketUserData` expose the market's current on-chain economic state — `LLTV`, `borrowRate`, `utilRate`, `priceRate`, `minLoan`, the user's `collateral`, `borrowed`, `loanable`, `withdrawable`, and `LTV`. These are the live, governance/manager-adjustable on-chain values at read time; treat them as current state, not fixed parameters.

---

## Building transactions: the `StepParam[]` pattern

Write operations are **builders**, not senders. Each `build*Params` method reads whatever it needs from chain/config and returns an ordered `StepParam[]`. You iterate the steps and execute them with your own wallet client. This keeps key custody and signing entirely in your control.

A `StepParam` is a plain descriptor:

```typescript
interface StepParam {
  step:
    | "approve" | "supply" | "borrow" | "repay" | "withdraw"
    | "depositVault" | "withdrawVault"
    | "supplySmartDexLp" | "supplySmartCollateral"
    | "withdrawSmartDexLp" | "withdrawSmartCollateral"
    | "withdrawSmartCollateralFixed" | "repaySmartMarket"
    | "brokerBorrow" | "brokerRepay";
  params: {
    to: Address;
    abi: Abi;
    functionName: string;
    args: readonly unknown[];
    value?: bigint;
    chainId: number | string;
    data: `0x${string}`; // encoded calldata, ready to send
  };
  meta?: { token?: Address; spender?: Address; amount?: bigint; reset?: boolean };
}
```

A builder may prepend an `"approve"` step when an ERC-20 allowance is required, so always execute the whole array in order.

```typescript
import { parseUnits } from "viem";

const supplySteps = await sdk.buildSupplyParams({
  chainId: 56,
  marketId,
  assets: parseUnits("100", 18),
  walletAddress,
});

const borrowSteps = await sdk.buildBorrowParams({
  chainId: 56,
  marketId,
  assets: parseUnits("50", 18),
  walletAddress,
});

// Execute every step with your own wallet/public client (e.g. viem)
for (const step of borrowSteps) {
  const hash = await walletClient.writeContract(step.params);
  await publicClient.waitForTransactionReceipt({ hash });
}
```

### Builder methods

| Method | Builds |
| --- | --- |
| `buildSupplyParams(params)` | Supply collateral to a market. |
| `buildBorrowParams(params)` | Borrow loan assets against collateral. |
| `buildRepayParams(params)` | Repay borrowed assets (by `assets`, `shares`, or `repayAll`). |
| `buildWithdrawParams(params)` | Withdraw collateral (by `assets` or `withdrawAll`). |
| `buildVaultDepositParams(params)` | Deposit into an ERC-4626 vault. |
| `buildVaultWithdrawParams(params)` | Withdraw from a vault (by `assets`, `shares`, or `withdrawAll`). |
| `buildSmartSupplyDexLpParams(params)` | Supply existing DEX LP as Smart Lending collateral. |
| `buildSmartSupplyCollateralParams(params)` | Supply token A/B (zap to LP) as Smart Lending collateral. |
| `buildSmartWithdrawDexLpParams(params)` | Withdraw Smart Lending collateral as LP. |
| `buildSmartWithdrawCollateralParams(params)` | Withdraw Smart Lending collateral as token A/B. |
| `buildSmartWithdrawCollateralFixedParams(params)` | Withdraw Smart Lending collateral burning a fixed LP amount. |
| `buildSmartRepayParams(params)` | Repay a Smart Lending market position. |
| `buildBrokerBorrowParams(params)` | Borrow through a broker (optionally a fixed `termId`). |
| `buildBrokerRepayParams(params)` | Repay a broker position. |

Common builder inputs are `chainId`, `marketId` / `vaultAddress` / `brokerAddress`, `walletAddress`, and a raw `bigint` amount (`assets`, `shares`, `lpAmount`, etc.). Most builders also accept an optional `onBehalf`/`receiver` address and an optional pre-fetched config object to skip a round-trip. See each method's parameter type (`BuildSupplyParams`, `BuildBorrowParams`, …) for the full shape.

---

## Simulation

The SDK offers two simulation tiers, both pure (no transaction is sent).

### On-chain-backed simulation (`MoolahSDK`)

These fetch live market state and project the resulting position, so you can preview health/LTV before building a transaction.

| Method | Description |
| --- | --- |
| `simulateBorrowPosition(params)` | Project a position after supplying and/or borrowing, using live chain data. |
| `simulateRepayPosition(params)` | Project a position after repaying and/or withdrawing, using live chain data. |

```typescript
const preview = await sdk.simulateBorrowPosition({
  chainId: 56,
  marketId,
  walletAddress,
  supplyAssets: parseUnits("1", 18),
  borrowAssets: parseUnits("500", 18),
});
// preview.simulation -> projected collateral, borrowed, LTV, loanable, liqPriceRate
```

### Pure simulation functions (`@lista-dao/moolah-sdk-core`)

These take a `Decimal`-typed snapshot you supply (market state + user position) and return the projected outcome with no chain access at all — ideal for client-side what-if calculators.

| Function | Description |
| --- | --- |
| `simulateMarketBorrow(params)` | Project a market position after a borrow. |
| `simulateMarketRepay(params)` | Project a market position after a repay. |
| `simulateVaultDeposit(params)` | Project vault locked/balance (and optional yearly/monthly earnings) after a deposit. |
| `simulateVaultWithdraw(params)` | Project vault locked/balance after a withdraw. |
| `simulateSmartMarketBorrow(params)` | Project a Smart Lending position after a borrow. |
| `simulateSmartMarketRepay(params)` | Project a Smart Lending position after a repay. |

```typescript
import { Decimal, simulateMarketBorrow } from "@lista-dao/moolah-sdk-core";

const result = simulateMarketBorrow({
  supplyAmount: Decimal.parse("0.5", 18),
  borrowAmount: Decimal.parse("500", 18),
  userPosition: {
    collateral: Decimal.parse("1", 18),
    borrowed: Decimal.ZERO,
  },
  marketState: {
    totalSupply: Decimal.parse("10000", 18),
    totalBorrow: Decimal.parse("5000", 18),
    LLTV: Decimal.parse("0.8", 18),
    priceRate: Decimal.parse("2000", 18),
    loanDecimals: 18,
    collateralDecimals: 18,
  },
});
// result -> { collateral, borrowed, LTV, loanable, liqPriceRate, borrowRate? }
```

The core package also exposes interest-rate helpers — `getAnnualBorrowRate(rate)` (per-second → annual), `getBorrowRateInfo(params)`, and `getInterestRates(params)` (curve data) — for rendering rate information from the values you read on chain.

---

## Decimal utility

Human-scaled economic amounts are returned as `Decimal` (from `@lista-dao/moolah-sdk-core`) instead of `number` or `bigint`, to avoid JavaScript floating-point error. Raw on-chain integers (share amounts, timestamps, rate caps/floors, `MarketParams`) stay `bigint`.

```typescript
import { Decimal, RoundingMode } from "@lista-dao/moolah-sdk-core";

// Create
const amount = Decimal.parse("123.456", 18); // from string (recommended)
const raw = new Decimal(123456000000000000000000n, 18); // from raw bigint + decimals
Decimal.ZERO; Decimal.ONE;

// Arithmetic (BigNumber.js-style aliases also available)
amount.add(b); amount.sub(b); amount.mul(b); amount.div(b);

// Rounding / precision
amount.dp(2, RoundingMode.FLOOR);
amount.floor(2); amount.ceiling(2); amount.round(2); amount.roundDown(2);

// Compare
amount.eq(b); amount.gt(b); amount.lt(b); amount.isZero(); amount.isPositive();

// Format
amount.toString(4);  // trims trailing zeros
amount.toFixed(8);   // keeps trailing zeros
amount.toFormat(2);  // thousand separators
```

When you need a raw `bigint` for a transaction amount, either take `.roundDown(decimals).numerator` from a `Decimal`, or use viem's `parseUnits` directly on user input.

```typescript
import { parseUnits } from "viem";
const rawValue = parseUnits("100.5", 18); // 100500000000000000000n
```

| Read type | Decimal fields (examples) |
| --- | --- |
| `MarketExtraInfo` | `LLTV`, `totalSupply`, `totalBorrow`, `borrowRate`, `priceRate`, `utilRate`, `minLoan` |
| `MarketUserData` | `collateral`, `borrowed`, `loanable`, `withdrawable`, `LTV`, `liqPriceRate` |
| `VaultInfo` | `totalAssets`, `totalSupply` |
| `VaultUserData` | `locked`, `shares`, `balance` |
| `SmartMarketUserData` | `collateral`, `lpTokenA`, `lpTokenB`, `borrowed`, `loanable` |

---

## REST access: `MoolahApiClient`

`MoolahApiClient` is a typed wrapper over the public Lista Moolah REST API (paths under `/api/moolah`). `MoolahSDK`'s API-backed read methods use it internally; you can also use it directly when you only need API data.

```typescript
import { MoolahApiClient } from "@lista-dao/moolah-lending-sdk";

const api = new MoolahApiClient(); // defaults to the public production API

const markets = await api.getMarketList({ chain: "bsc", page: 1, pageSize: 20 });
const vaults = await api.getVaultList({ chain: "bsc", page: 1, pageSize: 20 });
const market = await api.getMarketInfo(marketId, "bsc");
```

| Config field | Notes |
| --- | --- |
| `baseUrl` | API base URL. Defaults to the public production API. |
| `fetch` | Custom `fetch` implementation (e.g. for SSR or a proxy). |

The client unwraps the standard Lista API envelope, returning the `data` payload on success and throwing on a non-success code. For the full endpoint reference — paths, query parameters, and response schemas — see the [Moolah Lending API](services/lending-api/README.md) section, in particular [Market](services/lending-api/market.md) and [Vault](services/lending-api/vault.md).

---

## End-to-end shape

A typical integration is: pick a chain ID, **read** market/user state (chain or API), optionally **simulate** the resulting position, **build** the `StepParam[]` for the operation, then **execute** each step with your own wallet client. The SDK only ever reads and encodes — signing and broadcasting remain in your application.

## See also

- [Integration Patterns](lista-lending/integration-patterns.md) — provider and broker integration at the contract layer.
- [Smart Contract](lista-lending/smart-contract.md) — Moolah contract interface and address reference.
- [Moolah Lending API](services/lending-api/README.md) — the REST surface wrapped by `MoolahApiClient`.
