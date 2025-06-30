# 如何创建市场

1\. 确认市场参数

* loanToken
* collateralToken
* Oracle
* Irm
* lltv

| 参数            | 类型    | 描述                                      |
| --------------- | ------- | ---------------------------------------- |
| loanToken       | address | 借款代币的合约地址                        |
| collateralToken | address | 抵押代币的合约地址                        |
| oracle          | address | Oracle的地址                             |
| irm             | address | 利率模型的地址                           |
| lltv            | uint256 | 贷款价值比率                             |

注意：

* Oracle：Oracle必须实现以下方法，其中asset是代币地址。该函数应返回带有8位小数的资产价格：

function peek(address asset) external view returns (uint256);

* IRM（利率模型）：必须由Lista Lending的管理者使用enableIrm启用。默认情况下，协议使用Lista Lending部署在以下地址的IRM：\[待定]
* LLTV（清算的贷款至价值比率）：也必须由Lista Lending的管理者使用enableLltv设置。用户可以从启用的LLTV选项中选择创建金库。

## 2. 创建市场

1. 跳转到合约地址：[https://bscscan.com/address/0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C](https://bscscan.com/address/0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C)

2. 填写属性\
   ![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXcMq245iohsignlpyM7nwuKu_qD1cEOqLodL8U7NkVi0BnVBr9F8r4uHkQG1s-waQIXMu1bHmfnhFUVjFn6mb1Nip5_w1SST32f5HIjBc1DxP0wSX7jZtG3XxXaf-3F6OHREdeReQ?key=wfz3O-Nby90_rWV7ZzqEXcEA)
3. 批准并完成！

## 3. 设置费用 \[可选]

只有管理者地址有权限设置市场费用。如果未设置，市场费用将默认为0。

1）跳转到主合约地址：[https://bscscan.com/address/0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C](https://bscscan.com/address/0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C)

2\) 填写属性，其中newFee是设置费率的参数，小数位为1e18。例如，填写100000000000000000表示10%的费率。

![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXdcBaYVU5LBqgZNIPcnesIWSagugP5HU0IveB68oe0S7YCEr4JCsyyfSpT_Ihn2VTVvku8TNrhb6ResvemvrIfiySlrftyBoA1Tn6YzApwcz--lpgXO5pAW_14z6iblA7ovqpDNpQ?key=wfz3O-Nby90_rWV7ZzqEXcEA)

## 4. 验证结果

![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXep-PuU2c22WHnpMt_cGfvYO1AMWS9QLu4gVqQlo5ONW1P9LyJwInmzrBzK7LdsPY0oKmrLBJKn68T-_wkfJ7jcMJerjOGZ-Qi4Zqb3KUU9LnhchzgpZoXf9c89_9uCs5Wa9Tmq?key=wfz3O-Nby90_rWV7ZzqEXcEA)

marketId可以从创建市场的交易中获取，其中id指的是marketId

![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXcloxfriNnhSkciVemSDkTz5z7UU1sU3B51N9RLrXOWkJfD6uArwR7CvMmEVyMMLwNHnx2Y_6xlCnvyTa92arwAgxM8wis4quEM141xAl8z2098iC0hFqy-ESVKd_gKddsVxUTZYg?key=wfz3O-Nby90_rWV7ZzqEXcEA)

通过在合约中传入marketId作为参数，可以通过市场功能获取费率。

* 检查成功创建市场的交易
* 检查marketId
* 检查费率