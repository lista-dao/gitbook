# Moolah Lending SDK (TypeScript)

Moolah Lending SDK 是在 BNB Chain 和 Ethereum 上用于 Lista Lending (Moolah) 的 TypeScript 集成路径，发布在公共 npm 的 `@lista-dao` 范围下。

它是**与钱包无关的**：读取方法通过 [viem](https://viem.sh) 或公共 Lista API 调用链，而写入方法返回一个普通交易步骤描述符数组，您可以使用自己的钱包客户端执行这些步骤。SDK 从不持有密钥，从不签名，也从不代表您广播。

> **在固定版本之前检查已发布的版本。** 这两个包独立于协议发布，因此 npm 发布可能会落后于合约——运行 `npm view @lista-dao/moolah-lending-sdk version` 并与 [Smart Contract](lista-lending/smart-contract.md) 表格进行比较。如果 SDK 落后，合约参考是权威的，您可以直接调用 Moolah；请参阅 [Contract & Interface Reference](lista-lending/contract-reference.md)。

## 包

| 包 | 描述 |
| --- | --- |
| [`@lista-dao/moolah-lending-sdk`](https://www.npmjs.com/package/@lista-dao/moolah-lending-sdk) | `MoolahSDK` 构建器——读取链/API 数据，返回交易步骤。 |
| [`@lista-dao/moolah-sdk-core`](https://www.npmjs.com/package/@lista-dao/moolah-sdk-core) | 类型、纯模拟函数、合约 ABIs、`Decimal` 工具、`MoolahApiClient`。 |

安装借贷 SDK 会拉入核心包并重新导出其便捷子集。纯**模拟函数**、利率助手和合约 **ABIs** *不会*被重新导出——直接从 `@lista-dao/moolah-sdk-core` 导入这些。

```bash
pnpm add @lista-dao/moolah-lending-sdk
pnpm add viem@^2.22.10
```

`viem` 是这两个包的直接依赖项（`viem@^2.22.10`），因此您不需要它来*使用* SDK——但您将使用它来执行返回的步骤。安装一个相同范围的版本，以便您的包管理器去重为一个副本：**两个 viem 实例会导致 `publicClients` 边界内的客户端和类型不匹配**。

## 编写交易：构建器，而非发送者

`build*Params` 方法返回一个有序的步骤描述符数组。每个步骤都带有一个 `params` 对象，包含 `{ to, abi, functionName, args, value, chainId, data }`，以及一个可选的 `meta`。使用您自己的钱包客户端按顺序执行它们。

```typescript
import { parseUnits } from "viem";

const supplySteps = await sdk.buildSupplyParams({ chainId: 56, marketId, assets: parseUnits("100", 18), walletAddress });
const borrowSteps = await sdk.buildBorrowParams({ chainId: 56, marketId, assets: parseUnits("50", 18), walletAddress });

// 抵押品必须在借款之前到达，因此先运行供应步骤。
for (const step of [...supplySteps, ...borrowSteps]) {
  // `params.to` 映射到 viem 的 `address`；`chainId` 和 `data` 是 `writeContract` 不接受的额外字段。
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

关于该循环的三件事：

* **按顺序执行每个步骤，且永远不要按 `step` 去重。** 当需要允许时，构建器会在前面加上 `"approve"` 步骤。
* **Ethereum 主网 USDT 在已存在非零但不足的允许时会发出*两个*批准步骤**——重置为 `0`（标记为 `meta.reset === true`）然后是实际批准——因为该合约拒绝非零→非零的允许更改。足够的允许则根本不发出。
* **SDK 的“供应”是抵押品方面。** `buildSupplyParams` 调用 `supplyCollateral`；Moolah 自己的 `supply`——借出贷款资产——没有构建器，通过一个 vault 达到。

## 已知差距

已验证 `@lista-dao/moolah-lending-sdk@1.0.11` / `@lista-dao/moolah-sdk-core@1.0.12`——一旦 SDK 发布新版本，请重新检查这些：

* **不要从 `getContractAddress` / `getContractAddressOptional` 解析地址。** 捆绑地址簿中的几个条目未设置——在 BNB Chain 和 Ethereum 上都是如此。第一个会抛出，第二个返回**零地址**，这是更危险的失败，因为调用者可以发送到它。请使用 [Smart Contract](lista-lending/smart-contract.md) 表格。
* `getBrokerUserPositions` 和 `getMarketUserDataWithBroker` 在 Ethereum 上不起作用。
* 原生资产（ETH）市场和 vault 未正确检测——使用 ERC-20 路径。
* `getBrokerFixedTerms` 使用 `LendingBroker` ABI 解码，因此不支持 `CreditBroker`，其 `FixedTermAndRate` 带有第四个字段（`termType`）。

## 读取市场状态

`getMarketExtraInfo` 和 `getMarketUserData` 返回市场的实时经济状态——`LLTV`、`borrowRate`、`utilRate`、`priceRate`、`minLoan`，以及用户的 `collateral`、`borrowed`、`loanable`、`withdrawable`、`LTV`。`getMarketRuntimeData` 返回额外信息、写入配置和用户数据，一次调用即可。

**`priceRate` 是每一个抵押品代币的贷款代币数**——`collateral × priceRate` 是一个以贷款计价的值。反转它会反转您从中推导出的每个 LTV 和清算数字。

人类尺度的金额以 `Decimal` 返回（一个具有 `add`/`sub`/`mul`/`div`、舍入控制和比较的定点助手）；链上的原始整数——借款份额、时间戳、利率上限、`MarketParams` 结构——保持为 `bigint`。

## 另请参阅

* [Integration Patterns](lista-lending/integration-patterns.md)——提供者和经纪人模型。
* [Moolah Lending API](services/lending-api/README.md)——API 源读取使用的 REST 表面。