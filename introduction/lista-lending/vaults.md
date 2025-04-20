# Vaults

A Lista Vault supports a single loan asset and distributes deposited funds across multiple Lista markets. By depositing into a vault, users can earn passive yield from the interest paid by borrowers.&#x20;

Vaults incorporate automated risk management, dynamically adjusting risk exposure for all deposited assets, relieving users of the need to manage these factors themselves. Users retain complete control over their funds, with the ability to monitor the vault’s status at any time and withdraw their liquidity whenever they choose.

Any users can act as suppliers and deposit into a vault to earn passive yields generated from borrower interest payments.

Key features:

1. Vaults streamline managing positions across lending markets
2. Specialized curators manage each Lista Vault to safeguard vault depositors.
3. There are no lock up periods for deposits or withdrawals
4. All vault actions are on-chain and managed through curator access for clear oversight and risk control.

## **Default Parameters**

* **Loan to value Ratio (LTV)**
  * Limited to the following fixed options:
    * 80% for all vaults
    * 90% only for looped strategy vault
    * Custom ratios are not permitted
* **Rate (Interest Rate Model)**
  * Refer to the Borrowing section (2.4); only one rate-setting method is available.
* **Fee**
  * Determined by Lista DAO; vaults cannot modify this fee independently.

## Core Rules

### **1. Oracle**

Lista Lending will utilize a basket of different Oracles with backups to ensure that the risk price manipulation through oracle pricing greatly reduced

* First supported:
  * Chainlink (Main oracle)
  * Binance Oracle (checking oracle)
  * Redstone (Backup oracle)

### **2. Vault Owner**

* Can decide which markets to invest funds in.
* By default, the depositor delegates risk management to the Vault Owner, who has full control.
* Vault owners will be solely responsible for what happens to the assets deposited into the vault.

### **3. Customize Bad Debt Handling**

Bad debts can be either amortized (spread out, gradually being reduced over time) or handled manually.

### **4. Account Management Functions**

Operates via traditional function calls, or message signatures based on the [EIP-712](https://eips.ethereum.org/EIPS/eip-712) standard.

### **5. Time locks**

Vault Owners can optionally set timelocks to govern critical parameter changes and risk management processes.

### **6. Vault Fees**

Vaults can independently charge fee, up to a maximum of 50% of their generated profits, with the specific use of these funds determined by the Vault Owner.

### **7. Curators**

Vaults can designate an Allocator or Curator role, tasked with strategically distributing liquidity across various markets.
