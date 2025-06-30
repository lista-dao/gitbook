# Liquidation Zone

The **Liquidation Zone** is a mechanism within Lista DAO’s Lending protocol designed to enhance the efficiency and resilience of asset liquidation processes. It addresses limitations in the existing system by enabling community-driven liquidations for large-scale or complex collateral positions, particularly those involving non-standard assets (e.g., pt-tokens) or low-liquidity assets.&#x20;

This feature ensures system stability during high-value liquidations, market volatility, or network congestion while incentivizing community participation.

### Purpose

The Liquidation Zone supplements the protocol’s automated liquidation system, which relies on Dutch auctions and whitelisted bots operated by Lista DAO. It activates when official bots cannot efficiently process liquidations due to:

* **Large liquidation amounts** (e.g., single positions exceeding $1M).
* **Non-standard assets** with complex structures (e.g., pt-susde, pt-clisBNB), which may face rapid collateralization rate spikes post-maturity.
* **Failed liquidation attempts** after multiple rounds.
* **Network constraints**, such as congestion or high gas fees, disrupting bot operations.

By opening liquidations to the community, the Liquidation Zone reduces bad debt risks, improves transparency, and rewards participants with arbitrage opportunities.

### Mechanism

#### Core Functionality

When a collateral position meets predefined criteria, it is transferred to the **Liquidation Zone**, allowing community members to participate in the liquidation process. Community liquidators can acquire assets at discounted prices via on-chain transactions, retaining profits after Lista DAO collects a fixed penalty fee. The process is as follows:

1. **Trigger Detection**: Bots identify positions eligible for the Liquidation Zone based on predefined conditions.
2. **Team Notification**: Bots alert the Lista DAO team with details of the position, including:
   * Liquidation ID
   * Platform (CDP or Lending)
   * Market and assets (e.g., BTCB/USD1 for collateral/debt)
   * Collateral and debt amounts (in assets and USD equivalent)
3. **Manual Activation**: The Lista DAO team manually enables community liquidation for the position.
4. **Community Liquidation**: Eligible community members execute liquidations, leveraging arbitrage opportunities.
5. **Permission Revocation**: After liquidation, the team revokes community access to maintain protocol control.

#### Example Bot Notification

```
Public Liquidation Alert
- Liquidation ID: xxx
- Platform: CDP/Lending
- Market/Assets: BTCB/USD1 (Collateral/Debt)
- Collateral Amount: xxx BTCB (~xxx USD)
- Debt Amount: xxx USD1 (~xxx USD)
```

### Conditions for Entering the Liquidation Zone

A collateral position becomes eligible for the Liquidation Zone when one of the following conditions is met:

1. **Liquidation Value Threshold**:
   * The position’s liquidation value exceeds $1M.
2. **Repeated Failed Liquidations**:
   * Official bots fail to liquidate the position after multiple attempts (e.g., over 1 hour), triggering a bot alert.
3. **Manual Designation**:
   * Protocol operators manually flag a position for the Liquidation Zone, typically in response to special circumstances (e.g., security vulnerabilities or emergency scenarios).

### Key Features

* **Community Participation**: Enables community members with arbitrage capabilities to liquidate assets, enhancing efficiency.
* **Profit Incentives**: Liquidators acquire assets at discounted prices, retaining profits after a fixed penalty fee.
* **System Resilience**: Mitigates risks from large-scale liquidations, non-standard assets, or network disruptions.
* **Transparency**: Public alerts and open processes ensure visibility and trust.

### Integration with Existing Systems

The Liquidation Zone operates alongside Lista DAO’s existing liquidation framework, which includes:

* **CDP Liquidations**:
  * Whitelisted bots (Lista DAO-operated).
  * Dutch auctions starting at 110% of collateral valuation (10% penalty).
  * Price reductions per block, up to a maximum number of reductions.
* **Lending Liquidations**:
  * Whitelisted bots.
  * Dutch auctions starting at 106% of debt (6% penalty, adjustable).
  * Flash liquidation for main positions and tail liquidation for residual amounts.

The Liquidation Zone activates only when these mechanisms are insufficient, ensuring a seamless transition to community-driven processes.

### Security Considerations

* **Controlled Access**: Community liquidation is enabled only for specific positions and revoked post-liquidation to prevent unauthorized access.
* **Bot Monitoring**: Continuous bot alerts ensure timely detection of eligible positions.
* **Manual Safeguards**: Team oversight mitigates risks during activation and ensures protocol integrity.

### Future Enhancements

* **Automated Triggers**: Explore gas price-based or asset-specific automation to reduce manual intervention.
* **Expanded Asset Support**: Enhance compatibility with additional non-standard or low-liquidity assets.
* **Community Tools**: Develop interfaces or guides to simplify community participation in the Liquidation Zone.
