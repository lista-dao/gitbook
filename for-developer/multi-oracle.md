# Multi-Oracle

## **Intro of Resilient Oracle**

Previously, ListaDAO solely depended on the Atlas Oracle, ChainLink Price Feed, RedStone Oracle and API3 Oracle for price data. While this setup was mostly reliable, it presented a single point of failure. Without a backup verification system, incorrect or outdated prices could cause issues like unnecessary liquidations or inflated borrowing amounts.

To mitigate these risks, we have implemented the Resilient Price Oracle, a more advanced system that aggregates data from multiple sources for cross-verification. This new oracle uses an algorithm to compare and validate prices from different sources, ensuring greater accuracy and reliability. And collateral assets on ListaDAO are gradually transitioning to the Resilient Oracle solution.

Moreover, the upgraded oracle infrastructure allows for the real-time addition of new price oracles and offers the flexibility to activate or deactivate oracles for specific tokens as needed.

<figure><img src="../.gitbook/assets/image (68).png" alt=""><figcaption></figcaption></figure>

## Collateral configuration

Collateral pricing configuration is split across two pages, all priced by the same Resilient Oracle described above:

* [Standard Collaterals](multi-oracle-standard.md) — BNB Chain and Ethereum Chain collaterals.
* [bStock Collaterals](multi-oracle-bstock.md) — tokenized-equity (bStock) collaterals.
