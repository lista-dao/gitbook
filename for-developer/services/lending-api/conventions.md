# API 约定

每个 [Moolah Lending API](README.md) 端点共享的跨领域约定：基础 URL、响应封装、链选择器、分页和排序、签名保护的端点以及缓存。每个端点页面假设这些约定并仅记录其特定内容。

**主机：** `https://api.lista.org`。

**基础 URL：** 大多数路径在 `/api/moolah` 下提供（例如 `GET /api/moolah/borrow/markets`）。清算和聚合位置的提要是例外——它们位于 `/api/liquidation` 和 `/api/v2` 下；参见 [Positions, Liquidation & Emission](position-liquidation-emission.md)。

---

## 响应封装

本节记录的端点的响应被包装在一个统一的 JSON 封装中。（主机上其他地方的一些不相关的合作伙伴路由返回原始负载，因此不要假设此参考之外的路径使用封装。）端点自身的负载包含在 `data` 中。

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `code` | string | 状态码。成功时为 `"000000000"`。任何其他值表示错误。 |
| `msg` | string | `code` 的人类可读消息，按请求语言本地化。 |
| `data` | any | 端点负载——一个对象或数组。当没有返回内容时，它可以**不存在**而不是 `null`，因此要谨慎读取；参见下面的空形状。形状在每个端点中记录。 |
| `timestamp` | number | 响应生成时的服务器时间，以自 Unix 纪元以来的**毫秒**为单位。 |

成功示例：

```json
{
  "code": "000000000",
  "msg": "success",
  "data": { "total": 12, "list": [] },
  "timestamp": 1751414400000
}
```

错误示例：

```json
{
  "code": "400",
  "msg": "Invalid params",
  "timestamp": 1751414400000
}
```

> 注意错误封装**没有 `data` 键**——它被省略，而不是 `null`。测试 `response.data === null` 来检测错误的客户端将会抛出异常。

### 读取响应

- **检查 `code`，而不仅仅是 HTTP 状态。** 成功的响应返回 HTTP `200` 和 `code = "000000000"`。客户端错误（错误或缺失的参数）返回 HTTP `400` 和非成功 `code`；服务器端故障返回 HTTP `500`。**未知资源不是错误**——对不存在的 id 的有效请求返回 HTTP `200`，因此检查负载而不是期望 `404`。可能有三种形状：`{}`，`[]`，或——在 `GET /market/:marketId` 上——**没有 `data` 键**。谨慎读取。始终在 `code === "000000000"` 上分支并从 `data` 中读取负载。
- **`timestamp` 是以毫秒为单位**，而不是秒——在与以**秒**为单位的 `startTime` / `endTime` 历史参数进行比较时注意这一点。

### 常见错误代码

代码是字符串。这不是完整的集合：

| `code` | 含义 |
|--------|---------|
| `000000000` | 成功。 |
| `400` | 无效的请求参数。 |
| `404` | 没有路由匹配路径。对不存在的 id 的有效请求**不会**产生这个——见上文。 |
| `401` | 签名消息已过期（参见 [Signature-gated endpoints](#signature-gated-endpoints)）。 |
| `1005` | 无效的签名。 |
| `500` | 服务器错误。 |
| `-1` | 自定义错误；阅读 `msg` 以获取具体原因（例如，缺少必需的查询参数）。 |

---

### 显示乘数

返回抵押品数量的端点也返回 `collateralUiMultiplier`。对于所有非 bStock 抵押品以及大多数 bStock 抵押品，它是 `"1"`；如果不同，则为代币的链上 `uiMultiplier()`，随着时间的推移会漂移到 1 以上。**在显示之前将原始抵押品数量乘以它**——不要从符号中推断。

## 链选择器

跨网络的端点接受 `chain` 查询参数。它是一个**字符串网络键**，而不是数字链 ID：

| 值 | 网络 |
|-------|---------|
| `bsc` | BNB Smart Chain (mainnet) |
| `ethereum` | Ethereum (mainnet) |
| `bscTest` | BSC testnet |

- **支持逗号分隔。** 几个列表端点在一次调用中接受多个键，例如 `chain=bsc,ethereum`。值以逗号分隔，每个键独立匹配。
- **默认值取决于环境。** 当省略 `chain` 时，端点默认为实时网络——生产环境中的 `bsc`。不要依赖默认值；明确传递 `chain` 以获得确定性行为。
- `chain` 字符串也会在大多数市场/保险库对象上回显，以便在一次查询多个时可以知道记录属于哪个网络。

---

## 分页

列表端点使用基于 1 的页面分页：

| 参数 | 类型 | 描述 |
|-----------|------|-------------|
| `page` | number | 页码，**基于 1**。缺失或 `≤ 0` 的值被视为 `1`。 |
| `pageSize` | number | 每页项目数。默认值是**端点特定的**——`/api/liquidation/zone/*` 提要为 `20`，`/api/v2/liquidated/lending/history` 为 `10`。每个端点都有上限；请求超过上限的数量会被静默限制到上限。 |

`pageSize` 上限是端点特定的：

| 端点 | `pageSize` 上限 |
|----------|----------------|
| `GET /borrow/markets` | `50` |
| `GET /emission/userRewardHistory` | `50` |
| `GET /market/vault/:marketId` (按市场的保险库) | `20` |
| `GET /vault/list` | `50` |
| `GET /vault/allocation` | `50` |
| `GET /api/liquidation/zone/list` · `/history` · `/closeToLiquidate` | `50` |
| `GET /redPositions` (`count`) | 无 |

分页端点返回 `{ total, list }`，其中 `total` 是匹配过滤器的完整计数（分页前），`list` 包含当前页。要检测最后一页，请比较 `page * pageSize` 和 `total`，而不是假设完整页。

> 一个例外：`GET /market/vault/:marketId` 返回 `total` 作为**当前页中的条目数**，而不是完整计数，因此上述比较在此处不起作用。

---

## 排序

可排序的列表端点接受一对参数：

| 参数 | 类型 | 描述 |
|-----------|------|-------------|
| `sort` | string | 排序字段**键**（白名单别名，而不是原始列）。未识别的键回退到每个端点的默认值。 |
| `order` | string | 排序方向：`asc` 或 `desc`。不区分大小写。 |

使用 `sort` + `order` 对，**而不是** `sortBy` / `sortOrder`。

`order` 在任何地方都是可选的。任何值除了 `asc` / `desc`（不区分大小写）——包括省略的值——都会回退到 `desc`。

`GET /borrow/markets` 的有效 `sort` 键：`rate`，`liquidity`，`lltv`，`loan`，`collateral`，`termType`。参见 [Market API](market.md) 了解每个映射到什么。

---

## 签名保护的端点

少量端点返回特定地址的数据（发放/奖励**merkle proofs**）并要求调用者证明对地址的控制。这些端点接受三个额外的查询参数：

| 参数 | 类型 | 必需 | 描述 |
|-----------|------|----------|-------------|
| `address` | string | 是 | 请求数据的地址。 |
| `signature` | string | 是 | 对 `message` 的钱包签名。 |
| `message` | string | 是 | 签名的消息。必须是**恰好两行**：ISO-8601 UTC 时间戳（`YYYY-MM-DDTHH:MM:SSZ`，可选的 `.SSS` 毫秒，字面 `Z` 仅），然后是字面行 `Thank you for your support of listaDAO.` 时间戳必须不超过**7 天**。不匹配的消息返回 HTTP 400 上的封装代码 `1005`。 |
| `type` | string | 否 | `safe` 验证为 ERC-1271 合约钱包（例如 Safe）；省略/其他验证为标准 EOA 签名。 |

验证工作原理：

- **EOA（默认）：** 签名者从 `signature` 上的 `message` 中恢复，必须等于 `address`（不区分大小写）。
- **`type=safe`：** 签名根据地址验证为 ERC-1271 合约钱包。
- **无效签名**返回代码 `1005`；**消息超过 7 天**返回代码 `401`。

这是一个标准的钱包签名挑战——**不涉及服务器端秘密、API 密钥或令牌。** 签名保护的端点记录在 [Positions, Liquidation & Emission](position-liquidation-emission.md#4-emission-rewards--merkle-proofs) 中。

---

## 缓存和新鲜度

大多数列表和详细信息端点从**服务器端缓存**中提供。对集成商的两个影响：

- **值反映最后一次同步，而不是实时链状态。** 列表和详细信息响应（流动性、利率、总计、价格、APY）是最近一次索引器同步时的状态，可能会滞后于链。将它们视为显示/决策数据，而不是在交易时间读取链的替代品。
- **对于您将签署交易的值，请在链上读取。** 从不可变的市场参数构建交易——使用 `GET /api/moolah/allMarkets`（原始链上 `MarketParams` 等效字段：`loanToken`，`collateralToken`，`oracle`，`irm`，`lltv`）并直接从 Moolah 合约读取实时总计/价格。参见 [Market API](market.md) 和 [Lista Lending Smart Contract](../../lista-lending/smart-contract.md) 参考。

USD 和资产金额返回为定点**十进制字符串**，除非端点另有说明；名称以 `Wei` 结尾的字段携带原始链上整数。使用大数库而不是本机浮点数解析金额。

---

## 另见

- [Vault](vault.md) — 保险库列表和详细信息端点。
- [Integration Patterns](../../lista-lending/integration-patterns.md) — 端到端集成流程。