# Moolah Lending API

**Moolah lending protocol API** 的技术参考文档，供 Lista Lending 使用。该 API 为客户端应用程序和集成商提供协议级别、金库、市场、头寸、清算和发放数据。

**基本 URL：** 大多数路径在 `/api/moolah` 下使用 `GET`/`POST`；清算和聚合头寸数据位于 `/api/liquidation` 和 `/api/v2` 下 — 参见 [Conventions](conventions.md)。

---

## 目录

| 页面 | 描述 |
|------|------|
| [API 约定](conventions.md) | 基本 URL、响应封装、链选择器、分页、签名保护的端点、缓存 |
| [总体](overall.md) | 协议级别快照 |
| [金库](vault.md) | 金库列表、详情、存款/APY 历史、分配 |
| [市场](market.md) | 市场列表、详情、按市场划分的金库、借款利率历史、allMarkets、搜索 |
| [头寸、清算、发放](position-liquidation-emission.md) | 用户头寸、清算、奖励、CDP |