# Moolah Lending SDK (TypeScript)

The Moolah Lending SDK is the TypeScript integration path for Lista Lending (Moolah) on BNB Chain and Ethereum, published on public npm under the `@lista-dao` scope.

It is **wallet-agnostic**: read methods call the chain (via [viem](https://viem.sh)) or the public Lista API, and write methods return an array of plain transaction-step descriptors that you execute with your own wallet client. The SDK never holds keys, never signs, and never broadcasts on your behalf.

> **Check the published version before you pin.** The two packages release independently of the protocol, so the npm release can trail the contracts — run `npm view @lista-dao/moolah-lending-sdk version` and compare against the [Smart Contract](lista-lending/smart-contract.md) tables. Where the SDK is behind, the contract reference is authoritative and you can call Moolah directly; see [Contract & Interface Reference](lista-lending/contract-reference.md).

## Packages

| Package | Description |
| --- | --- |
| [`@lista-dao/moolah-lending-sdk`](https://www.npmjs.com/package/@lista-dao/moolah-lending-sdk) | The `MoolahSDK` builder — reads chain/API data, returns transaction steps. |
| [`@lista-dao/moolah-sdk-core`](https://www.npmjs.com/package/@lista-dao/moolah-sdk-core) | Types, pure simulation functions, contract ABIs, the `Decimal` utility, `MoolahApiClient`. |

Installing the lending SDK pulls the core package in and re-exports a convenience subset of it. The pure **simulate functions**, interest-rate helpers, and contract **ABIs** are *not* re-exported — import those from `@lista-dao/moolah-sdk-core` directly.

```bash
pnpm add @lista-dao/moolah-lending-sdk
pnpm add viem@^2.22.10
```

`viem` is a direct dependency of both packages (`viem@^2.22.10`), so you do not need it to *use* the SDK — but you will use it to execute the returned steps. Install a version in the same range so your package manager dedupes to one copy: **two viem instances cause client and type mismatches** across the `publicClients` boundary.

## Writing transactions: builders, not senders

`build*Params` methods return an ordered array of step descriptors. Each carries `{ to, abi, functionName, args, value, chainId, data }` plus an optional `meta`. Execute them in order with your own wallet client.

```typescript
import { parseUnits } from "viem";

const supplySteps = await sdk.buildSupplyParams({ chainId: 56, marketId, assets: parseUnits("100", 18), walletAddress });
const borrowSteps = await sdk.buildBorrowParams({ chainId: 56, marketId, assets: parseUnits("50", 18), walletAddress });

// Collateral must land before the borrow, so run the supply steps first.
for (const step of [...supplySteps, ...borrowSteps]) {
  // `params.to` maps onto viem's `address`; `chainId` and `data` are extra
  // fields that `writeContract` does not accept.
  const hash = await walletClient.writeContract({
    address: step.params.to,
    abi: step.params.abi,
    functionName: step.params.functionName,
    args: step.params.args,
    value: step.params.value,
  });
  await publicClient.waitForTransactionReceipt({ hash });
}
```

Three things about that loop:

* **Execute every step, in order, and never dedupe by `step`.** A builder prepends `"approve"` steps when an allowance is needed.
* **Ethereum mainnet USDT emits *two* approve steps** when a non-zero but insufficient allowance already exists — a reset to `0` (flagged `meta.reset === true`) followed by the real approve — because that contract rejects non-zero → non-zero allowance changes. A sufficient allowance emits none at all.
* **The SDK's "supply" is the collateral side.** `buildSupplyParams` calls `supplyCollateral`; Moolah's own `supply` — lending the loan asset — has no builder and is reached through a vault.

## Known gaps

Verified against `@lista-dao/moolah-lending-sdk@1.0.11` / `@lista-dao/moolah-sdk-core@1.0.12` — re-check these once the SDK ships a new release:

* **Do not resolve addresses from `getContractAddress` / `getContractAddressOptional`.** Several entries in the bundled address book are unset — on BNB Chain as well as Ethereum. The first throws, the second returns the **zero address**, which is the more dangerous failure since a caller can send to it. Use the [Smart Contract](lista-lending/smart-contract.md) tables instead.
* `getBrokerUserPositions` and `getMarketUserDataWithBroker` do not work on Ethereum.
* Native-asset (ETH) markets and vaults are not detected correctly — use the ERC-20 paths.
* `getBrokerFixedTerms` decodes with the `LendingBroker` ABI, so it does not support a `CreditBroker`, whose `FixedTermAndRate` carries a fourth field (`termType`).

## Reading market state

`getMarketExtraInfo` and `getMarketUserData` return the market's live economic state — `LLTV`, `borrowRate`, `utilRate`, `priceRate`, `minLoan`, and the user's `collateral`, `borrowed`, `loanable`, `withdrawable`, `LTV`. `getMarketRuntimeData` returns extra info, write config and user data in one call.

**`priceRate` is loan tokens per one collateral token** — `collateral × priceRate` is a loan-denominated value. Inverting it inverts every LTV and liquidation figure you derive from it.

Human-scaled amounts come back as `Decimal` (a fixed-point helper with `add`/`sub`/`mul`/`div`, rounding controls and comparisons); raw on-chain integers — borrow shares, timestamps, rate caps, the `MarketParams` struct — stay `bigint`.

## See also

* [Integration Patterns](lista-lending/integration-patterns.md) — provider and broker models.
* [Moolah Lending API](services/lending-api/README.md) — the REST surface the API-sourced reads use.
