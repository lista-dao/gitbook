# RWA Markets

Real-World Asset (RWA) marketplace offers tokenized RWA purchases, like short-term U.S. treasuries and collateral loan obligations, with crypto assets. These RWAs offer a predictable interest rate with different risk levels.

### How it works

When a purchase order is placed, Lista will mint RWA tokens of the same value and distribute them to the buyer. These tokens are yield bearing so their value will increase over time. Each Tuesday, Lista will calculate the interest over the past week and factor it into the price of each RWA token. Note that Lista will take a small percentage (5% at the moment) of the interest earned as fees.

These RWA tokens can also be burnt to redeem their value and withdraw liquidity. The underlying instruments - U.S. treasuries, corporate debt collateral, and more - can only be sold during work days so it may take 5 to 14 days before your redemption is completed. Note that Lista will charge a 0.1% fee for redemption.

All RWA token purchases and redemptions are processed through Janus Henderson Anemoy Treasury Fund (the Fund), a tokenized British Virgin Islands (BVI) professional fund powered by Centrifuge. The Fund is licensed by the British Virgin Islands Financial Services Commission (FSC), and open to non-US investors.

### Dowsure RWA Token

#### Product Details

| Parameter              | Details                 |
| ---------------------- | ----------------------- |
| Target APY             | \~10%                   |
| Lock Period            | 90 days                 |
| Minimum Deposit        | $100 USD                |
| Vault Capacity         | $3M (scaling to $15M)   |
| Subscription Window    | Day -7 to Day 0         |
| Historic Bad Debt Rate | < 1.5% (5-year average) |
| Auto-Roll              | Yes (opt-out by Day 83) |

The Dowsure RWA token on Lista is backed by three underlying assets:

1\. Payoneer Advance This represents pre-settlement receivables for Amazon cross-border sellers. Platforms like Amazon typically take 14+ days to settle while Dowsure advances merchants their funds early. Cycles range from 14 to 28 days and the liquidity is typically high.

2\. Dowsure’s Buy-Now-Pay-Later Supplier invoice financing for large-ticket purchases ($500K+). Merchants receive goods upfront while Dowsure bridges the payment gap. Cycles range from 20 to 30 days. Clients are mostly merchants with considerable loan sizes (typically over $500,000).&#x20;

3\. LOC Credit Lines Dowsure's flagship product with a 5-year track record. This product provides credit lines for established e-commerce merchants (>$10M annual revenue) on Amazon, eBay, and Walmart. Funded by HSBC, Standard Chartered, Hang Lung Bank, CMB, CCB, and multiple funds. Bad debt rate is held below 1.5% over 5 years.

### Security & Risk Controls

* 3PAR Auto-Repayment: 3PAR is a financing platform co-developed by Dowsure with Amazon, Walmart, eBay, and Payoneer. Upon merchant authorization, platform sales proceeds are automatically routed to Dowsure before the seller's normal settlement, ensuring stable repayment at the source.
* DAL Dual-Lock: A patented fund control system that locks merchant payout accounts, verifies the actual business controller, and enables fund freezing or forced deduction in the event of default.
* KYC + AML Compliant: Full Know Your Customer and Anti-Money Laundering processes completed on all borrowers.

Early Exit: You may withdraw 90% of your principal at any time before Day 90 (subject to a yield penalty based on days staked). The remaining 10% is held until Day 90 and released after bad debt audit.

Bad Debt Policy: If the bad debt rate exceeds 4% APY, the excess will be deducted from the yield users receive. The 5-year historical average is below 1.5%.
