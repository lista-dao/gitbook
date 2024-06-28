# Loan liquidation

The liquidation mechanism is applied to ensure that Lista -> Lista lisBNB -> slisBNB lisUSD -> lisUSD in pools remains fully backed by BNB collateral.

Liquidation of borrowed lisUSD may happen when the current worth of collateral with safety margin is lower than the borrowed amount of lisUSD and the borrowed lisUSD is sold in a Dutch auction (liquidated) to have the debt paid.

The liquidator receives gas compensation as a reward for starting the liquidation. It is an opportunity arising in the liquidation process, and any Lista user can do it, including the borrower themselves. Besides this opportunity, anybody who restarts the Dutch auction receives the same reward for doing it.

The debt is absorbed by Lista and the sold collateral is distributed among liquidators who participate in the auction.

If any remainder is left after the auction ends and the debt is paid, it is sent to the borrower's wallet.

For a detailed description of the liquidation process, see the [liquidation model](https://docs.helio.money/for-developers/helio-mechanics#liquidation-model).
