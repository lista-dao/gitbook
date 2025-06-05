# Liquidation

Liquidation in Lista Lending is a vital risk management tool that safeguards lenders’ capital by ensuring borrowers maintain sufficient collateralization. Mirroring Morpho’s design, Lista Lending implements two liquidation approaches on BNB Chain:

* Standard Liquidation: A core protocol feature enabling full or partial liquidation of a borrower’s position when their Loan-To-Value (LTV) exceeds the market’s Liquidation Loan-To-Value (LLTV) threshold.
* Pre-Liquidation: An optional, opt-in mechanism via an external contract, allowing smaller, incremental liquidations before reaching the standard threshold, providing borrowers with a safety buffer.

Integrated into Lista Lending’s upgradeable vault system, these mechanisms ensure market stability while supporting its vault-centric, permissionless lending model.

#### Understanding Loan-To-Value (LTV)

The Loan-To-Value (LTV) ratio is a critical metric assessing a position’s risk by comparing debt to collateral value.

**How to Calculate LTV**

The LTV is calculated as:\
LTV = (Borrowed Amount × Oracle Price) / (Collateral Amount × Oracle Price Scale)

Where:

* Borrowed Amount: The total borrowed assets (e.g., lisUSD).
* Oracle Price: The price from the market’s oracle (e.g., Chainlink).
* Collateral Amount: The supplied collateral (e.g., pt-clisBNB).
* Oracle Price Scale: 1e36 (standard scaling factor).

#### Standard Liquidation

Standard liquidation is Lista Lending’s primary defense against borrower defaults, embedded in the protocol’s core contracts.

**When Is a Position Liquidatable?**

A position becomes liquidatable when LTV > LLTV

This occurs due to:

* A drop in collateral value (e.g., pt-clisBNB price falls).
* An increase in debt from accrued interest.
* A combination of both.

Example:

* Collateral: $100 (pt-clisBNB).
* LLTV: 80%.
* Safe: Borrowed value ≤ $80 (LTV ≤ 80%).
* Liquidatable: Borrowed value > $80 (LTV > 80%).

**How Standard Liquidation Works**

When triggered, any external party (liquidator) can repay part or all of the borrower’s debt, receiving collateral plus a bonus determined by the Liquidation Incentive Factor (LIF).

**Liquidation Incentive Factor (LIF)**

The LIF sets the bonus:\
LIF = min(M, (1/β × LLTV + (1 - β)))

Where:

* β: 0.3 (constant).
* M: 1.15 (cap).
* For LLTV = 80%, LIF ≈ 1.06 (6% bonus); initial default set at 1.048 (4.8%) per Lista DAO.

All LIF value goes to the liquidator; Lista Lending takes no fee.

**Standard Liquidation Step-by-Step**

Initial Position:

* Borrower deposits $100 pt-clisBNB, borrows $70 lisUSD (LLTV = 80%).
* Interest accrues, raising debt to $80.0001.
* LTV = 80.0001% > 80% → Liquidatable.

Liquidation Process:

* Liquidator repays $80.0001 lisUSD.
* LIF = 1.048 (4.8% bonus, per section 2.6.3).
* Seized collateral: $80.0001 × 1.048 = $83.84 pt-clisBNB.

After Liquidation:

* Borrower: Debt cleared, retains $16.16 pt-clisBNB.
* Liquidator: Spent $80.0001, received $83.84; profit = $3.84 minus gas fees.

**Key Features**

* Liquidation Amount: Up to 100% of debt in one transaction.
* Trigger: LTV > LLTV.
* Incentive: Fixed LIF based on LLTV (e.g., 4.8%).
* Borrower Impact: Potential full liquidation.
* Implementation: Core contract feature.

​​Pre-Liquidation

Pre-liquidation is an optional, opt-in mechanism offering a buffer before standard liquidation.

**What Is Pre-Liquidation?**

Pre-liquidation enables partial position closure when LTV exceeds a predefined Pre-Liquidation Loan-To-Value (preLLTV) but remains below LLTV, reducing risk incrementally.

Example:

* Collateral: $100 pt-clisBNB.
* LLTV: 80%, preLLTV: 75%.
* Safe: LTV ≤ 75%.
* Pre-Liquidatable: 75% < LTV < 80%.
* Fully Liquidatable: LTV > 80%.

**Pre-Liquidation Parameters**

* preLLTV: Threshold for pre-liquidation (e.g., 75%).
* Pre-Liquidation Close Factors (preLCF₁ & preLCF₂): Max debt repayable, scaling linearly:\
  preLCF = \[(LLTV - LTV)/(LLTV - preLLTV)] × preLCF₁ + \[(LTV - preLLTV)/(LLTV - preLLTV)] × preLCF₂
* Pre-Liquidation Incentive Factors (preLIF₁ & preLIF₂): Bonus scaling between preLIF₁ and preLIF₂ based on LTV.
* Pre-Liquidation Oracle: Assesses pre-liquidation eligibility (may match market oracle).

**Pre-Liquidation Step-by-Step**

Initial Position:

* Borrower deposits $100 pt-clisBNB, borrows $75 lisUSD (LLTV = 85%, preLLTV = 79%).
* Collateral drops, LTV rises to 80%.
* 79% < LTV (80%) < 85% → Pre-Liquidatable.

Pre-Liquidation Process:

* Pre-liquidator repays 50% of $80 debt ($40), assuming preLCF = 50%.
* preLIF = 1.03 (e.g., lower than standard 1.05 for 85% LLTV).
* Seized collateral: $40 × 1.03 = $41.2.

After Pre-Liquidation:

* Borrower: $40 debt remains, $58.8 pt-clisBNB left; new LTV = 68%.
* Pre-liquidator: Profit = $1.2 minus fees.

**Key Features**

* Trigger Zone: preLLTV ≤ LTV < LLTV.
* Closure: Limited by preLCF (e.g., <50%).
* Incentive: Dynamic preLIF, typically lower than LIF.
* Borrower Impact: Incremental deleveraging.
* Implementation: Opt-in via external PreLiquidation contract.

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXfw7LhV7AYhZG2s24VFx3fd3tp8iHXGYudKOGLFgk1kXU-9M-jfEn9sfp14FdNt6p40Zp_zNmZyw5fiIOEL7jVHhxqytOaIgGpNUxS6sJOXemm2Sixx8H_zaEDc6x2q9A2bvzs?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>

\
