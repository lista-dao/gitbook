# Vaults

A Lista vault contains a single loan asset and will match it with potential borrowers from multiple Lista markets. Any wallet address can deposit into a vault to earn passive yields generated from borrower interest payments. Depositors of a vault will earn a portion of the interest paid by borrowers. As long as the utilization rate is not at 99.99%, depositors can withdraw their assets at any time.

At Lista, vaults incorporate automated risk management, dynamically adjusting risk exposure for all deposited assets, relieving the stress of constant monitoring and management from their depositors, while depositors retain control over their assets and withdraw their liquidity whenever they choose, as long as the proposed withdrawal won't push the utilization rate of the vault to 99.99% or higher.

As a permissionless lending protocol, Lista also allows third-party vault creation and curation. Lista DAO does not review, audit, certify, or endorse third-party vaults or their respective Curators. Please read our [third-party vault risk disclosure](../third-party-vault-risk-management.md) and employ robust risk mitigation methods before depositing into third-party curated vaults.

## Vaults and Markets

Assets in a vault may be paired with several markets that offer the same asset. Depending on the collateral, its relation to the loan asset, and supply & demand, these markets may have different parameters like liquidation loan to value (LLTV) ratio, interest rate, and fee rate.

## Core Players & Components

### 1. Oracles

Lista Lending pulls its price feeds from a basket of different oracles with backups to minimize the risk and impact of price manipulation.

Currently, Lista's price oracles include:

* Chainlink (Main oracle)
* Binance Oracle (checking oracle)
* Redstone (Backup oracle)

### 2. Vault Owner

At Lista, vault owners can decide which markets to invest funds in. By default, the depositor delegates risk management to the Vault Owner, who has full control. Vault owners will be solely responsible for what happens to the assets deposited into the vault. Refer to our [risk disclosure](../third-party-vault-risk-management.md) for more information.

### 3. Customize Bad Debt Handling

Bad debts can be either amortized (spread out, gradually being reduced over time) or handled manually.

### 4. Account Management

Operates via traditional function calls, or message signatures based on the [EIP-712](https://eips.ethereum.org/EIPS/eip-712) standard.

### 5. Time locks

Vault Owners can optionally set timelocks to govern critical parameter changes and risk management processes.

### 6. Vault Fees

Vaults can independently charge fee, up to a maximum of 50% of their generated profits, with the specific use of these funds determined by the Vault Owner.

### 7. Assignors

Vaults can designate an Allocator or Curator role, tasked with strategically distributing liquidity across various markets.
