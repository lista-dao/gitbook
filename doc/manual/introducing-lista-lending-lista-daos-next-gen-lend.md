> **Source:** https://medium.com/listadao/introducing-lista-lending-lista-daos-next-gen-lending-protocol-592ee591ddc2

---

Introducing Lista Lending: Lista DAO’s Next-Gen Lending Protocol
================================================================

[![Lista DAO](https://miro.medium.com/v2/resize:fill:64:64/1*MjzENF0Jemedfu3G3f0-Ng.png)

](https://medium.com/@ListaDAO?source=post_page---byline--592ee591ddc2---------------------------------------)[Lista DAO](https://medium.com/@ListaDAO?source=post_page---byline--592ee591ddc2---------------------------------------)

5 min read·Apr 7, 2025

\--

5

Listen

Share

**Key Highlights of Lista Lending:**
====================================

1.  **Permissionless P2P lending model:** Utilizing vaults and markets, giving more flexibility to collateral choices
2.  **Dynamic Interest Rates:** Utilizes a multi-oracle system to ensure accurate and fair pricing, automatically adjusting rates based on market conditions.  
    \- Higher supplier interest rates  
    \- Lower borrower interest rate
3.  **Enhanced risk control:** isolated vault risk and borrower protection

Introduction
============

BNB Chain’s DeFi ecosystem thrives with a $5.32 billion TVL as of March 2025, yet lending lags at $1.855 billion — far below Ethereum’s 50% lending share of $46 billion or Base’s $1.2 billion of $2.9 billion. This gap highlights an underserved market on BNB Chain, craving better rates, collateral options, and security. Lista Lending, from Lista DAO, fills this void with a decentralized, flexible protocol built to maximize BNB Chain’s DeFi potential.

The core pillars of Lista DAO
=============================

Lista DAO creates a simple DeFi system on BNB Chain with three key parts:

*   **lisUSD Stablecoin:** Deposit collateral to mint lisUSD, a stablecoin providing scalable liquidity across the ecosystem.
*   **slisBNB Liquid Staking:** Liquid stake BNB to get slisBNB, a liquid token that unlocks staking rewards while enabling flexible use in lending or collateral
*   **Lista Lending:** A capital efficient P2P lending protocol through the use of curated vaults and isolated lending markets with different parameters rates.

These layers integrate to form a seamless DeFi framework. This article focuses on Lista Lending, which uses a **Morpho-inspired vault & market system to redefine lending on BNB Chain**, stacking up to revolutionise BNB chain’s lending market .

Addressing the Gaps: Introducing Lista Lending
==============================================

Lista Lending is a fully **decentralized** and **permissionless** **P2P** lending protocol crafted for BNB Chain, breaking free from the constraints of traditional large-pool lending to cultivate a more inclusive and resilient ecosystem.

Lista Lending’s core revolves around a vault-based system, pooling liquidity and dynamically allocating it across different lending & collateral pairs, which we call **markets,** based on supply and demand.

How Lista Lending Works
=======================

Vaults
======

A Lista Vault holds **one** loan asset and distributes deposits across multiple Lista Lending markets.

Any users can act as suppliers and deposit into a vault to earn passive yields generated from borrower interest payments.

Key features includes the following:

1.  Vaults streamline managing positions across lending markets
2.  Specialized curators manage each Lista Vault to safeguard vault depositors.
3.  There are no lock up periods for deposits or withdrawals
4.  All vault actions are on-chain and managed through curator access for clear oversight and risk control.

Markets
=======

A Market is an isolated lending pool that pairs one collateral asset with one loan asset (eg; USDT/BNB). Each market operates independently, isolating risks to prevent spillover, and remains immutable after launch. Each vault can have multiple markets. Creating a market is permissionless.

Key features includes the following:

1.  One collateral asset, one loan asset per market
2.  Loan parameters are immutable
3.  Each market operates independently from one another
4.  Anyone can create a new market, and governance approval is not required

Suppliers
=========

Anyone can be a supplier — individuals, protocols, DAOs, or hedge funds. They can either actively manage positions by lending directly into specific markets, or take a more passive route by depositing into a vault aligned with their risk profile. The vault then allocates funds across markets for the supplier.

Borrowers
=========

Borrowers can select from a range of markets on Lista Lending based on their needs — such as preferred collateral types, loan asset, and favorable borrowing rates.

**User Flow**
=============

**1\. Deposit Assets into a Vault**
-----------------------------------

a. suppliers deposit a loan asset (e.g., USDT) into a vault of their choosing.

b. Each **vault** only has one type of **loan asset** (e.g., USDT) which can be deployed across multiple **markets**.

c. Once deposited, the vault allocates the loan asset across these markets to earn yield over time.

**2\. Vault Matches Supplier and Borrowers (P2P)**
--------------------------------------------------

a. The vault managed by actively to **match suppliers with borrowers** within its associated markets:

b. Direct P2P lending occurs. The vault’s loan asset (e.g., USDT) is lent out via a specific market, earning interest from that specific Market. This P2P model results in **higher interest for suppliers** and **lower borrowing costs for borrowers**.

**3\. Borrowing with Collateral**
---------------------------------

a. Users who want to borrow select a market to borrow from and deposit the required collateral. For example, in a USDT/BNB market, the borrower deposits ETH as collateral and borrows USDT.

b. The market locks the collateral and issues the borrowed asset, USDT

c. Each Market’s loan parameters (e.g., LLTV, collateral asset type, etc) are defined at deployment.

**4\. Rates Adjust Automatically**
----------------------------------

a. Interest rates in each market automatically adjust based on supply and demand (utilization rate)

b. The markets available on Lista Lending use a **multi-oracle system** to fetch accurate price feeds, protecting against price manipulation and ensures fair loan valuations.

**5\. Repay or Get Liquidated**
-------------------------------

a. Borrowers can **repay loans anytime**, including the interest accrued.

b. Once repaid, collateral is fully returned to the borrower.

c. If the collateral value drops beyond the LLTV ratio, the system triggers **liquidation**, selling the collateral to cover the loan, ensuring the vault remains solvent and suppliers are protected.

**6\. Withdraw Your Funds**
---------------------------

a. suppliers can **withdraw their deposits and earn interest** at any time, provided the vault has available liquidity.

b. Borrowers receive their collateral back after repaying the loan in full.

The advantages of Lista Lending
===============================

*   Efficient & Flexible Deployment
*   Permissionless P2P lending model
*   Support Advanced Strategies
*   Multi-oracle Design
*   Upgradeable contracts
*   Enhanced risk control measures

Lista Lending vs Morpho
=======================

Lista Lending vs Venus
======================

Full article here: [Lista Lending: Advantages and Comparisons](https://medium.com/listadao/lista-lending-advantages-and-comparisons-2535fa1a6af0)