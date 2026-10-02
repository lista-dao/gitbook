# Overall (Protocol Snapshot)

Lista Lending (Moolah) 的单一协议范围总结：总存款、借款和抵押品，最佳金库 APY，最低市场借款利率，以及按规模排列的顶级贷款/抵押代币。所有路径都在 **Base URL** `/api/moolah` 下。

响应是从服务器端缓存中提供的预计算快照，并由后台作业定期刷新，因此值反映的是上次同步而不是实时链上状态。使用 `updateAt` 时间戳来判断新鲜度。大多数 USD 金额以定点小数字符串（18 位小数）返回，以避免浮点损失——但并非全部：下表标记了类型为 `number` 的字段。检查每个字段的类型，而不是假设整个都是字符串。

---

## GET /api/moolah/overall

返回协议快照。此端点不接受 **查询参数**。

### Response

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `totalBorrowed` | string | 所有市场的总借款，以 USD 计（定点，18 位小数）。 |
| `totalCollateral` | string | 所有市场的总抵押品，以 USD 计（定点，18 位小数）。 |
| `totalDeposits` | string | 所有金库的总存款资产，以 USD 计（定点，18 位小数）。 |
| `maxVaultApy` | string | 持有资产的金库中最高的 **综合** APY（基础加上发行），以定点 18 位小数表示；例如 `0.05` = 5%。 |
| `minBorrowRate` | string | 借款利率减去借款发行 APY 后的最低 **净**借款利率。在发行超过借款利率时可以为 **负**（定点，18 位小数）。 |
| `loanTokens` | array | 按存款 USD 排序的顶级贷款/存款代币，降序排列（最多 10 个）。见下文。 |
| `collateralTokens` | array | 按可用流动性 USD 排序的顶级抵押代币，降序排列（最多 10 个）。见下文。 |
| `details` | object | 同一聚合的每链细分，以链（`bsc`，`ethereum`）为键。 |
| `activeMarketCount` | number | 活跃市场的数量。 |
| `lpTokens` | array | 接受为抵押品的 StableSwap LP 代币 — `tokenSymbol`，`tokenAddress`，`tokenIcon`，`tvlInUSD`。 |
| `smartLending` | object | 智能借贷小计。 |
| `bStock` | object | 代币化股权（bStock）小计。已在上面聚合中计入的市场的 **细分**，而不是单独的桶。见下文。 |
| `updateAt` | number | 快照的 Unix 时间戳（秒）。 |

两个数组中的项目都带有 `tokenAddress`（小写），`tokenSymbol` 和 `tokenIcon`，以及一个 USD 数字，类型为 **`number`，而不是字符串**：`loanTokens` 上的 `amountInUSD`（存款），`collateralTokens` 上的 `liquidityInUSD`（使用该抵押品的市场中可用的贷款侧流动性）。

### `bStock` object

bStock 市场 **包含** 在 `totalBorrowed`，`totalCollateral` 和 `collateralTokens` 列表中；此对象再次统计相同的市场，以便可以单独显示。**不要将 `bStock.totalBorrowed` / `bStock.totalCollateral` 添加到协议范围的总计中** — 这样会重复计算。`totalDeposits` 是金库级别的聚合，没有 bStock 对应项。形状是稳定的，即使在快照填充之前也存在。

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `totalCollateral`, `totalBorrowed`, `totalAvailable` | string | bStock 抵押品发布，借用其抵押品，以及可用流动性 — 全部以 USD 计，定点 18 位小数。 |
| `marketCount`, `collateralTokenCount` | number | bStock 市场和不同的 bStock 抵押代币。 |
| `loanTokens`, `topCollateralTokens` | array | 可用于 bStock 抵押品的贷款代币，以及顶级 bStock 抵押品。 |

当快照尚未填充时，端点返回一个清零的对象：所有金额/利率字段为 `"0"`，`loanTokens` 和 `collateralTokens` 为空数组，`updateAt` 为 `0`，`bStock` 存在，其计数为 `0`，其金额为 `"0"`，其数组为空。

### 示例

```bash
curl https://<api-host>/api/moolah/overall
```

```json
{
  "totalBorrowed": "12345678.900000000000000000",
  "totalCollateral": "23456789.000000000000000000",
  "totalDeposits": "34567890.100000000000000000",
  "maxVaultApy": "0.084000000000000000",
  "minBorrowRate": "0.021000000000000000",
  "loanTokens": [
    {
      "tokenAddress": "0x...",
      "tokenSymbol": "USD1",
      "tokenIcon": "https://...",
      "amountInUSD": 20000000.0
    }
  ],
  "collateralTokens": [
    {
      "tokenSymbol": "BTCB",
      "tokenAddress": "0x...",
      "tokenIcon": "https://...",
      "liquidityInUSD": 8000000.0
    }
  ],
  "updateAt": 1730000000
}
```

> 上述值仅为示例。代币地址由 API 返回；不要硬编码它们。

---

## 相关

- [Vault API](vault.md) — 每个金库的列表、详细信息、APY/存款历史、分配。
- [Market API](market.md) — 每个市场的数据、借款利率、搜索。
- [Position, Liquidation, Emission](position-liquidation-emission.md) — 用户级数据。