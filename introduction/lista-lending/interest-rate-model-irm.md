# Interest Rate Model (IRM)

### Interest Rate Model

At Lista Lending, interest rate is determined by our Interest Rate Model (IRM) based on the supply and demand of the loan asset. The key indicator of the supply and demand is market utilization rate - the ratio between borrowed to supplied assets. Lista's IRM will adjust the interest rate based on the market utilization rate. When the market utilization rate gets too high, Lista's IRM will increase the borrow rate (APY) greatly to incentivize repayment, and vice versa. In a sufficiently active market, the most ideal market utilization rate is 90% and Lista's IRM will try to keep it at this level.

Unlike traditional lending protocols with static rates or single-pool designs, Lista Lending applies the IRM across multiple markets within each vault, offering curators flexibility to refine strategies while ensuring competitive rates for borrowers and lenders.

#### How It works

Lista's IRM powers the entire Lista Lending by dictating the instantaneous borrow rate based on the utilization rate. It targets a 90% utilization rate to balance efficiency and liquidity. This IRM operates through two complementary mechanisms:

1. **Curve Mechanism**\
   This adjusts borrow rates instantly based on real-time utilization and a target utilization rate. Currently, Lista is targeting 90% utilization rate for all lending markets.

* Key Parameter: $$r_{90\%}$$. The borrow rate at target utilization: 90%.

When the utilization rate goes above 90%, the borrow rate will also go up linearly to $$4 \times r_{90\%}$$ at 100% utilization rate.

When the utilization rate goes below 90%, the borrow rate will go down linearly to $$0.25 \times r_{90\%}$$ at 0% utilization rate.

2. **Adaptive Mechanism**\
   This mechanism shifts the entire interest curve by adjusting $$r_{90\%}$$ over time based on the current utilization rate $$u$$:

* When $$u > 90\%$$: Increase $$r_{90\%}$$ and shift the curve upward to encourage repayments.
* When $$u < 90\%$$: Decrease $$r_{90\%}$$ and shift the curve downward to incentivize borrowing.

The speed at which $$r_{90\%}$$ changes, $$e(u)$$ , scales linearly with the difference between the current utilization rate $$u$$ and 90%:

$$
e(u) = \begin{Bmatrix}v\times\frac{u-u_{target}}{1-u_{target}}, when\ u>u_{target}\\v\times\frac{u-u_{target}}{u_{target}}, when\ u<u_{target}\end{Bmatrix}
$$

where $$v$$ is an arbitrary number defined in Lista's smart contracts. Currently, $$u_{target} = 90\%$$:

The maximum speed $$r_{90\%}$$ increases occurs at 100% utilization, which will double $$r_{90\%}$$ in 5 days. The maximum speed $$r_{90\%}$$ decreases occurs at 0% utilization, which will halve $$r_{90\%}$$ in 5 days.

When the utilization rate $$u=90\%$$, $$r_{90\%}$$ will remain the same until $$u$$ changes.

When a market's $$u$$ sits at 45% for sufficiently long, its $$r_{90\%}$$ will decrease at half of $$e(0\%)$$, which halves itself after 10 days.

When a market's $$u$$ sits at 95% for sufficiently long, its $$r_{90\%}$$ will increase at half of $$e(100\%)$$, which doubles itself after 10 days.

#### Borrow and Supply APY

The Annualized Percentage Yield (APY) standardizes interest rates over a year, accounting for compounding, and is a critical metric for Lista Lending. Two key APYs include:

* Borrow APY: The annualized cost borrowers pay, derived from our IRM’s instantaneous rate. It reflects the yearly expense of borrowing from a vault’s market.
* Supply APY: The annualized return lenders earn, computed as a weighted average across all markets a vault allocates to, adjusted for utilization and fees.

**Borrow APY Calculation**\
The Borrow APY compounds the per-second borrow rate over a year:

$$borrow APY= e^{borrowRate \times sedondsPerYear} - 1$$

Where:

* borrowRate: The rate set by the IRM for a specific market.
* secondsPerYear: 31,536,000 (seconds in a year).

**Supply APY Calculation**\
The Supply APY is a vault-level weighted average, combining each market’s APY with its allocation proportion:

1. Weights: Retrieve the vault’s liquidity distribution from its Withdrawal Queue (e.g., 50% slisBNB/BNB, 30% USD1/BNB).
2. Calculate each market’s supply APY:\
   $$supplyAPY = borrowAPY \times utilizationRate \times (1 - fee)$$
3. Weighted Average:\
   $$vaultsupplyAPY= \sum supplyAPY \times\ market Weight$$

Where:

* $$utilizationRate = \frac{Total Borrowed Asset}{Total Supplied Asset} \times\ 100\%$$
* Fee Includes protocol fees (0-25%, set by Lista DAO) and vault fees (up to 50%, set by curators); currently defaults to 0% unless specified.

**Integration with Vaults**

Unlike standalone market applications, the IRM operates within Lista Lending’s vaults, where liquidity is allocated across multiple markets (e.g., pt-clisBNB/lisUSD, BNB, BTCB). Curators can adjust allocations or upgrade vault parameters, enhancing the IRM’s adaptability while retaining its core logic.
