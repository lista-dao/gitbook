# Third-Party Vault Risk Management

Third-Party Vault Risk Management Third-party vaults are a core component of Lista Lending, enabling independent Curators (also referred to as vault managers or operators) to create and manage permissionless lending markets built on top of Lista DAO’s open-source smart contract infrastructure.

Lista DAO is a decentralized protocol that provides permissionless, open-source infrastructure and operates solely via on-chain smart contracts. While these vaults broaden the range of lending opportunities, Lista DAO provides permissionless infrastructure (smart contracts) only. Crucially, Lista DAO does not participate in the design, configuration, management, or ongoing operations of any third-party vault, nor does it assume any responsibility or liability for their performance, security, or chosen parameters.

The appearance or display of any vault on [lista.org](http://lista.org) within the UI is for informational purposes only and does not constitute a recommendation, review, or endorsement by Lista DAO.

#### **Vault Deployment and Independence**

Any entity may deploy a third-party vault permissionlessly and become a Curator on Lista. Each Curator is exclusively responsible for:

1. Selecting collateral assets and loan assets (including ensuring adequate oracle coverage)
2. Setting all risk parameters (including Liquidation Loan-to-Value Ratio, LLTV)
3. Configuring interest rate models and other market parameters
4. Continuously monitoring, maintaining, and updating vault parameters as market conditions evolve Curators hold full responsibility for their vault’s strategy design and risk profile.

Lista DAO does not review, audit, certify, or endorse third-party vaults or their respective Curators.

#### **Risk Parameter Management**

Curators have full authority over all critical risk parameters, including:

1. Liquidation LLTV: the threshold at which liquidation is triggered
2. Market-specific debt ceilings
3. Interest rate and target utilization levels
4. Any other settings that directly affect the vault’s risk exposure and solvency Curators may adjust parameters at any time, and such changes may impact all lenders and borrowers within the vault. Improper or overly aggressive parameter settings may lead to rapid liquidations, accumulating bad debt, or complete loss of supplied liquidity.

Lista DAO bears no responsibility for any outcomes arising from Curator decisions or parameter adjustments.

#### **Oracle and Pricing Mechanisms**

Oracle and Pricing Mechanisms Third-party vaults rely on Lista’s shared multi-oracle system (Chainlink, Pyth, and fallback mechanisms). While Curators cannot unilaterally modify the oracle sources provided by Lista DAO, they are responsible for selecting assets that have adequate and reliable oracle coverage.

However, assets selected by the Curators may encounter various risks, including oracle limitations, thin liquidity, delayed updates, or extreme volatility.

Any losses resulting from oracle delays, errors, deviations, or outages are solely borne by users and Curators.

#### **Supply and Borrow Caps**

Supply and Borrow Caps Curators may set supply caps and borrow caps as additional risk controls. These limits apply only at the vault level and are fully managed by the Curator.

Lista DAO does not supervise, enforce, or endorse these limits and bears no responsibility for their effectiveness or impact.

#### **Advanced Risk Control**

Advanced Risk Control Protocol-level emergency measures (e.g., system-wide pause) can only be executed following a Lista DAO governance multisig and are generally reserved for systemic risks rather than vault-specific issues.

These measures are at the sole discretion of Lista DAO governance. In the event of insolvency, exploits, or other extreme risks, Lista DAO reserves the right (but not the obligation) to suspend or close any at-risk vault at any time.

Users should not rely on this as a guarantee of loss prevention, as such measures are discretionary and may not prevent all forms of loss.

#### **Important Safety Notice**

Although Curators have substantial authority over the economic configuration and adjustable parameters of their vaults, they have no ability to withdraw, seize, or redirect user funds. All vaults remain fully non-custodial; Curator permissions are strictly limited to parameter and market logic adjustments.

Nevertheless, the safety, sustainability, and operational soundness of each vault depend entirely on the capability, diligence, and integrity of the respective Curator. Lista DAO makes no representations or warranties, express or implied, regarding any third-party vault, its security, or its financial performance. Users must conduct their own due diligence (DYOR) and seek independent professional advice before supplying liquidity to any vault. B

By participating, you acknowledge that Lista DAO acts solely as an infrastructure provider and assumes no liability whatsoever for vault operations, Curator decisions, or potential losses, and you irrevocably waive any claim of recourse against Lista DAO to the maximum extent permitted by applicable law.
