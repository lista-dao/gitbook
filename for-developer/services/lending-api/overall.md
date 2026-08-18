# 总览（协议快照）

## GET /api/moolah/overall

返回协议级的数据快照（例如跨链的 TVL、总供应量、总借款量）。

**Method：** `GET`  
**Path：** `/api/moolah/overall`

---

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `chainId` | number / string | 否 | 按链过滤（例如 56 = BSC，1 = Ethereum）。省略则返回所有链。 |

---

### 响应

包含全协议指标的对象。典型字段：

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `totalSupplyUsd` | string | 以 USD 计的总供应价值（所有金库/市场）。 |
| `totalBorrowUsd` | string | 以 USD 计的总借款价值。 |
| `tvlUsd` | string | 以 USD 计的总锁仓价值。 |
| `chainList` | array | 有数据的链 ID 列表。 |
| `updatedAt` | number / string | 快照的时间戳。 |

其他键（例如按链拆分、金库数量、市场数量）取决于已部署的 API。
