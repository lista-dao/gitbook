# 用户流程

### 1. 将资产存入金库

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXd3By57F7kuKMNq2sTRK2GNs5FAdSg9DzG5RslMa8LKVU9LnkPFsUKn2gHpYtf9K2aiPrLBOKHLc6wOI3Odqt70mAepwWZAhVVvDIYbpNstZKCsf2BCe7ZJMI362nKUfXCf2YZ0?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>

供应商将借贷资产（例如，USDT）存入他们选择的金库。

每个金库只能存放一种借贷资产（例如，USDT），这种资产可以在多个市场中使用。

存入后，金库将借贷资产分配到这些市场中，随时间赚取收益。

### 2. 金库匹配供应商和借款人（P2P）

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXfbe12E5zx-0ekWuSFxeqm8uVARnYYLg3NqBnLS8Cq3V8SKzqH0-pIRkVXVyLmR651TtKyJOjcC10a3LUMBhvwj6SI_IL-7XayBgXCpOO8qArS5hHAd_T3HMVuEXK4qJfdZkjxi?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>

金库通过积极管理来匹配供应商和借款人：

直接P2P借贷发生。金库的借贷资产（例如，USDT）通过特定市场出借，从该市场赚取利息。这种P2P模式为供应商带来更高的利息，为借款人降低借款成本。

### 3. 带抵押的借款

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXddK9Nks8JeXyc2bRxQSnsygltWFyamhuUYlzAr25t40bIov8nOzJ-GXobvE0J1ujddsO76gjmODFA_B4YUtw-ROfKABFGkix49XYpXroUorx4ouEZ5OGyU6EIDqbkwumv8wys?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>

1. 想要借款的用户选择一个市场进行借款，并存入所需的抵押品。例如，在USDT/BNB市场中，借款人存入ETH作为抵押品并借出USDT。
2. 市场锁定抵押品并发放借出的资产，USDT。
3. 每个市场的借款参数（例如，LLTV，抵押资产类型等）在部署时定义。

### 4. 利率自动调整

1. 每个市场的利率根据供需（利用率）自动调整。
2. Lista Lending上的市场使用多重预言机系统来获取准确的价格信息，防止价格操纵并确保公平的贷款估值。

### 5. 还款或被清算

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXcAPboGffxRDG0Dksf1hBFOR4gFLnOUXtqOc5ZH6quFlC1MQ0GrM-3TXEgXZXTCd1zNkYw1FdNMV2uGxU1yc9Vahl5kf2GcVey0TmHOt2WKQ93HLOr50H4Vzj8myxejYUvwqll3?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>

1. 借款人可以随时还款，包括累积的利息。
2. 还款后，抵押品完全归还给借款人。
3. 如果抵押品价值下降超过LLTV比率，系统将触发清算，出售抵押品以覆盖贷款，确保金库保持偿付能力并保护供应商。

### 6. 提取您的资金

<figure><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXeYJtL_bZPzZK8XsGtLkpt5dbN4VPm6hhsmgQNk0liLIqkDTl7hdr9BOxnqYLWU7vl2NETDWYK2zRQ8rVburvkbXROnn4BFZvEB9Dyoov9L01VRqk1OhpoKb4fsq6hmP-IRD0k?key=ZbB0Bdp_i9xaaxZIxmtWD2y_" alt=""><figcaption></figcaption></figure>

1. 供应商可以随时提取他们的存款并赚取利息，前提是金库有可用的流动性。
2. 借款人在完全还清贷款后收回他们的抵押品。