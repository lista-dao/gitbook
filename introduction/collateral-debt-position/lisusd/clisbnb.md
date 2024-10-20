# clisBNB

clisBNB 是用户在 Lista DAO 平台上将 BNB 存入抵押债务位置（CDP）后获得的“凭证”代币。它旨在以 1:1 的比例代表用户的 BNB，确保每个 clisBNB 都直接与 CDP 中锁定的 BNB 数量相连。这意味着用户每存入 1 BNB，就会收到 1 clisBNB。

该产品专为希望利用其 BNB 存款参与 Lista DAO 上其他 DeFi 活动的用户量身定制。

## clisBNB 能做什么？ <a href="#id-9a96" id="id-9a96"></a>

clisBNB 的主要功能是允许用户在 ListaDAO 上以他们的 BNB 抵押品借入 lisUSD，并且仍然可以使用 clisBNB 参与 Binance launchpool。持有 clisBNB 的用户可以在他们的 **Binance Web3 MPC 钱包** 中利用 BNB 参加独家代币启动活动，赚取新代币，而无需关闭他们在 Lista DAO 上的债务位置。

这种借贷与参与 Binance Launchpool 的强大组合为用户的 BNB 持有提供了更多的实用性和灵活性，所有这些都通过一个无缝的产品实现。

## clisBNB 的关键特性 <a href="#id-8293" id="id-8293"></a>

clisBNB 具有几个特点，使其与其他代币区别开来，为用户提供专注的实用性，同时保持对资产的控制：

### 1. 与 BNB 的 1:1 比例 <a href="#d449" id="d449"></a>

当用户将 BNB 存入 Lista DAO 的 CDP 时，他们以 1:1 的比例发行 clisBNB。这种直接关系确保每存入一个 BNB，就创建一个 clisBNB，保持存款与凭证之间的无缝链接。

### 2. 不可转让的代币 <a href="#e763" id="e763"></a>

clisBNB 的一个重要特性是它是不可转让的。一旦发行，clisBNB 不能在钱包或用户之间移动。它仅与用户的 BNB 存款相关联，并且仅存在于 Lista DAO 平台的上下文中，确保其安全性和专注的使用。

### 3. 提取时自动销毁 <a href="#f3b4" id="f3b4"></a>

当用户从 Lista DAO 的 CDP 提取他们的 BNB 或相应的 slisBNB 时，clisBNB 会自动被销毁或摧毁。这种机制确保 clisBNB 始终准确地代表用户位置中的 BNB 数量。一旦提取了底层的 BNB，相关的 clisBNB 就会从系统中移除，以防止价值不匹配。

### 4. 向另一个地址铸造 clisBNB <a href="#id-7699" id="id-7699"></a>

clisBNB 为用户提供了一个独特的功能：当将 BNB 存入 CDP 时，他们可以选择将 clisBNB 铸造到另一个地址。然而，一旦选择了这个地址并发送了 clisBNB，它将不再能够转移到任何其他钱包。这个功能为用户提供了更大的灵活性，特别是对于可能希望委托与另一个钱包相关的某些操作的用户，例如积累星尘点数。

然而，这种灵活性伴随着一些关键限制：

* 存款时只能指定一个地址来接收 clisBNB。
* 如果提取了底层的 BNB 或 slisBNB，铸造到次级地址的任何 clisBNB 都会自动销毁。
* 作为一种新产品，clisBNB 目前在功能上仍然有限。截至目前，它仅作为用户存款的 BNB 的收据，并且无法在 Lista DAO 平台上执行任何操作。