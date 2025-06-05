# Interest Rate Model (IRM)

### Interest Rate Model

Lista Lending employs the AdaptiveCurveIRM, a robust interest rate model designed to optimize capital efficiency within its vault-based lending system on BNB Chain. Adapted from Morpho’s proven design, this IRM dynamically adjusts borrowing rates to maintain market utilization—defined as the ratio of borrowed to supplied assets—near a target of 90%. Integrated into Lista Lending’s upgradeable vaults, the AdaptiveCurveIRM supports looped lending strategies (e.g., with pt-clisBNB), aligning with Lista DAO’s modular ecosystem.

Unlike traditional lending protocols with static rates or single-pool designs, Lista Lending applies the IRM across multiple markets within each vault, offering curators flexibility to refine strategies while ensuring competitive rates for borrowers and lenders.

#### Understanding Borrow and Supply APY

The Annualized Percentage Yield (APY) standardizes interest rates over a year, accounting for compounding, and is a critical metric for Lista Lending users. Two key APYs are calculated:

* Borrow APY: The annualized cost borrowers pay, derived from the AdaptiveCurveIRM’s instantaneous rate. It reflects the yearly expense of borrowing from a vault’s market.
* Supply APY: The annualized return lenders earn, computed as a weighted average across all markets a vault allocates to, adjusted for utilization and fees.

**APY Calculation**

* Borrow APY Calculation\
  The Borrow APY compounds the per-second borrow rate over a year:\
  Borrow APY = (e^(borrowRate × 31,536,000) - 1)

Where:

* borrowRate: The rate set by the AdaptiveCurveIRM for a specific market.
* secondsPerYear: 31,536,000 (seconds in a year).

Supply APY Calculation\
The Supply APY is a vault-level weighted average, combining each market’s APY with its allocation proportion:

1. Extract Allocation: Retrieve the vault’s liquidity distribution from its Withdrawal Queue (e.g., 50% pt-clisBNB/lisUSD, 30% Venus).
2. Query Market APY: Calculate each market’s Borrow APY and adjust:\
   Market Supply APY = Market Borrow APY × Utilization × (1 - Fee)
3. Weighted Average:\
   Vault Supply APY = Σ (Market Supply APY × Allocation Proportion)

Where:

* Utilization: Total borrowed ÷ total supplied assets per market.
* Fee: Includes protocol fees (0-25%, set by Lista DAO) and vault fees (up to 50%, set by curators); currently defaults to 0% unless specified.

#### The AdaptiveCurveIRM

The AdaptiveCurveIRM drives Lista Lending’s markets, targeting a 90% utilization rate to balance efficiency and liquidity. By avoiding collateral rehypothecation, it minimizes systemic risk, enabling higher capital utilization with reduced penalties for illiquidity—ideal for looped lending with assets like pt-clisBNB. Deployed within Lista Lending’s upgradeable vaults, the IRM adapts autonomously to market conditions on BNB Chain, including supply/demand shifts and Venus borrowing dynamics.

**How It Works**

The AdaptiveCurveIRM operates through two complementary mechanisms:

1. Curve Mechanism\
   This adjusts rates instantly based on utilization:

* Key Parameter: r90%—the target rate at 90% utilization (e.g., 4%).
* Behavior:
  * Above 90%: Rates rise sharply (e.g., 16% at 100%, 4x the target).
  * Below 90%: Rates drop (e.g., 1% at 0%, target ÷ 4).
* Ensures rapid response to market events, maintaining liquidity.

1. Adaptive Mechanism\
   This shifts r90% over time to align with market equilibrium:
   * Above 90%: Curve shifts upward (e.g., doubles in 5-10 days at 100%), encouraging repayments.
   * Below 90%: Curve shifts downward (e.g., halves in 10 days at 45%), incentivizing borrowing.
   * Adjustment Speed: Scales with deviation from 90%; maximum speed doubles r90% in 5 days at 100% utilization.

**Examples**

* 45% Utilization: r90% halves after 10 days, reducing rates.
* 95% Utilization: r90% doubles after 10 days, raising rates.
* 100% Utilization: r90% doubles in 5 days, fastest adjustment.

For detailed visualizations, see  (TBD).

**Integration with Vaults**

Unlike standalone market applications, the IRM operates within Lista Lending’s vaults, where liquidity is allocated across multiple markets (e.g., pt-clisBNB/lisUSD, BNB, BTCB). Curators can adjust allocations or upgrade vault parameters, enhancing the IRM’s adaptability while retaining its core logic.
