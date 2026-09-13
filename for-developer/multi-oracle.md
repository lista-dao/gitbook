# Multi-Oracle

## Why the Resilient Oracle exists

A single price feed is a single point of failure: a stale or manipulated answer becomes an unnecessary liquidation or an over-sized loan, with nothing to catch it.

The Resilient Oracle removes that by giving each asset up to three independent sources — a **main**, a **pivot** and a **fallback** — and cross-validating them against each other before a price is returned. A source that is disabled, missing, stale or reverting is skipped, and a price that falls outside the asset's configured bounds is rejected rather than used. Sources can be added or switched per asset without redeploying, so an asset's topology is configuration, not code.

Collateral assets are migrating onto it progressively, so the source set differs per asset — read an asset's configuration rather than assuming one.

<figure><img src="../.gitbook/assets/image (68).png" alt=""><figcaption></figcaption></figure>

## Collateral configuration

Collateral pricing configuration is split across two pages; both sets of assets are priced by the same Resilient Oracle described above:

* [Standard Collaterals](multi-oracle-standard.md) — BNB Chain and Ethereum Chain collaterals.
* [bStock Collaterals](multi-oracle-bstock.md) — tokenized-equity (bStock) collaterals.
