# User Flow

### 1. Deposit Assets into a Vault

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXd3By57F7kuKMNq2sTRK2GNs5FAdSg9DzG5RslMa8LKVU9LnkPFsUKn2gHpYtf9K2aiPrLBOKHLc6wOI3Odqt70mAepwWZAhVVvDIYbpNstZKCsf2BCe7ZJMI362nKUfXCf2YZ0?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>

suppliers deposit a loan asset (e.g., USDT) into a vault of their choosing.

Each vault only has one type of loan asset (e.g., USDT) which can be deployed across multiple markets.

Once deposited, the vault allocates the loan asset across these markets to earn yield over time.

### 2. Vault Matches Supplier and Borrowers (P2P)

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXfbe12E5zx-0ekWuSFxeqm8uVARnYYLg3NqBnLS8Cq3V8SKzqH0-pIRkVXVyLmR651TtKyJOjcC10a3LUMBhvwj6SI_IL-7XayBgXCpOO8qArS5hHAd_T3HMVuEXK4qJfdZkjxi?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>

The vault managed by actively to match suppliers with borrowers within its associated markets:

Direct P2P lending occurs. The vault’s loan asset (e.g., USDT) is lent out via a specific market, earning interest from that specific Market. This P2P model results in higher interest for suppliers and lower borrowing costs for borrowers.

### 3. Borrowing with Collateral

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXddK9Nks8JeXyc2bRxQSnsygltWFyamhuUYlzAr25t40bIov8nOzJ-GXobvE0J1ujddsO76gjmODFA_B4YUtw-ROfKABFGkix49XYpXroUorx4ouEZ5OGyU6EIDqbkwumv8wys?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>

1. Users who want to borrow select a market to borrow from and deposit the required collateral. For example, in a USDT/BNB market, the borrower deposits ETH as collateral and borrows USDT.
2. The market locks the collateral and issues the borrowed asset, USDT
3. Each Market’s loan parameters (e.g., LLTV, collateral asset type, etc) are defined at deployment.

### 4. Rates Adjust Automatically

1. Interest rates in each market automatically adjust based on supply and demand (utilization rate)
2. The markets available on Lista Lending use a multi-oracle system to fetch accurate price feeds, protecting against price manipulation and ensures fair loan valuations.

### 5. Repay or Get Liquidated

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXcAPboGffxRDG0Dksf1hBFOR4gFLnOUXtqOc5ZH6quFlC1MQ0GrM-3TXEgXZXTCd1zNkYw1FdNMV2uGxU1yc9Vahl5kf2GcVey0TmHOt2WKQ93HLOr50H4Vzj8myxejYUvwqll3?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>



1. Borrowers can repay loans anytime, including the interest accrued.
2. Once repaid, collateral is fully returned to the borrower.
3. If the collateral value drops beyond the LLTV ratio, the system triggers liquidation, selling the collateral to cover the loan, ensuring the vault remains solvent and suppliers are protected.

### 6. Withdraw Your Funds

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXeYJtL_bZPzZK8XsGtLkpt5dbN4VPm6hhsmgQNk0liLIqkDTl7hdr9BOxnqYLWU7vl2NETDWYK2zRQ8rVburvkbXROnn4BFZvEB9Dyoov9L01VRqk1OhpoKb4fsq6hmP-IRD0k?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>



1. suppliers can withdraw their deposits and earn interest at any time, provided the vault has available liquidity.
2. Borrowers receive their collateral back after repaying the loan in full.
