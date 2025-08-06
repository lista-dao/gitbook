# How to create a vault

Lista Lending enables permissionless creation of lending vaults on BNB Chain, allowing curators to deploy custom liquidity pools that optimize yield and manage risk. A Lista Vault accepts a single loan asset (e.g., lisUSD) and allocates deposits across multiple Lista markets. This guide walks you through the process of deploying and configuring a vault, empowering you to curate lending opportunities within Lista DAO’s ecosystem.

Vaults are upgradeable smart contracts, offering flexibility to adapt to market needs while maintaining noncustodial security. Curators can set allocation strategies, fees, and risk parameters, making Lista Lending a powerful tool for tailored DeFi solutions.

#### Prerequisites

Before creating a Lista Vault, ensure you have the following:

* BNB Chain Wallet: A wallet (e.g., MetaMask) configured for BNB Chain with sufficient BNB for gas fees.
* Development Environment: A Solidity development setup (e.g., Hardhat, Foundry) with Node.js installed.
* Loan Asset: The ERC-20 token to be used as the vault’s loan asset (e.g., lisUSD, BNB).
* Market Knowledge: Familiarity with Lista Lending markets (loan/collateral pairs) to allocate liquidity effectively.
* Oracle Selection: Chainlink (Main), Binance Oracle(comparative), Redstone(Backup) for price feeds.

## Creating a vault - Guide

### Step 1: Define Vault Parameters

To deploy a vault, specify the following parameters:

1. Loan Asset: The single asset users will deposit and borrow (e.g., lisUSD).
2. Initial Markets: List of Lista markets (e.g., pt-clisBNB/lisUSD) to allocate liquidity to initially.
3. LLTV Options: fixed Liquidation Loan-To-Value ratio at 80%
4. Oracle: Chainlink (main), Binance Oracle (comparative), Redstone (Backup) for price data across markets.
5. Fee Structure:
   * Protocol Fee: Set by Lista DAO (0-25% of borrow interest).
   * Vault Fee: Optional curator fee, up to 50% of vault profits.
6. Timelock: Optional delay (e.g., 24 hours) for parameter changes
7. Roles:
   * Owner: You, the deployer, overseeing vault strategy.
   * Curator: Optional role for for setting caps and other important parameters (can be the Owner initially).
   * Guardian: Optional role for risk oversight (e.g., to pause actions).
   * Allocator: The role to allocate vault markets

***

### Step 2: Deploy the vault

#### Step 2.1: Prepare the Parameters

#### Before deployment, you need to prepare the following parameters:

* #### manager: Manager address (must be a timelock contract), this will be the same as the owner role
* #### asset: Asset address
* #### name: Name of the vault, used primarily for display and identification purposes
* #### symbol: The abbreviation or ticker symbol of the vault.
* #### This symbol is a shorter way to represent the vault, typically used in interfaces and listings.
* #### curator: Curator address (must be a timelock contract)
* #### allocator: Allocator address (does not need to be a timelock contract)

#### All these parameters need values (marked as "TODO" in your reference image).

#### Step 2.2: Clone the Repository

#### Navigate to the specific branch of the Moolah repository:

#### `git clone https://github.com/lista-dao/moolah.git`

`cd moolah`

`git checkout feature/deployScripts`

#### Step 2.3 Fill in the params

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXeGvAXo0gAEzsaOkYxIK1Dm0adyqL92MlzaInn7f_XazsyW77r5QT_wQ8-GtQveOJTqVSYH-KlSPAYdi4fZhWk-VnzBb-xITBSokRxl-WtoMxzaUG-kI7HXHMSrmNUu9BO32ITa?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>

#### Step 2.4: Execute the Deployment Script

Run the following command to deploy the vault contract to BSC network:

`forge script script/deploy_moolahVault.sol --rpc-url bsc --broadcast --verify -vvv`

This command will:

* #### Execute the deployment script
* #### Connect to the BSC network
* #### Broadcast the transaction to deploy the contract
* #### Verify the contract on the blockchain explorer
* #### Provide verbose output (-vvv) for detailed logs

#### Make sure you have sufficient funds in your wallet to cover gas fees and that your environment is properly configured for Foundry.

***

### Step 3: Configure the Vault

Here are methods you can use to configure your vault.

#### 3.1 Set Fee

Role: `MANAGER`\
Method: `setFee`\
Parameter:

* `newFee (uint256)`: The new fee value, with a precision of 1e18.

#### 3.2 Set Fee Recipient

Role: `MANAGER`\
Method: `setFeeRecipient`\
Parameter:

* `newFeeRecipient (address)`: The address that will receive collected fees.

#### 3.3 Set Skim Recipient

Role: `MANAGER`\
Method: `setSkimRecipient`\
Parameter:

* `newSkimRecipient (address)`: The address that will receive mistakenly transferred tokens.

#### 3.4 Set Market Supply Cap

Role: `CURATOR`\
Method: `setCap`\
Parameters:

* `loanToken (address)`: Loan token of the market.
* `collateralToken (address)`: Collateral token of the market.
* `oracle (address)`: Price oracle for the market.
* `irm (address)`: Interest rate model.
* `lltv (uint256)`: Loan-to-value threshold.
* `newSupplyCap (uint256)`: Maximum deposit cap for the specified market.\


Note: These parameters should match the configuration used when the market was created.

#### 3.5 Set Deposit Queue

Role: `ALLOCATOR`\
Method: `setSupplyQueue`\
Parameter:

* `newSupplyQueue (bytes32[])`: An array of marketIds defining the deposit order. Deposits will be routed to markets in the specified sequence.

#### 3.6 Update Withdraw Queue

Role: `ALLOCATOR`\
Method: `updateWithdrawQueue`\
Parameter:

* `indexes (uint256[])`: Array of indexes that reorders the existing withdraw queue.\


Note: The indexes refer to positions in the current withdraw queue.

#### 3.7 Set Market Removal

Role: `CURATOR`\
Method: `setMarketRemoval`\
Parameters:

* `loanToken (address)`
* `collateralToken (address)`
* `oracle (address)`
* `irm (address)`
* `lltv (uint256)`&#x20;

Note: This marks a market for removal. The market will only be removed after the Vault's position in it is zero, and the updateWithdrawQueue function has been called.

#### 3.8 Role Management

#### 3.8.1 Grant Role

Role: `ADMIN` or `MANAGER`\
Method: `grantRole`\
Parameters:

* `role (bytes32)`: Role identifier.
* `account (address)`: Address to assign the role to.

#### 3.8.2 Revoke Role

Role: `ADMIN` or `MANAGER`\
Method: `revokeRole`\
Parameters:

* `role (bytes32)`: Role identifier.
* `account (address)`: Address to remove the role from.

***

### Step 4: Deploy the TimeLock

#### 4.1: Prepare Parameters

First, you need to prepare three key address parameters:

* proposer address: The address that will create transactions
* executor address: The address that will execute transactions
* canceller address: The address that will cancel transactions

Before beginning deployment, make sure you've decided on these three addresses. You should fill in the actual addresses you want to use in the table.

#### 4.2: Deploy the Timelock Contract

Navigate to the repository at[ https://github.com/lista-dao/moolah](https://github.com/lista-dao/moolah) and switch to the `feature/deployScripts` branch.

#### 4.3: Fill in the params

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXcWIqKdLYE030gQ7c8ycJepyI9iJaILG5K-CrdqY-_84AUR40c4GD66fl63cfvc53-b8d4K1FgjUGqAM_oGfq1U2xRzuCCpO2zHisDLaxhp_Www77LcdH86uKidjyysTdsSc3JI?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>

Run the following command to deploy the Timelock contract:

`forge script script/deploy_timeLock.sol --rpc-url bsc -vvv --broadcast --verify`

This command will:

* Execute the deployment script for the Timelock contract
* Connect to the BSC network
* Provide verbose output (-vvv)
* Broadcast the transaction to the network
* Verify the contract on BSC Scan

Make sure you have sufficient funds in your deployment wallet to cover gas fees and that you have properly configured your environment variables for authentication with the network and verification service.

### Step 5: Verify and Activate

1. Verify on BscScan
   * Submit your vault’s contract code to BscScan for transparency (use the deployed address).
2. Test Deposits
   * Deposit a small amount of the loan asset (e.g., 10 lisUSD) to ensure the vault functions as expected.
   * Check allocation and APY via the Lista Lending interface.
3. Go Live
   * Announce your vault to the community (e.g., Lista DAO Discord) to attract depositors.

#### Post-Deployment Management

* Monitor Performance: Track APY and market conditions via the Lista Lending dashboard.
* Rebalance Liquidity: Adjust allocations as needed using the Allocator role.
* Upgrade if Necessary: Leverage the upgradeable design to modify parameters or add features (requires Owner permissions).
* Handle Bad Debt: Manually settle or distribute unrealized bad debt per vault settings.
