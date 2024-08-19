# Loan liquidation

The liquidation mechanism is applied to ensure that <mark style="color:blue;">Lista -> Lista lisBNB -> slisBNB lisUSD -> lisUSD</mark> in pools remains fully backed by BNB collateral.

Liquidation of borrowed lisUSD may happen when the current worth of collateral with safety margin is lower than the borrowed amount of lisUSD and the borrowed lisUSD is sold in a Dutch auction (liquidated) to have the debt paid.

The liquidator receives gas compensation as a reward for starting the liquidation. It is an opportunity arising in the liquidation process, and any Lista user can do it, including the borrower themselves. Besides this opportunity, anybody who restarts the Dutch auction receives the same reward for doing it.

The debt is absorbed by Lista and the sold collateral is distributed among liquidators who participate in the auction.

If any remainder is left after the auction ends and the debt is paid, it is sent to the borrower's wallet.

For a detailed description of the liquidation process, do have a look at the liquidation model below, or refer to our detailed liquidation mechanics [here](../../../for-developer/collateral-debt-position/mechanics.md).&#x20;

## Liquidation model[​](https://helio.money/docs/mechanics/#liquidation-model) <a href="#liquidation-model" id="liquidation-model"></a>

<table><thead><tr><th width="370">Variable/Step</th><th>Value/Formula</th></tr></thead><tbody><tr><td>Price of 1 unit of collateral</td><td>$2</td></tr><tr><td>Collateral ratio</td><td>66%</td></tr><tr><td>Collateral price based on collateral ratio</td><td>$1.32</td></tr><tr><td>Assume User deposit 10 units collateral</td><td>10 * 2 = $20</td></tr><tr><td>Borrow limit</td><td>user_deposit * collateral_ratio = 20 * 0.66 = $13.2</td></tr><tr><td>Assume User borrows $13.2 of lisUSD</td><td>13.2 lisUSD</td></tr><tr><td>Assume Price of 1 unit of collateral decreases to</td><td>$1.8</td></tr><tr><td>Collateral unit price with safety margin</td><td>current_collateral_unit_price * collateral_ratio = 1.8 * 0.66 = $1.188</td></tr><tr><td>Current worth of collateral with safety margin</td><td>price_of_colatteral * amount_of_collateral= 1.188 * 10 = $11.88</td></tr><tr><td>Positive diff puts user under liquidation line</td><td>borrowed_amount - current_total_colateral_borrow_limit = 13.2 - 11.88 = $1.32</td></tr><tr><td>Amount of collateral that goes to Dutch auction</td><td>10</td></tr><tr><td>Liquidation penalty (fixed by Lista governance)</td><td>10 % of the debt</td></tr><tr><td>Debt to cover in the auction</td><td>borrowed_amount * liquidation_penalty = 13.2 * 1.10 = $14.52</td></tr><tr><td>buf (percentage similar to liquidation penalty, fixed by Lista governance)</td><td>2%</td></tr><tr><td>Starting auction price (top)</td><td>current_collaterral_unit_price * buf = 1.8 * 1.02 = $1.836</td></tr><tr><td>Somebody triggers auction and gets tip + chip as a reward for doing it (described later)</td><td></td></tr><tr><td>Auction starts and the price gradually decreases. Liquidator can participate to buy customized amount of liquidated collateral</td><td></td></tr><tr><td>tau (time until price is 0; fixed by Lista governance)</td><td>e.g. 3600</td></tr><tr><td>dur (fixed by Lista governance)</td><td>time in seconds elapsed since the auction start, e.g. 600</td></tr><tr><td>Linear decrease of price (subject to be disrupted at the below event)</td><td>top * ((tau - dur) / tau) = 1.836 * ((3600 - 600) / 3600) = $1.53</td></tr><tr><td>Pause auction because of one of two conditions: — tail (specific amount of time elapsed; fixed by Lista governance) OR — cusp (% of price drop; 40% start auction price; fixed by Lista governance)</td><td>either requirement is met, the auction will be restarted</td></tr><tr><td>Wait till someone restarts auction</td><td></td></tr><tr><td>tip (flat fee; fixed by Lista governance)</td><td>5 lisUSD</td></tr><tr><td>chip (dynamic fee; fixed by Lista governance)</td><td>0</td></tr><tr><td>Restarter gets tip + chip as a reward</td><td></td></tr></tbody></table>