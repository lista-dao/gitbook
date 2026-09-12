# Moolah Lending API

Technical reference for the **Moolah lending protocol API** used by Lista Lending. The API exposes protocol-level, vault, market, position, liquidation, and emission data for client applications and integrators.

**Base URL:** most paths are `GET`/`POST` under `/api/moolah`; the liquidation and aggregated-position feeds sit under `/api/liquidation` and `/api/v2` — see [Conventions](conventions.md)

---

## Contents

| Page | Description |
|------|-------------|
| [Overall](overall.md) | Protocol-level snapshot |
| [Vault](vault.md) | Vault list, detail, deposit/APY history, allocation |
| [Market](market.md) | Market list, detail, vaults by market, borrow rate history, allMarkets, search |
| [Position, Liquidation, Emission](position-liquidation-emission.md) | User position, liquidation, rewards, CDP |
