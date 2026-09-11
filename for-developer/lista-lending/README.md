# Lista Lending

## Overview

Moolah is Lista DAO's decentralized lending protocol, branded as Lista Lending. It is deployed on BNB Smart Chain and on Ethereum — see [Ethereum](smart-contract-ethereum.md) for that address set, and note the [SDK](../sdk.md)'s Ethereum coverage lags the protocol. It is powered by Morpho and built on Morpho Blue smart contracts.

Moolah extends standard Morpho market architecture with Lista-specific controls and integrations, including minimum loan floor, resilient oracle routing, protocol-level reentrancy protection, upgradeability, and role-based access control.

In addition, it supports two integration patterns for external systems:

* Provider contracts for collateral handling and asset transformation
* Broker contracts for curated market access and fixed-term/fixed-rate lending flows

## Contents

* [Protocol Extensions](protocol-extensions.md)
* [Integration Patterns](integration-patterns.md)
* [Liquidator Integration](liquidator-integration.md)
* [Vault Reference](vault-reference.md)
* [Providers](providers.md)
* [Broker Reference](broker-reference.md)
* [Position Conversion](position-conversion.md)
* [Contract & Interface Reference](contract-reference.md)
* [Events & Callbacks](events-and-callbacks.md)
* [Interest Rate Model (IRM)](irm.md)
* [Smart Lending & StableSwap](stableswap-integration.md)
* [Smart Contract](smart-contract.md)
  * [BSC Core](smart-contract-bsc-core.md)
  * [BSC Lending Brokers](smart-contract-bsc-brokers.md)
  * [BSC Smart Lending](smart-contract-bsc-smart-lending.md)
  * [BSC Oracles](smart-contract-bsc-oracles.md)
  * [BSC Credit](smart-contract-bsc-credit.md)
  * [Ethereum](smart-contract-ethereum.md)
