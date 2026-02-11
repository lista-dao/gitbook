Guide: Running Lista’s Liquidation bot
======================================

Introduction

* * *

### Guide: Running Lista’s Liquidation Bot

![](https://cdn-images-1.medium.com/max/800/0*Jar5YzedTo2qgTn6)

### Introduction

The Lista [AuctionBots-go Liquidation Bot](https://github.com/lista-dao/AuctionBots-go/blob/main/README.md) is a specialized tool designed to automate the process of participating in auctions when liquidation occurs on Lista DAO. The liquidation bot acts on the user’s behalf to place bids during liquidation, ensuring that users never miss out on potential opportunities due to delays or the need to manually oversee auctions during a liquidation event.

A liquidation event on Lista occurs when BNB, ETH or other collaterals need to be sold, due to various circumstances like loan collateral requirements not being met. The bot helps users by automating the bidding process, aiming to secure assets at favorable prices. Everything that you need to have your liquidation bot set up can be found [here](https://github.com/lista-dao/AuctionBots-go/blob/main/README.md).

This article serves as an additional guide to help set up your Lista Liquidation Bot with ease. Do note that running the liquidation bot may require users to have a basic understanding of coding language.

### Why should users use our liquidation bot?

Users should consider using our liquidation bot for two main reasons:

1.  Users can get a 5lisUSD reward for either starting or resetting the auction.
2.  Collaterals are sold at a **discounted** price during a liquidation event.

### Step 1: Understanding Your Configuration File

Before we dive into the technical steps, let’s understand what a configuration file is. Think of it as a simple document where you note down instructions for the bot to follow. These notes include where the bot should go (the blockchain address) and how it can access your digital

wallet securely to place bids.

1.  Head over to our liquidation bot guide [here](https://github.com/lista-dao/AuctionBots-go/blob/main/README.md). Click “releases” under “Download”.

![](https://cdn-images-1.medium.com/max/800/0*4zprTj5uep0k3-9n)

2\. Download the file according to the type of operating system you are using.

![](https://cdn-images-1.medium.com/max/800/0*sM6l6w1tMEcK8b-6)

3\. Unzip the file and download the file.

![](https://cdn-images-1.medium.com/max/800/0*2MZq1XaDj14xECAH)

4\. Open the “auctionBot” folder, and open “config.txt”

![](https://cdn-images-1.medium.com/max/800/0*vfk-qoPhIvfqLuGA)

you’ll need to fill in your specific details. Below is a step-by-step breakdown of what each section means.

A) WALLET PRIVATEKEY: This section requires your private key. The private key is essential for the bot to interact with the blockchain on your behalf. Replace \[insert private key here\] with your wallet private key

B) RPCNODE: Here, you’ll specify the WebSocket (ws) and HTTP (http) endpoints of your blockchain node. These endpoints allow your bot to connect to the blockchain. You can obtain these from blockchain infrastructure providers like [Alchemy](https://www.alchemy.com/) or [Infura](https://www.infura.io/).

![](https://cdn-images-1.medium.com/max/800/0*YA8XOek-oY_9q3v2)

This configuration tells the bot how to access your wallet and which blockchain network to interact with, ensuring it operates correctly according to your setup. Remember, handling private keys requires caution: never share them and always ensure they are stored securely.

After setting up your config.txt file with the correct parameters, save the file and you are all set and ready to run the liquidation bot.

### Step 3: Running Your Bot

1.  To run your liquidation bot, simply open the “auctionBot” file.

![](https://cdn-images-1.medium.com/max/800/0*zXSW-1bDh1Hzhk10)

2\. To stop your liquidation bot, simply close the file, and you are done!

By [Lista DAO](https://medium.com/@ListaDAO) on [March 6, 2024](https://medium.com/p/c5fa3cb75b38).

[Canonical link](https://medium.com/@ListaDAO/guide-running-listas-liquidation-bot-c5fa3cb75b38)

Exported from [Medium](https://medium.com) on January 15, 2026.