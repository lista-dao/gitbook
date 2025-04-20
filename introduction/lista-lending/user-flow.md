# User Flow

## 1. Deposit Assets into a Vault

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXcmC2piP87iUaL9s0gDCFAZV9srNwGrD8BFY0PbVduuaNxA1D91N6udeCwija9NIQYfeGI5JBV8tpujalSmg3zTJ4a20P42aE5-5B3nKG3-mCQilXd88mIB0tPeNdCFeqoMpC4Wvw?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>

1. suppliers deposit a loan asset (e.g., USDT) into a vault of their choosing.
2. Each vault only has one type of loan asset (e.g., USDT) which can be deployed across multiple markets.
3. Once deposited, the vault allocates the loan asset across these markets to earn yield over time.

## 2. Vault Matches Supplier and Borrowers (P2P)

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXd652ctdJNupL08dvQrFM4narg2iQMqF0-PGPOYTjjtXOoLzyOciyqm79pnXOnOG2iQgweBOrXm30-4xTFQSfiBgakcvjA8KlBmBx8HtZsxrEXLUUlkBlppKlp6cYaYFOd_Uvz9?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>

1. The vault managed by actively to match suppliers with borrowers within its associated markets:
2. Direct P2P lending occurs. The vault’s loan asset (e.g., USDT) is lent out via a specific market, earning interest from that specific Market. This P2P model results in higher interest for suppliers and lower borrowing costs for borrowers.

## 3. Borrowing with Collateral

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXcUYGphjBmAFaCNl1mTUmeGRG1GyCscuNHkaUwYEuvzs5Jqw62DJ_XqYChHcSvuRt0WHGZnBXhjuIdSd_3RhHAqRmQohyiMcrPEDmT-oKrLtKyoORaneEBoJZsLFv1wP3hBDLv5LQ?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>

1. Users who want to borrow select a market to borrow from and deposit the required collateral. For example, in a USDT/BNB market, the borrower deposits ETH as collateral and borrows USDT.
2. The market locks the collateral and issues the borrowed asset, USDT
3. Each Market’s loan parameters (e.g., LLTV, collateral asset type, etc) are defined at deployment.\
   \


## 4. Rates Adjust Automatically

1. Interest rates in each market automatically adjust based on supply and demand (utilization rate)
2. The markets available on Lista Lending use a multi-oracle system to fetch accurate price feeds, protecting against price manipulation and ensures fair loan valuations.\
   \


## 5. Repay or Get Liquidated

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXelEuTIfRtztI1UQGqqCcxj8utEtPa2noBpWxpNXJR1tKaw8VoJB7dZLbYYZJcLccWADbJXIiSUOmudbUhs4ZLgXHfGW0Tyj61wtda4-QhBbbIGsgSWF6fO_D9mDl0kBVH-XuOC?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>

1. Borrowers can repay loans anytime, including the interest accrued.
2. Once repaid, collateral is fully returned to the borrower.
3. If the collateral value drops beyond the LLTV ratio, the system triggers liquidation, selling the collateral to cover the loan, ensuring the vault remains solvent and suppliers are protected.

## 6. Withdraw Your Funds

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXcP-KKF_8jJahb5OVxcQTwsXgAicC0wnsgorq9Qrt4_FQfr6VFCFVvgf8SZaiSANeB0iVZcn8zqjqVKmBFOIwQfG47zft-q74t24n-Jkukq9TYDs4DWOJtOaQViprvjRS-43vB1?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>

1. suppliers can withdraw their deposits and earn interest at any time, provided the vault has available liquidity.
2. Borrowers receive their collateral back after repaying the loan in full.
