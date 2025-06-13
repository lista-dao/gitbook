# Create Markets on Lista Lending

## 1. Confirm Market Parameters

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

* IRM (Interest Rate Model): This must be enabled by Lista Lending’s manager using enableIrm. By default, the protocol uses the IRM deployed by Lista Lending at the following address: \[TBD]&#x20;
* LLTV (Loan-to-Value for Liquidation): This must also be set by Lista Lending’s manager using enableLltv. Users may choose from the enabled LLTV options to create a vault.

## 2. Create Markets

1. Jump to the contract address: [https://bscscan.com/address/0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C](https://bscscan.com/address/0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C)\

2. Fill in attributes\
   ![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXfkDjojSP-LsnNkY0e9sX58VJTAKE8mw0_PdNpEbRJC1euwPfXJNYChcn7PeDAcrmPGym1XHWMA_ATb9ziRexuJKxNgPS1UydQuDvFIA-QI9XcQqEBaoU1rEOWFVN6j-z9taw5KwQ?key=wfz3O-Nby90_rWV7ZzqEXcEA)
3. Approve and done!\

4. ### Set up fees \[Optional]

Only the Manager address has the authority to set up market fees. Market fees will be default 0 if not set up.

4.1Jump to the main contract address: [https://bscscan.com/address/0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C](https://bscscan.com/address/0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C)

4.2) Fill in the attributes, where newFee is the parameter for setting the fee rate, with 1e18 decimal places. For example, fill 100000000000000000 for 10% rates.

![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXcMeYRfH2I1ap4zMG_zNOSrah5DqiRN_egjCJ_sffqRBcz2Tqe8ifE-8rUzdRgEd8I4aaSO3pdw7soVMVqcVQ15iBrkINX1QJa5gtEnaiIGMwgJ3kkMu5IlM6QqI8zwDP_poSKjEw?key=wfz3O-Nby90_rWV7ZzqEXcEA)

4.3) Verify results

![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXf6nLcedj7iDUSBusMfkw94a0BGfc8X6d1mZ04vyZXgJTeDJjJFwjHBzCWrGG8YOARBXNFjmv5Tt5FgWrex1cQtYenabgrVPmr5E7Sq5SUT06Hje-ZvXUtOge7AR3fPj1H_L2LE?key=wfz3O-Nby90_rWV7ZzqEXcEA)

4.4) marketId can be obtained from the transaction creating the market, where id refers to the marketId

![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXed_WcB5snoHad4ZTZTTDGXe6mThT3ag5U5QQ00f88wpDrn1lehYyY-5RZbcjcmQW3PZ4ueb0Z72vpxuVKrCaN7Jo3EhwwSMH5LHvJwDgQmwOeVypKcmvbbzYUDhpuwJVudFSIWLQ?key=wfz3O-Nby90_rWV7ZzqEXcEA)

4.5 Fee rate can be obtained via the market function in the contract by passing in the marketId as a parameter.&#x20;

* Check the transaction that successfully creates market&#x20;
* Check marketId&#x20;
* Check fee rate
