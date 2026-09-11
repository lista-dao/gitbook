# API Conventions

Cross-cutting conventions shared by every [Moolah Lending API](README.md) endpoint: the base URL, the response envelope, the chain selector, pagination and sorting, signature-gated endpoints, and caching. Each endpoint page assumes these and only documents what is specific to it.

**Base URL:** most paths are served under `/api/moolah` (for example `GET /api/moolah/borrow/markets`). The liquidation and aggregated-position feeds are the exception — they sit under `/api/liquidation` and `/api/v2`; see [Positions, Liquidation & Emission](position-liquidation-emission.md).

---

## Response envelope

Responses from the endpoints documented in this section are wrapped in a uniform JSON envelope. (A few unrelated partner routes elsewhere on the host return raw payloads, so do not assume the envelope for paths outside this reference.) The endpoint's own payload is carried in `data`; the surrounding fields are the same on success and on error.

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Status code. `"000000000"` on success. Any other value indicates an error. |
| `msg` | string | Human-readable message for `code`, localized to the request language. |
| `data` | any | The endpoint payload — an object, an array, or `null`. Shape is documented per endpoint. |
| `timestamp` | number | Server time when the response was built, in **milliseconds** since the Unix epoch. |

Success example:

```json
{
  "code": "000000000",
  "msg": "success",
  "data": { "total": 12, "list": [] },
  "timestamp": 1751414400000
}
```

Error example:

```json
{
  "code": "400",
  "msg": "Invalid params",
  "data": null,
  "timestamp": 1751414400000
}
```

### Reading responses

- **Check `code`, not the HTTP status alone.** Successful responses return HTTP `200` with `code = "000000000"`. Client errors (bad or missing parameters) return HTTP `400` with a non-success `code`; server-side failures return HTTP `500`. An **unknown resource is not an error** — a valid request for an id that does not exist returns HTTP `200`, so check the payload rather than expecting a `404`. Three shapes are possible: `{}`, `[]`, or — on `GET /market/:marketId` — **no `data` key at all**. Read it defensively. Always branch on `code === "000000000"` and read the payload from `data`.
- **`timestamp` is in milliseconds**, not seconds — note this when comparing against the `startTime` / `endTime` history parameters, which are in **seconds**.

### Common error codes

Codes are strings. This is not the complete set:

| `code` | Meaning |
|--------|---------|
| `000000000` | Success. |
| `400` | Invalid request parameters. |
| `404` | No route matched the path. A valid request for a non-existent id does **not** produce this — see above. |
| `401` | Signed message expired (see [Signature-gated endpoints](#signature-gated-endpoints)). |
| `1005` | Invalid signature. |
| `500` | Server error. |
| `-1` | Custom error; read `msg` for the specific reason (e.g. a required query parameter was omitted). |

---

## Chain selector

Endpoints that span networks accept a `chain` query parameter. It is a **string network key**, not a numeric chain ID:

| Value | Network |
|-------|---------|
| `bsc` | BNB Smart Chain (mainnet) |
| `ethereum` | Ethereum (mainnet) |
| `bscTest` | BSC testnet |

- **Comma-separated where supported.** Several list endpoints accept multiple keys in one call, e.g. `chain=bsc,ethereum`. The value is split on commas and each key is matched independently.
- **Default is environment-dependent.** When `chain` is omitted, endpoints default to the live network — `bsc` in production. Do not rely on the default; pass `chain` explicitly for deterministic behavior.
- The `chain` string is also echoed back on most market/vault objects so you can tell which network a record belongs to when querying more than one at a time.

---

## Pagination

List endpoints use 1-based page pagination:

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number, **1-based**. Values missing or `≤ 0` are treated as `1`. |
| `pageSize` | number | Items per page. The default is **endpoint-specific** — `20` on the `/api/liquidation/zone/*` feeds, `10` on `/api/v2/liquidated/lending/history`. Capped per endpoint; requesting more than the cap silently clamps to it. |

The `pageSize` cap is endpoint-specific:

| Endpoint | `pageSize` cap |
|----------|----------------|
| `GET /borrow/markets` | `50` |
| `GET /emission/userRewardHistory` | `50` |
| `GET /market/vault/:marketId` (vaults by market) | `20` |
| `GET /vault/list` | `50` |
| `GET /vault/allocation` | `50` |
| `GET /api/liquidation/zone/list` · `/history` · `/closeToLiquidate` | `50` |
| `GET /redPositions` (`count`) | none |

Paginated endpoints return `{ total, list }`, where `total` is the full count matching the filters (before pagination) and `list` holds the current page. To detect the last page, compare `page * pageSize` against `total` rather than assuming a full page.

> One exception: `GET /market/vault/:marketId` returns `total` as the **number of entries in the current page**, not the full count, so the comparison above does not work there.

> Some snapshot-style endpoints use keyset (cursor) pagination instead of `page`/`pageSize` — see the individual endpoint page (e.g. the holder snapshot in [Positions, Liquidation & Emission](position-liquidation-emission.md)).

---

## Sorting

Sortable list endpoints take a pair of parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `sort` | string | Sort field **key** (a whitelisted alias, not a raw column). Unrecognized keys fall back to a per-endpoint default. |
| `order` | string | Sort direction: `asc` or `desc`. Case-insensitive. |

Use the pair `sort` + `order`, **not** `sortBy` / `sortOrder`.

`order` is optional everywhere. Any value other than `asc` / `desc` (case-insensitive) — including an omitted one — falls back to `desc`.

Valid `sort` keys for `GET /borrow/markets`: `rate`, `liquidity`, `lltv`, `loan`, `collateral`, `termType`. See [Market API](market.md) for what each maps to.

---

## Signature-gated endpoints

A small number of endpoints return address-specific data (the emission / reward **merkle proofs**) and require the caller to prove control of the address. These endpoints take three additional query parameters:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | Yes | The address the data is being requested for. |
| `signature` | string | Yes | A wallet signature over `message`. |
| `message` | string | Yes | The signed message. Must be **exactly two lines**: an ISO-8601 UTC timestamp (`YYYY-MM-DDTHH:MM:SSZ`, optional `.SSS` milliseconds, literal `Z` only), then the literal line `Thank you for your support of listaDAO.` The timestamp must be no older than **7 days**. A message that does not match returns envelope code `1005` over HTTP 400. |
| `type` | string | No | `safe` to validate as an ERC-1271 contract wallet (e.g. Safe); omitted/other validates as a standard EOA signature. |

How verification works:

- **EOA (default):** the signer is recovered from `signature` over `message` and must equal `address` (case-insensitive).
- **`type=safe`:** the signature is validated against the address as an ERC-1271 contract wallet.
- An **invalid signature** returns code `1005`; a **message older than 7 days** returns code `401`.

This is a standard wallet-signature challenge — **no server-side secret, API key, or token is involved.** The signature-gated endpoints are documented in [Positions, Liquidation & Emission](position-liquidation-emission.md#4-emission-rewards--merkle-proofs).

---

## Caching and freshness

Most list and detail endpoints are served from a **server-side cache**. Two consequences for integrators:

- **Values reflect the last sync, not live chain state.** List and detail responses (liquidity, rates, totals, prices, APYs) are as of the most recent indexer sync and can lag the chain. Treat them as display/decision data, not as a substitute for reading the chain at transaction time.
- **For values you will sign a transaction against, read on-chain.** Build transactions from immutable market parameters — use `GET /api/moolah/allMarkets` (raw on-chain `MarketParams`-equivalent fields: `loanToken`, `collateralToken`, `oracle`, `irm`, `lltv`) and read live totals/prices directly from the Moolah contract. See [Market API](market.md) and the [Lista Lending Smart Contract](../../lista-lending/smart-contract.md) reference.

USD and asset amounts are returned as fixed-point **decimal strings** unless an endpoint notes otherwise; fields whose name ends in `Wei` carry the raw on-chain integer. Parse amounts with a big-number library rather than native floats.

---

## See also

- [Moolah Lending API](README.md) — index of endpoint pages.
- [Market API](market.md) — market list/detail, `allMarkets`, search.
- [Vault](vault.md) — vault listing and detail endpoints.
- [Positions, Liquidation & Emission](position-liquidation-emission.md) — user positions and signature-gated emission proofs.
- [Integration Patterns](../../lista-lending/integration-patterns.md) — end-to-end integration flows.
