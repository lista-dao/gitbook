# Mechanics

## Lista mechanics



The key components of Lista functions lie between a set of smart contracts that interact across blockchains and existing contracts. Lista created its customized smart contracts based on a fork of [MakerDAO smart contract set](https://docs.makerdao.com/).

### Modules[​](https://helio.money/docs/mechanics/#modules) <a href="#modules" id="modules"></a>

Lista consists of 2 main modules:

* Core module (a MakerDAO fork and Lista's Interaction contract) — provide collateral, borrow lisUSD, repay lisUSD, withdraw collateral, liquidate collateralized assets.
* Rewards module — claim rewards in LISTA.

### Fees[​](https://helio.money/docs/mechanics/#fees) <a href="#fees" id="fees"></a>

* Borrowing interest — an interest paid to Lista for borrowing lisUSD. The rate is a fixed number set by Lista governance platform.
* Liquidation penalty — percentage subtracted in the form of lisUSD when selling user's collateral in a Dutch action during the liquidation process.

### Ratios[​](https://helio.money/docs/mechanics/#ratios) <a href="#ratios" id="ratios"></a>

Collateral ratio — a percentage of the user's collateral value that determines the maximum borrowing limit for the user; it is calculated as follows: (total amount of lisUSD minted / total value of the collateral \* 100). Different assets will have different collateral ratios, depending on asset volatility. Collateral ratio is used as a liquidation bar to decide when a liquidation event should happen.

### Rewards[​](https://helio.money/docs/mechanics/#rewards) <a href="#rewards" id="rewards"></a>

* Borrowing reward — users get rewards for borrowing lisUSD, in LISTA — the lista token. Rewards are calculated dynamically and are the product of rewards rate and total user’s debt in lisUSD. The rewards rate is a fixed amount set by Lista.
* Auction start reward — anybody who triggers the liquidation event of a CDP, i.e. start of a Dutch auction, receives a flat fee (tip) and a percentage fee (chip) for just initiating the process. Tip and chip are paid by Lista from Lista reserves.
* Auction restart reward — anybody who restarts the Dutch auction, which is part of the liquidation process, receives a flat fee (tip) and a percentage fee (chip). An EOA can restart the auction when the auction time limit is reached or the price decrease has reached a certain threshold. These two limits are set by Lista governance. Tip and chip are paid by Lista from Lista reserves.

### Liquidation model[​](https://helio.money/docs/mechanics/#liquidation-model) <a href="#liquidation-model" id="liquidation-model"></a>

| Variable/Step                                                                                                                                                                                       | Value/Formula                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Price of 1 unit of collateral                                                                                                                                                                       | $2                                                                                 |
| Collateral ratio                                                                                                                                                                                    | 66%                                                                                |
| Collateral price based on collateral ratio                                                                                                                                                          | $1.32                                                                              |
| Assume User deposit 10 units collateral                                                                                                                                                             | 10 \* 2 = $20                                                                      |
| Borrow limit                                                                                                                                                                                        | user\_deposit \* collateral\_ratio = 20 \* 0.66 = $13.2                            |
| Assume User borrows $13.2 of lisUSD                                                                                                                                                                 | 13.2 lisUSD                                                                        |
| Assume Price of 1 unit of collateral decreases to                                                                                                                                                   | $1.8                                                                               |
| Collateral unit price with safety margin                                                                                                                                                            | current\_collateral\_unit\_price \* collateral\_ratio = 1.8 \* 0.66 = $1.188       |
| Current worth of collateral with safety margin                                                                                                                                                      | price\_of\_colatteral \* amount\_of\_collateral= 1.188 \* 10 = $11.88              |
| Positive diff puts user under liquidation line                                                                                                                                                      | borrowed\_amount - current\_total\_colateral\_borrow\_limit = 13.2 - 11.88 = $1.32 |
| Amount of collateral that goes to Dutch auction                                                                                                                                                     | 10                                                                                 |
| Liquidation penalty (fixed by Lista governance)                                                                                                                                                     | 13% of the debt                                                                    |
| Debt to cover in the auction                                                                                                                                                                        | borrowed\_amount \* liquidation\_penalty = 13.2 \* 1.13 = $14.916                  |
| buf (percentage similar to liquidation penalty, fixed by Lista governance)                                                                                                                          | 2%                                                                                 |
| Starting auction price (top)                                                                                                                                                                        | current\_collaterral\_unit\_price \* buf = 1.8 \* 1.02 = $1.836                    |
| Somebody triggers auction and gets tip + chip as a reward for doing it (described later)                                                                                                            |                                                                                    |
| Auction starts and the price gradually decreases. Liquidator can participate to buy customized amount of liquidated collateral                                                                      |                                                                                    |
| tau (time until price is 0; fixed by Lista governance))                                                                                                                                             | e.g. 3600                                                                          |
| dur (fixed by Lista governance)                                                                                                                                                                     | time in seconds elapsed since the auction start, e.g. 600                          |
| Linear decrease of price (subject to be disrupted at the below event)                                                                                                                               | top \* ((tau - dur) / tau) = 1.836 \* ((3600 - 600) / 3600) = $1.53                |
| Pause auction because of one of two conditions: — tail (specific amount of time elapsed; fixed by Lista governance) OR — cusp (% of price drop; 40% start auction price; fixed by Lista governance) | either requirement is met, the auction will be restarted                           |
| Wait till someone restarts auction                                                                                                                                                                  |                                                                                    |
| tip (flat fee; fixed by Lista governance))                                                                                                                                                          | 5 lisUSD                                                                           |
| chip (dynamic fee; fixed by Lista governance))                                                                                                                                                      | 0                                                                                  |
| Restarter gets tip + chip as a reward                                                                                                                                                               |                                                                                    |

## Smart contracts[​](https://helio.money/docs/mechanics/#smart-contracts) <a href="#smart-contracts" id="smart-contracts"></a>

The smart contracts that implement Lista are:

* MakerDAO set — the Maker Protocol, also known as the Multi-Collateral Dai (MCD) system, allowing users to generate lisUSD by leveraging collateralized assets. lisUSD is a decentralized, unbiased, collateral-backed cryptocurrency soft-pegged to the US Dollar.
  * ABACI — price decrease function for Dutch auctions during the liquidation process of user's assets.
  * CLIP — liquidation v2.0 mechanics.
  * DOG — starts Dutch auctions during the liquidation process of user's assets.
  * JUG — collects Lista's borrowing interest for lending lisUSD to the user.
  * JAR — stakes and unstakes lisUSD, mints and burn hHAY token (token–deposit receipt for staked lisUSD).&#x20;
  * JOIN — BEP-20 token adapters:
    * HayJoin — adapter between MakerDAO and lisUSD via which adapter which withdraws internal lisUSD from the system into a standard ERC20 token when user borrows lisUSD tokens or burns ERC20 when user repays their lisUSD loan to Lista.
    * ceaBNBcJoin — adapter between MakerDAO and HelioProvider that allows user assets to be deposited in the system for collateralization.
  * SPOT — oracle that fetches the price of ankrBNB, which is an intermediate token used during the process of collateralizing user's assets.
  * VAT — сore vault for collateralized debt positions (CDP).
  * VOW — vault balance sheet. Keeps track of debt or surplus of lisUSD.
* CurveProxyForDeposit — add liquidity to the StableSwap pool, get LP tokens, deposit LP tokens for Farming smart contract.
* Farming — deposit or withdraw farmed tokens, distribute rewards in lisUSD to the depositors.
* IncentiveVoting — distribute rewards among the internat pools (in the Farming contract) or external pools (e.g. Ellipsis, Wombat, and so on), depending on the votes, which depend on the staked Lista governance tokens (future functionality).&#x20;
* StableCoinStrategyCurve — swap PancakeSwap farming rewards (CAKE) into lisUSD and BUSD, add them to the StableSwap liquidity pool, get LP tokens, add these LP tokens to the user share in the pool.&#x20;
* HelioRewards — rewards distribution, in the Lista rewards token.
* HelioToken — BEP-20 compatible rewards token given to the user for borrowing lisUSD.
* HelioOracle — oracle for the Lista rewards token.
* HelioProvider — wraps BNB into ceABNBc via cerosRouter.
* cerosRouter — finds the best way to obtain ankrBNB, which is an intermediate token used during the process of collateralizing user's assets.
* CeToken — ceABNBc, which is the underlying collateral token inside MakerDAO.
* CeVault — stores obtained ankrBNB, which is an intermediate token used during the process of collateralizing user's assets.
* Interaction — proxy for the MakerDAO contracts. Provides deposit, withdraw, borrow, payback, and liquidation functions to the end users.
* AuctionProxy — entrypoint for Dutch auction methods, which is part of the liquidation process of user's assets. Allow users to start and participate in auctions.
* ankrBNB — liquid yield-bearing token used during the process of collateralizing user's assets.
* hBNB — token minted for the user as a deposit receipt for their collateral.
* HelioETHProvider — wraps ETH into cewBETH via cerosETHRouter.
* cerosETHRouter — handles user deposits and withdraws in ETH/wBETH.
* CeToken — cewBETH, which is the underlying collateral token for ETH inside MakerDAO.
* CeETHVault — stores obtained ETH/wBETH, which is an intermediate token used during the process of collateralizing user's ETH assets.
* hETH — token minted for the user as a deposit receipt for their collateral(ETH).

For the addresses, refer to [smart contracts addresses table](https://helio.money/docs/extra/smart-contracts). For the codebase, refer to the [smart contracts repo on GitHub](https://github.com/helio-money/helio-smart-contracts).

## Workflow[​](https://helio.money/docs/mechanics/#workflow) <a href="#workflow" id="workflow"></a>

Here are the main Lista's operations described in high-level detail.

### Collateralize user’s assets to borrow lisUSD[​](https://helio.money/docs/mechanics/#collateralize-users-assets-to-borrow-hay) <a href="#collateralize-users-assets-to-borrow-hay" id="collateralize-users-assets-to-borrow-hay"></a>

When a user initiates a deposit action, the following sequence of events will occur.

1. User transfers BNB to Lista via `HelioProvider::provide()`.
2. `HelioProvider` mints hBNB for the user as a deposit receipt for their collateral.
3. `HelioProvider` gets ceABNBc, running the following logic inside:
   1. Exchanges BNB for [ankrBNB](https://www.ankr.com/docs/staking/liquid-staking/bnb/faq/#which-wallets-are-compatible-with-the-abnbbabnbc-tokens) via `cerosRouter::deposit({value: msg.value})`. During this step, `cerosRouter` weighs the method profitability and choose 1 from the following 2 options:
      1. Option 1: swap BNB on DEX for ankrBNB.
      2. Option 2: stake BNB in Binance Liquid Staking via the BinancePool smart contract and exchange BNB for ankrBNB.
   2. `cerosRouter` sends ankrBNB to `CeVault` for storing the amount of exchanged ankrBNB. This is done via `CeVault::depositFor(msg.sender, amount after exchange)`, where `msg.sender` — HelioProvider address and `amount after exchange` — the amount of exchanged ankrBNB.
   3. `CeVault` mints ceABNBc for `HelioProvider`.
4. `HelioProvider` collateralizes ceABNBc via `Interaction::deposit(account, address(ceABNBc), amount)`, where `account` — user's account address, `address(ceABNBc)` — address of ceABNBc smart contract, `amount` — BNB initially collateralized by the user minus fees ([`relayer fee`](https://www.ankr.com/docs/staking/liquid-staking/bnb/staking-mechanics#fees) from `BinancePool`). `Interaction` runs the following logic inside:
   1. Transfers ceABNBc (BEP-20 token) to the `Interaction` smart contract, via the `transfer()` function of the BEP-20 token smart contract.
   2. Transfers the assets to the MakerDAO vault via `gem::join()`. For more information, refer to the [Join docs](https://docs.makerdao.com/smart-contract-modules/collateral-module/join-detailed-documentation).
   3. Makes the `VAT` smart contract fully trust the `Interaction` smart contract via `VAT::behalf()`.
   4. Locks the assets inside MakerDAO via `VAT::frob()`, effectively collateralizing them. For more information, refer to the [VAT docs](https://docs.makerdao.com/smart-contract-modules/core-module/vat-detailed-documentation).
   5. Emits a _Deposit_ event.

### Collateralize user’s ETH to borrow lisUSD[​](https://helio.money/docs/mechanics/#collateralize-users-assets-to-borrow-hay)

1. User transfers ETH to Lista via `HelioETHProvider::provide(amount)`.
2. `HelioETHProvider` mints `hETH` for the user as a deposit receipt for their collateral.
3. `HelioETHProvider` gets `cewBETH`, running the following logic inside:
   1. Exchange ETH for wBETH via `cerosETHRouter::deposit(amount`). During this step, `cerosETHRouter` will keep the utilization ratio(80% by default) and mints the appropriate amount by `_BETH.deposit`. `_BETH` will be the address of the Wrapped Binance ETH token.&#x20;
   2. `cerosETHRouter` sends `wBETH` to `CeETHVault` via `CeETHVault::depositFor(msg.sender, certTokenAmount, BETHAmount)`.
   3. CeETHVault mints cewBETH for HelioProvider.
4. HelioETHProvider collateralizes cewBETH via `Interaction::deposit(account, address(cewBETH), amount)`, where `account` — user's account address, `address(cewBETH)` — address of `cewBETH` smart contract, `amount` — ETH initially collateralized by the user minus fees. \
   `Interaction` runs the same logic as BNB collateral.

### Borrow lisUSD[​](https://helio.money/docs/mechanics/#borrow-hay) <a href="#borrow-hay" id="borrow-hay"></a>

When a user initiates a borrowing action, the following sequence of events will occur.

1. Borrow lisUSD via `Interaction::borrow()`. `Interaction` runs the following logic inside:
   1. Calculate the current lisUSD value inside Lista. Calculation takes into consideration the borrowing limit, which is the price of the total assets collateralized by the user \* collateral ratio (fixed amount set by Lista).
   2. The user is indebted for an amount equivalent to the borrowed lisUSD via `VAT::frob()`. For more information, refer to the [VAT docs](https://docs.makerdao.com/smart-contract-modules/core-module/vat-detailed-documentation).
   3. Transfer the borrowed lisUSD via `HAYJoin::exit()`. For more information, refer to the [Join docs](https://docs.makerdao.com/smart-contract-modules/collateral-module/join-detailed-documentation).
   4. Emit a _Borrow_ event.

### Farm lisUSD–BUSD (LP) (PancakeSwap — StableSwap pool) <a href="#farm-hay-busd" id="farm-hay-busd"></a>

There are two cases:

* User doesn't yet have LP tokens.
* User already has LP tokens.

When a user **doesn't yet have LP tokens** and initiates a farming action, the following sequence of events will occur.

1. Let `CurveProxyForDeposit` access lisUSD tokens via lisUSD`::approve(spender, amount)` and BUSD tokens via `busd::approve(spender, amount)`, where `spender` — address of the CurveProxyForDeposit smart contract, `amount` — amount to approve access to.
2. `CurveProxyForDeposit` adds the approved tokens to the StableSwap liquidity pool via `CurveProxyForDeposit::depositToFarming(stableSwap, amount0, amount1, minMintAmount)`, where `stableSwap` — address of the StableSwap pool, `amount0` — amount of lisUSD tokens to add, `amount1` — amount of BUSD tokens to add, `minMintAmount` — minimum amount of LP tokens to mint from the added liquidity.
3. `CurveProxyForDeposit` deposits the minted LP tokens from #2 to `Farming` via `Farming::deposit(uint256 _pid, uint256 _wantAmt, bool _claimRewards, address _userAddress)`, where `_pid` — pool ID in `Farming`, `_wantAmt` — amount of LP tokens, `_claimRewards` — auto-claim of rewards (def.  value — false), `_userAddress` — address of the user who called the function.
4. `Farming` transfer the received LP tokens to `StableCoinStrategyCurve` via `StableCoinStrategyCurve::deposit(address _userAddress, uint256 _wantAmt)`, where `_userAddress` — address of the user who called the function, `_wantAmt` — amount of sent LP tokens.
5. `StableCoinStrategyCurve` deposits LP tokens to `MasterChefV2` via `MasterChefV2::deposit(uint256 _pid, uint256 _wantAmt)`, where `_pid` — pool ID in `MasterChefV2`, `_wantAmt` —  amount of deposited LP tokens.

When a user **has LP tokens** and initiates a farming action, the following sequence of events will occur.

1. Let `Farming` access the LP tokens via `PancakeStableSwapLP::approve(spender, amount)`, where `lp` is a PancakeSwap LP token smart contract, `spender` — address of `Farming`, `amount` — amount of LP tokens to give access to.
2. Deposit the LP tokens to `Farming` via `Farming::deposit(uint256 _pid, uint256 _wantAmt, bool _claimRewards, address _userAddress)`, where `_pid` — pool ID in `Farming`, `_wantAmt` — amount of LP tokens, `_claimRewards` — auto-claim of rewards (def.  value — false), `_userAddress` — address of the user who called the function.
3. `Farming` transfers the received LP tokens to `StableCoinStrategyCurve` via `StableCoinStrategyCurve::deposit(address _userAddress, uint256 _wantAmt)`, where `_userAddress` — address of the user who called the function, `_wantAmt` — amount of sent LP tokens.
4. `StableCoinStrategyCurve` deposits LP tokens to `MasterChefV2` via `MasterChefV2::deposit(uint256 _pid, uint256 _wantAmt)`, where `_pid` — pool ID in `MasterChefV2`, `_wantAmt` —  amount of deposited LP tokens.

### Compound farming rewards  <a href="#compound-farming-rewards" id="compound-farming-rewards"></a>

When Lista creates compound rewards, the following sequence of events will occur.

1. Harvest the rewards via `StableCoinStrategyCurve::harvest()` . `StableCoinStrategyCurve` runs the following logic inside:
   1. Gets rewards in the CAKE token via `MasterChefV2.withdraw(pid, _wantAmt)`, where `pid` — pool ID in `MasterChefV2`, and `_wantAmt` — 0.
   2. If CAKE\_amount > minEarnAmount, swap all CAKE to BUSD via `IPancakeRouter02(_uniRouterAddress).swapExactTokensForTokens( _amountIn, 0, _path, _to, _deadline )`, where `_amountIn` — amount of CAKE, `0` — no min amount of BUSD to get, `_path` — array (CAKE address, BUSD address), `_to` — address of `StableCoinStrategyCurve`, `_deadline` — block timestamp + 700. Else, finish the workflow.
   3. Swap half of the swapped BUSD for lisUSD via `StableSwap.exchange(_i, _j, _dx, 0)`, where `_i` — 1 (BUSD), `_j` — 0 (lisUSD), `_dx` — amount of BUSD, `0` — no min amount of lisUSD to get.
   4. Add liquidity via `StableSwap::add_liquidity(amounts, 0)`, where `amounts` — array (amount of lisUSD, amount of BUSD), `0` — no min amount of LP tokens to mint from the added liquidity.
   5. Farm the obtained LP tokens via `MasterChefV2.deposit(pid, wantAmt)`, where `pid` — pool ID in `MasterChefV2`, `wantAmt` — amount of LP tokens obtained at #4.&#x20;

### Claim farming rewards <a href="#claim-farming-rewards" id="claim-farming-rewards"></a>

When a user initiates a reward-claiming action, the following sequence of events will occur.

1. Claim rewards in lisUSD via `Farming::claim(address _user, uint256[] _pids)`, where `_user` — address to claim rewards for, `_pids` — array of pool IDs to get rewards for.

### Withdraw lisUSD–BUSD (LP) (PancakeSwap — StableSwap pool) <a href="#unfarm-lp" id="unfarm-lp"></a>

When a user initiates an unfarming action, the following sequence of events will occur.

1. User withdraws LP tokens via `Farming::withdraw(uint256 _pid, uint256 _wantAmt, bool _claimRewards)`, where `_pid` — pool ID in `Farming`,  `_wantAmt` — amount of LP tokens to withdraw (set to max value of `uint256` to withdraw all user's LP tokens), `_claimRewards` — auto-claim rewards. `Farming` runs the following logic inside:
   1. `Farming` withdraws LP tokens from `StableCoinStrategyCurve` via `StableCoinStrategyCurve::withdraw(address _userAddress, uint256 _wantAmt)`, where `_userAddress` — address of the user who called the function, `_wantAmt` — amount of LP tokens to withdraw.
   2. `StableCoinStrategyCurve` withdraws LP tokens to `MasterChefV2` via `MasterChefV2::withdraw(uint256 _pid, uint256 _wantAmt)`, where `_pid` — pool ID in `MasterChefV2`, `_wantAmt` —  amount of withdrawn LP tokens.

{% hint style="info" %}
You can also use `withdrawAll(uint256 _pid, bool _claimRewards)` at #1.1 to withdraw all the user's LP tokens.
{% endhint %}



### Withdraw lisUSD–BUSD (PancakeSwap — StableSwap pool) <a href="#withdraw-hay-busd" id="withdraw-hay-busd"></a>

User visit the StableSwap pool on PancakeSwap and withdraws the liquidity (lisUSD and BUSD) manually.

### Stake lisUSD <a href="#stake-hay" id="stake-hay"></a>

When a user initiates a staking action, the following sequence of events will occur.

1. Deposit lisUSD via `JAR::join()`. `JAR` runs the following logic inside:
   1. Mint hHAY token in 1:1 ratio to the deposited lisUSD amount.&#x20;
   2. Emit a _Join_ event.

### Unstake lisUSD <a href="#unstake-hay" id="unstake-hay"></a>

When a user initiates an unstaking action, the following sequence of events will occur.

1. Withdraw lisUSD via `JAR::exit()`. `JAR` runs the following logic inside:
   1. Burn hHAY token in 1:1 ratio to the deposited lisUSD amount.&#x20;
   2. Emit an _Exit_ event.

### Repay lisUSD <a href="#repay-hay" id="repay-hay"></a>

When a user initiates a repayment action, the following sequence of events will occur.

1. Repay Lista the borrowed lisUSD via `Interaction::payback()`. `Interaction` runs the following logic inside:
   1. Transfer the lisUSD (BEP-20 token) to the `Interaction` smart contract via the `transfer()` function of the BEP-20 token smart contract.
   2. Transfer the lisUSD to the MakerDAO vault via `HAYJoin::join()`. For more information, refer to the [Join docs](https://docs.makerdao.com/smart-contract-modules/collateral-module/join-detailed-documentation).
   3. Calculate the current lisUSD value inside Lista.
   4. Subtract the repaid lisUSD amount from the user’s debt via `VAT::frob()`. For more information, refer to the [VAT docs](https://docs.makerdao.com/smart-contract-modules/core-module/vat-detailed-documentation).
   5. Emit a _Payback_ event.

### Withdraw BNB collateral[​](https://helio.money/docs/mechanics/#withdraw-collateral) <a href="#withdraw-collateral" id="withdraw-collateral"></a>

When a user initiates a withdrawal action and supplies with their hBNB, the following sequence of events will occur.

1. Platform burn user's hBNB via `HelioProvider::release()`.
2. `HelioProvider` gets ceABNBc back via `Interaction::withdraw(account, address(ceABNBc), amount)`, where `account` — user's account address, `address(ceABNBc)` — address of ceABNBc smart contract, `amount` — BNB initiallly collateralized by the user - fees ([`relayer fee`](https://www.ankr.com/docs/staking/liquid-staking/bnb/staking-mechanics#fees) from `BinancePool`). `Interaction` runs the following logic inside:
   1. Unlock the assets via `VAT::frob()`. For more information, refer to the [VAT docs](https://docs.makerdao.com/smart-contract-modules/core-module/vat-detailed-documentation).
   2. Transfer the assets from the CDP engine to the MakerDAO vault via `VAT::flux()`. For more information, refer to the [VAT docs](https://docs.makerdao.com/smart-contract-modules/core-module/vat-detailed-documentation).
   3. Transfer the assets to the user’s wallet via `gem::exit()`. For more information, refer to the [Join docs](https://docs.makerdao.com/smart-contract-modules/collateral-module/join-detailed-documentation).
   4. Emit a withdraw event.
3. Exchange ceABNBc to BNB.
   1. `HelioProvider` exchanges ceABNBc for ankrBNB via `cerosRouter::withdraw(address recipient, uint256 amount)`, where `address recipient` — desired user's address to release BNB to in the future, `amount` — amount ceABNBc to exchange to BNB.
   2. `cerosRouter` in turn calls `CeVault::withdrawFor(msg.sender, address(this), amount)` to exchange ankrBNB for BNB, where `address(this)` — address of `cerosRouter`, `amount` — amount ceABNBc to exchange to ankrBNB, `msg.sender` — address of the `HelioProvider` smart contract.
   3. `CeVault` burns ankrBNB and unstakes BNB via `BinancePool::unstakeCerts(recipient, realAmount)`, where `recipient` — user's address, `realAmount` — amount of BNB \* ankrBNB`.ratio()`.

### Withdraw ETH collateral

When a user initiates a withdrawal action and supplies with their hETH, the following sequence of events will occur.

1. Platform burn user's hETH via `HelioETHProvider::releaseInETH()` or `HelioETHProvider::releaseInBETH()`. Both works exactly the same, only difference is that, users can get ETH or wBETH depending on which function to use.
2. `HelioETHProvider` gets cewBETH back via `Interaction::withdraw(account, address(cewBETH), amount)`, where `account` — user's account address, `address(cewBETH)` — address of cewBETH smart contract, `amount` — ETH initiallly collateralized by the user. `Interaction` runs the same logic as the BNB withdraw.
3. Exchange cewBETH to ETH/wBETH.
   1. `HelioETHProvider` exchanges cewBETH for ETH/wBETH via `cerosETHRouter::withdrawETH(address recipient, uint256 amount)` or `cerosETHRouter::withdrawBETH(address recipient, uint256 amount)`, where `address recipient` — desired user's address to release ETH/wBETH to in the future, `amount` — amount cewBETH to exchange to ETH/wBETH.
   2. `cerosETHRouter` in turn calls `CeETHVault::withdrawETHFor(msg.sender, address(this), amount)` or `CeETHVault::withdrawBETHFor(msg.sender, address(this), amount)` to exchange cewBETH for ETH/wBETH, where `address(this)` — address of `cerosETHRouter, amount` — amount cewBETH to exchange to ETH/wBETH, `msg.sender` — address of the `HelioETHProvider` smart contract.
   3. `CeETHVault` burns cewBETH and unstakes BETH if needed.

\


\


### Claim rewards[​](https://helio.money/docs/mechanics/#claim-rewards) <a href="#claim-rewards" id="claim-rewards"></a>

Borrowers can claim rewards in the form of LISTA for borrowing lisUSD. When a user initiates a claim rewards action, the following sequence of events will occur.

1. Claim a reward for the borrowed lisUSD to the user’s wallet via `HelioRewards::claim()`. `HelioRewards` runs the following logic inside:
   1. Update the rewards pool size and rewards rate.
   2. Transfer the pending user rewards to the user’s wallet via `HelioToken::transfer()`.

### Liquidation[​](https://helio.money/docs/mechanics/#liquidation) <a href="#liquidation" id="liquidation"></a>

When liquidation of assets is possible and when a user initiates a liquidation action, the following sequence of events will occur.

For explanation of specific parameters and their current values, refer to the [liquidation model](https://helio.money/docs/mechanics#liquidation-model) earlier on this page.

1. When the current worth of collateral with safety margin < borrowed amount of lisUSD, a user (anybody) triggers the liquidation process via `Interaction::startAuction(token, user, keeper)`, where `token` — address of the liquidated assets, `user` — address of user whose collateral is being liquidated, `keeper` — address of the user who gets a reward (_tip_ + _chip_) for starting the auction. `Interaction` runs the following logic inside:
   1. Start a Dutch auction:
      1. Set the starting auction price for the liquidated collateral to be equal (_current\_collaterral\_unit\_price_ \* _buf_).
      2. Let anybody come and buy via `buyFromAuction(token, auctionId, collateralAmount, maxPrice, receiverAddress)` to buy any amount > than _dust_ (currently 1 USD). `token` — address of the liquidated assets, `auctionId` — ID of the auction, `collateralAmount` — amount to buy, `maxPrice` — price to pay , `receiverAddress` — address of the buyer.
      3. If the `maxPirce` is > current\_ auction\_collateral\_unit\_price, sell the requested amount of the user's collateral to the buyer.
      4. Else, incrementally lower the auction price and let anybody buy still. The reason for decreasing from a higher price is because of bots and change of collateral price from oracle to avoid any sudden loss. The auction lasts a fixed amount of time (_tau_) set by Lista governance. The price is recalculated every second of the auction.
      5. When the auction time limit is reached or the price decrease has reached a certain threshold (the limits are set by Lista governance; currently the time limit is 21600s and price limit is 40%), let anybody come and restart the auction and get a reward (_tip_ + _chip_) for doing it.
   2. Transfer the price paid in 1.3, in lisUSD, from the buyer's wallet to Lista.
   3. Exchange ceABNBc for ankrBNB and send ankrBNB to the buyer's wallet. Effectively, buyer buys ankrBNB that they can later exchange for BNB.
   4. Cover debt and keep profit (borrowed amount + (borrow interest + liquidation penalty)).
   5. Calculate the remainder (price paid - debt - profit). Send the remainder to the user’s wallet.
