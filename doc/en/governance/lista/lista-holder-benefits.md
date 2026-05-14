# LISTA Holder Benefits

Following the approval of [LIP-024](https://snapshot.org/#/s:listavote.eth/proposal/0x1a15347f6b452049212bdf51ff1a46c0a7edf7ca8efe1004b32c15c2965f0f3b), Lista has launched several benefits for LISTA holders.

The first is Liquidation Protection, a mechanism that gives LISTA holders 24 more hours before their position gets liquidated. Refer to our [liquidation page](https://docs.bsc.lista.org/introduction/lista-lending/liquidation#delayed-liquidation) for more information.

The second is LISTA Holder Boost, an emission program that gives extra emissions to LISTA holders who deposit and/or borrow in selected vaults and/or markets.

This emission works in a tiered system:

| Tier | 7-Day Average LISTA Balance | Deposit and Borrow Cap (Calculated Separately) | Tier Weight |
| ---- | --------------------------- | ---------------------------------------------- | ----------- |
| 1    | ≥ 10,000                    | $500                                           | 1.0         |
| 2    | ≥ 50,000                    | $1,500                                         | 1.2         |
| 3    | ≥ 200,000                   | $3,000                                         | 1.5         |
| 4    | ≥ 1,000,000                 | $4,000                                         | 2.0         |
| 5    | ≥ 5,000,000                 | $5,000                                         | 2.5         |
| 6    | ≥ 15,000,000                | $5,000                                         | 3.0         |

Each week, Lista will select several vaults and markets and allocate a certain amount of LISTA emission for each of them. Everyday, a snapshot will be taken for each eligible vault/market to calculate the exact amount of LISTA emission for each address, which will be determined by its share in each vault/market’s total eligible deposits and/or borrows.

An address’s share in each vault/market’s emission is calculated by multiplying its deposits/borrow and tier weight.

An example:

Vaults A and B are both allocated LISTA emissions of 40,000 and 60,000, respectively. If an address has a 7-day average LISTA balance of 60,000 and deposited $1,000 to both vaults respectively. Then:

As a tier 2 holder, its vault deposit cap is $1,500 and weight in each vault is 1.2.

The total eligible deposit is $2,000, exceeding the cap. When this happens, the amount eligible for emission will be calculated as:

1500/2000 \* 1000 = 750 for both vaults

Multiply this number by its weight, and its share in both vaults will both be 750 \* 1.2 = $900.

If vault A has a total eligible deposit of $90,000 while B has $180,000, then the total amount of LISTA emission this address will get is:

900/90000 \* 40000 + 900/180000 \* 60000 = 700

<br>
