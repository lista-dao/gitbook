# clisBNB

## 概述

clisBNB 是一个基于 Binance Smart Chain (BSC) 的去中心化应用（dApp），旨在提供一个用户友好的界面来交互 BSC 上的智能合约。它允许用户执行交易、查询余额和与智能合约互动。

## 功能

- **交易执行**: 用户可以通过 clisBNB 发送 BNB 或其他基于 BSC 的代币。
- **智能合约交互**: 提供一个界面用于与部署在 BSC 上的智能合约交互。
- **查询余额**: 用户可以查询他们在 BSC 上的地址的 BNB 余额及其他代币余额。

## 安装

要开始使用 clisBNB，您需要先安装 Node.js 和 npm。然后，您可以通过以下命令安装 clisBNB:

```bash
npm install -g clisbnb
```

## 使用

### 配置

在使用 clisBNB 之前，您需要配置您的 BSC 钱包地址和私钥。这可以通过编辑 `config.json` 文件来完成：

```json
{
  "walletAddress": "你的BSC钱包地址",
  "privateKey": "你的私钥"
}
```

### 执行交易

要发送 BNB，可以使用以下命令：

```bash
clisbnb send --to 0x接收者地址 --amount 1 --token BNB
```

### 与智能合约互动

如果您想调用智能合约的函数，可以使用 `call` 命令：

```bash
clisbnb call --contract 0x合约地址 --abi 合约的ABI --function 函数名 --args 参数1,参数2
```

### 查询余额

要查询 BNB 余额，可以使用 `balance` 命令：

```bash
clisbnb balance --address 0x你的地址
```

## 安全性

请确保不要在任何公共或不安全的系统上暴露您的私钥。始终保持您的 `config.json` 文件安全，并只在信任的环境中使用 clisBNB。

## 结论

clisBNB 提供了一个简单而强大的工具，用于在 Binance Smart Chain 上执行交易和与智能合约互动。通过简化的命令行界面，用户可以轻松地进行日常操作，同时保持安全和控制。