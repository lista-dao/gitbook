# Lista Lending

<figure><img src="../../.gitbook/assets/image (61).png" alt=""><figcaption></figcaption></figure>

Lista Lending is a fully **decentralized** and **permissionless** **P2P** lending protocol crafted for BNB Chain, breaking free from the constraints of traditional large-pool lending to cultivate a more inclusive and resilient ecosystem.

Lista Lending’s core revolves around a vault-based system, pooling liquidity and dynamically allocating it across different lending & collateral pairs, which we call **markets,** based on supply and demand.

## Core Components

### **Collateralization**

Borrowers must deposit supported crypto assets as collateral into a market of their choosing to unlock a borrowing capacity proportional to the collateral’s value (LTV ratio) from the market.

### **Liquidation Loan-To-Value (LLTV)**

When the value of the borrowed assets reaches a certain percentage of the collateral value (e.g. 90%), the collateral is considered insufficient and the borrower is at risk of being liquidated.

### **Borrowing**

The borrower specifies the amount of assets they wish to borrow from the market and provide the required collateral.

### **Interest Rates**

The borrower pays interest at an agreed-upon interest rate model, which accumulates over time and is paid at the time of repayment.

### **Repayment**

The borrower can return the loan principal and interest at any time and retrieve the collateral after the transaction is confirmed.

### **Liquidation Mechanism**

If the value of the borrowed assets exceeds the liquidation loan-to-value ratio (LLTV) set in the market due to market fluctuations or interest accrual, the pasition may be partially or fully liquidated.

### **Lending**

The Lender (supplier) deposits a certain amount of assets into the vault or market and the corresponding vault/market lends these assets to the borrower and receives interest yields.

### **Withdrawal**

The Lender can withdraw the deposited assets and interest at any time (subject to market liquidity).
