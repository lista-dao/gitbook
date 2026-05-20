# Position Data Maintenance

This document describes the **MoolahUserPosition** entity and the **services** that maintain and consume it for Lista Lending. It is the data foundation for risk monitoring, liquidation alerts, emission (rewards), and borrow history.

---

## 1. Overview

**MoolahUserPosition** is the core entity for **user positions** in the Moolah lending protocol. It stores, per user per market:

- Collateral and borrow amounts
- Liquidation price (or liquidation price ratio)
- Related identifiers (chain, market, user address)

This entity supports:

- **Risk monitoring** — Track positions approaching liquidation.
- **Liquidation alerts** — Identify and push alerts for positions at or over the liquidation threshold.
- **Emission (rewards)** — Aggregate collateral by market for reward distribution weights.
- **Borrow / rate statistics** — Daily and hourly borrow and rate reports.

---

## 2. Entity definition

There is **exactly one position record per (user address, market)**.

Typical fields (names may differ in implementation):

| Field | Description |
|-------|-------------|
| `userAddress` | Wallet address |
| `marketId` | Market identifier (or equivalent) |
| `chainId` | Chain (e.g. BSC, Ethereum) |
| `collateralAmount` | Supplied collateral (human-readable, e.g. 18 decimals) |
| `borrowShares` | Borrow shares on-chain (raw Wei) |
| `borrowedAmount` | Actual borrowed amount (derived from shares + market state) |
| `liquidationPriceRatio` | Collateral/loan price ratio at which the position becomes liquidatable |
| `updatedAt` | Last update time |

---

## 3. Data flow

```
                    ┌───────────────┐
                    │ On-chain      │
                    │ contract      │
                    │ events        │
                    └──────┬────────┘
                           │
               ┌───────────▼───────────┐
               │ Event-driven write    │
               │ (incremental consume) │
               └───────────┬───────────┘
                           │ UPSERT
                           ▼
               ┌───────────────────────┐     ┌───────────────────┐
               │ moolah_user_position  │◄────│ Scheduled refresh  │
               │ (user position table) │UPDATE│ (debt + liq. rate) │
               └──────────┬────────────┘     └───────────────────┘
                          │ READ
          ┌───────────────┼────────────────────┐
          ▼               ▼                    ▼
  ┌───────────────┐ ┌──────────────┐  ┌─────────────────┐
  │ Borrow history│ │ Liquidation  │  │ Emission        │
  │ (daily/hourly)│ │ risk monitor │  │ reward calc     │
  └───────────────┘ └──────────────┘  └─────────────────┘
```

---

## 4. Data writes

### 4.1 Event-driven write

Position data is updated by **consuming on-chain events** from Moolah (supply, withdraw, borrow, repay, liquidate, etc.). For each relevant event:

1. **Fetch events** — Read from the event store using a cursor (`lastId`) to get unprocessed Moolah events in order.
2. **Read on-chain state** — Use multicall to query current market state, user position, and oracle price.
3. **Compute derived fields** — From market rate type, compute actual borrowed amount and liquidation price ratio.
4. **Write to DB** — UPSERT by `(userAddress, marketId)` (and `chainId` if applicable).
5. **Write operation log** — Optionally write to a user-operation log table.
6. **Trigger alerts** — If the event is a liquidation, trigger Telegram (or other) alerts.

**Idempotency:** Each event is tracked (e.g. Redis key with TTL 1500s) so the same event is not applied twice. Failed events are retried; after a max retry count they are skipped and processing continues.

### 4.2 Scheduled refresh

Because **interest accrues continuously** on-chain, borrowed amount and liquidation price change even when there are no new events. A **scheduled job** periodically refreshes all active positions:

- **Floating-rate markets** — Read current rate from chain, compute accrued interest locally, then convert shares to assets to get current borrowed amount and liquidation price.
- **Fixed-rate (Broker) markets** — Query the Broker contract for each user's total debt (`getBrokerTotalDebt(borrower, market)`), then compute liquidation price.

---

## 5. Data reads

### 5.1 Borrow history

- **Daily** — From the position table (and any snapshots), compute per-user daily average borrowed amount, collateral, and USD value; write to a daily borrow history table.
- **Hourly** — Snapshot all positions hourly into an hourly borrow snapshot table.

### 5.2 Liquidation risk monitoring

The system periodically reads each position's **liquidation price ratio** and compares it to the **current market price ratio** from the oracle. When **liquidation trigger price > current market price** (i.e. position is liquidatable), it generates a risk summary and sends alerts (e.g. Telegram).

### 5.3 Emission (rewards)

Emission logic aggregates user collateral per market (from the position table) and uses it as the weight for reward distribution.

---

## 6. Related data

- **Market config** — Chain, assets, oracle, LLTV, rate type (floating vs fixed).
- **Event log** — Raw contract events for replay and auditing.
- **User operation log** — Per-user action history (supply, borrow, repay, etc.).

---

## 7. Key concepts

### 7.1 Borrow shares vs actual borrowed amount

- **Borrow shares** are the on-chain representation and change only on user actions (borrow, repay, liquidation).
- **Actual borrowed amount** is derived from shares and market state (total assets, total shares, and for fixed-rate possibly Broker state) and **increases over time** with interest. The scheduled refresh keeps this field in sync.

### 7.2 Liquidation price ratio

The **liquidation price ratio** is the collateral/loan price ratio at which the position becomes liquidatable. When the oracle's current price ratio falls below this value, the position can be liquidated. It is derived from collateral, borrowed amount, and the market's LLTV.

### 7.3 Multi-chain

Moolah runs on **BSC and Ethereum**. Position data is usually stored in a single table with a chain identifier (e.g. `chainId`) so that downstream jobs and APIs can filter by chain.

---

## 8. Task checklist

| Task | Description |
|------|-------------|
| Event consumer | Consume Moolah events and UPSERT positions |
| Scheduled refresh | Refresh borrowed amount and liquidation price for all active positions |
| Borrow history (daily) | Compute and store daily borrow/collateral stats |
| Borrow snapshot (hourly) | Snapshot positions for hourly stats |
| Liquidation monitor | Compare liquidation price to oracle price and send alerts |
| Emission aggregation | Aggregate collateral by market for reward weights |

---

## 9. Notes

- **Precision:** Collateral and borrowed amount are usually stored in human form (e.g. 18 decimals); borrow shares are often stored as raw Wei.
- **Read/write separation:** Writes go to the primary DB; reads may use replicas. Replication lag should be considered for consistency.
- **Idempotency:** Event processing uses Redis (or similar) plus UPSERT so the same event is not applied twice.
- **Rate type:** Floating-rate and fixed-rate markets use different formulas for borrowed amount and liquidation price; the market config drives which path is used.
