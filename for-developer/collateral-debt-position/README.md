# Collateral Debt Position

The CDP is Lista's original borrowing product: deposit collateral, mint the **lisUSD** stablecoin against it. It is a MakerDAO/Helio-style engine — `Vat`, `Jug`, `Spotter`, `Dog`, `Clipper` and `Vow` behind an `Interaction` entrypoint.

> **This product is being wound down.** New borrowing reverts protocol-wide and both deposits and liquidation auctions are whitelisted. Build new integrations against [Lista Lending](../lista-lending/README.md) instead.

* [Mechanics](mechanics.md) — the live gates, and how an existing position is unwound.
* [Flash Loan](flash-loan.md) — ERC-3156 flash minting of lisUSD, which still works.
* [CDP API](api.md) — read-side endpoints for existing positions.
* [Smart Contract](smart-contract.md) — deployed addresses.
