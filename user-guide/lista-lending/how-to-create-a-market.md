# How to create a Market on Lista Lending

1\. Confirm Market Parameters

* loanToken
* collateralToken
* Oracle
* Irm
* lltv

| Parameter       | Type    | Description                              |
| --------------- | ------- | ---------------------------------------- |
| loanToken       | address | Contract address of the borrowing token  |
| collateralToken | address | Contract address of the collateral token |
| oracle          | address | Address of the oracle                    |
| irm             | address | Address of the interest model            |
| lltv            | uint256 | Loan-To-Value rate                       |

Note：

* Oracle: The oracle must implement the following method, where asset is the token address. The function should return the asset price with 8 decimals of precision:

function peek(address asset) external view returns (uint256);

* &#x20;IRM (Interest Rate Model): This must be enabled by Lista Lending’s manager using enableIrm. By default, the protocol uses the IRM deployed by Lista Lending at the following address: \[TBD]&#x20;
* LLTV (Loan-to-Value for Liquidation): This must also be set by Lista Lending’s manager using enableLltv. Users may choose from the enabled LLTV options to create a vault.<br>

## 2. Create Markets

1. Jump to the contract address: [https://bscscan.com/address/0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C](https://bscscan.com/address/0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C)<br>
2. Fill in attributes\
   ![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXcMq245iohsignlpyM7nwuKu_qD1cEOqLodL8U7NkVi0BnVBr9F8r4uHkQG1s-waQIXMu1bHmfnhFUVjFn6mb1Nip5_w1SST32f5HIjBc1DxP0wSX7jZtG3XxXaf-3F6OHREdeReQ?key=wfz3O-Nby90_rWV7ZzqEXcEA)
3. Approve and done!

## 3. Set up fees \[Optional]

Only the Manager address has the authority to set up market fees. Market fees will be default 0 if not set up.

1）Jump to the main contract address: [https://bscscan.com/address/0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C](https://bscscan.com/address/0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C)

2\) Fill in the attributes, where newFee is the parameter for setting the fee rate, with 1e18 decimal places. For example, fill 100000000000000000 for 10% rates.

![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXdcBaYVU5LBqgZNIPcnesIWSagugP5HU0IveB68oe0S7YCEr4JCsyyfSpT_Ihn2VTVvku8TNrhb6ResvemvrIfiySlrftyBoA1Tn6YzApwcz--lpgXO5pAW_14z6iblA7ovqpDNpQ?key=wfz3O-Nby90_rWV7ZzqEXcEA)

## 4. Verify results

![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXep-PuU2c22WHnpMt_cGfvYO1AMWS9QLu4gVqQlo5ONW1P9LyJwInmzrBzK7LdsPY0oKmrLBJKn68T-_wkfJ7jcMJerjOGZ-Qi4Zqb3KUU9LnhchzgpZoXf9c89_9uCs5Wa9Tmq?key=wfz3O-Nby90_rWV7ZzqEXcEA)

marketId can be obtained from the transaction creating the market, where id refers to the marketId

![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXcloxfriNnhSkciVemSDkTz5z7UU1sU3B51N9RLrXOWkJfD6uArwR7CvMmEVyMMLwNHnx2Y_6xlCnvyTa92arwAgxM8wis4quEM141xAl8z2098iC0hFqy-ESVKd_gKddsVxUTZYg?key=wfz3O-Nby90_rWV7ZzqEXcEA)

Fee rate can be obtained via the market function in the contract by passing in the marketId as a parameter.&#x20;

* Check the transaction that successfully creates market&#x20;
* Check marketId&#x20;
* Check fee rate
