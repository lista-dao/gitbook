const questList = [
  // slisBNBx (contract + product logic)
  {
    topic: "clisbnb",
    question: "要怎麼獲得 slisBNBx？請列出所有方式",
    checks: {
      mustInclude: ["slisbnb", "lp"],
      mustIncludeAny: [["slisbnbx", "clisbnb"]],
    },
  },
  // ✅ passed in previous run
  // "slisBNBx 和 clisBNB 是不是同一個東西？",
  {
    topic: "clisbnb",
    question: "slisBNB 模組與 slisBNB/BNB LP 模組的 slisBNBx 鑄造費率和折扣各是多少？",
    checks: {
      mustInclude: ["0.2%", "3%", "1.8367%"],
    },
  },
  {
    topic: "clisbnb",
    question: "slisBNBx delegation 有哪些限制？可不可以改 delegate 地址？",
    checks: {
      mustIncludeAny: [["delegate", "delegation"]],
    },
  },

  // Lista Lending protocol extensions / integration patterns
  {
    topic: "lending",
    question: "What protocol-level extensions does Moolah add on top of Morpho Blue?",
    checks: {
      mustInclude: ["minloan", "timelock"],
      mustIncludeAny: [["nonreentrant", "reentrancy"]],
    },
  },
  {
    topic: "lending",
    question: "Moolah 的 minLoan 限制會在借款和部分還款時如何生效？",
    checks: {
      mustInclude: ["minloan"],
      mustIncludeAny: [["revert", "回滚", "回滾"]],
    },
  },
  // ✅ passed in previous run
  // "Moolah 的升級權限與 timelock 規則是什麼？",
  {
    topic: "lending",
    question:
      "Compare Provider vs Broker integration patterns in Lista Lending with examples.",
    checks: {
      mustInclude: ["provider", "broker"],
      mustIncludeAny: [["slisbnbprovider", "smartprovider"]],
    },
  },
  {
    topic: "lending",
    question: "Which providers support slisBNBx minting and which do not?",
    checks: {
      mustInclude: [
        "slisbnbprovider",
        "smartprovider",
        "bnbprovider",
        "creditbroker",
      ],
    },
  },

  // Contract-side address retrieval
  {
    topic: "lending",
    question: "Give me the BSC addresses for Moolah and Liquidator in Lista Lending.",
    checks: {
      mustInclude: [
        "0x8f73b65b4caaf64fba2af91cc5d4a2a1318e5d8c",
        "0x6a87c15598929b2db22cf68a9a0dde5bf297a59a",
      ],
      mustNotInclude: [
        "0xf820fb4680712cd7263a0d3d024d5b5aea82fd70",
        "0x5bf5c3b5f5c29dbc647d2557cc22b00ed29f301c",
      ],
    },
  },
  {
    topic: "credit-loans",
    question: "Credit Loans 裡 CreditBroker 和 CreditToken 的 BSC 地址是什麼？",
    checks: {
      mustInclude: [
        "0x2a6704d56bdedf4c7564c9534d7fa8d8d204d578",
        "0x1f9831626ce85909794eeaa5c35bf34db3eb52d8",
      ],
    },
  },
  {
    topic: "lending",
    question: "What is the Ethereum address of ResilientOracle in Lista Lending smart contracts?",
    checks: {
      mustInclude: ["0xa64fe284eb8279b9b63946dd51813b0116099301"],
    },
  },

  // RWA operations (backend-ish operational flow)
  // ✅ passed in previous run
  // "RWA 使用者只需要呼叫哪個合約？有哪些主要方法？",
  // ✅ passed in previous run
  // "RWA 的 withdraw 流程是同步還是非同步？請描述 requestWithdraw 到 claimWithdraw。",
  {
    topic: "rwa",
    question: "RWA bot 在存款與提款路徑各要呼叫哪些方法？哪些步驟要等 1-2 個工作天？",
    checks: {
      mustInclude: [
        "requestdeposittovault",
        "deposittovault",
        "requestwithdrawfromvault",
        "withdrawfromvault",
        "finishearnpoolwithdraw",
      ],
      mustIncludeAny: [["1-2", "1~2", "1 to 2", "1-2 个工作天", "1-2 business"]],
    },
  },

  // Credit Loans deep-dive
  // ✅ passed in previous run
  // "Explain the 8 phases in Credit Loans lifecycle.",
  {
    topic: "credit-loans",
    question: "Credit Loans 的逾期 penalty 比率是多少？何時會觸發 blacklist？",
    checks: {
      mustInclude: ["3%"],
      mustIncludeAny: [["blacklist", "黑名单", "黑名單"]],
    },
  },
  // ✅ passed in previous run
  // "Why does Credit Loans need on-chain bad debt write-off, and who bears the loss after write-off?",

  // Backend/service docs coverage sanity checks
  {
    topic: "lending",
    question: "Moolah Lending API 的 Base URL 是什麼？",
    checks: {
      mustIncludeAny: [
        ["base url"],
        ["沒有明確", "并没有明确", "does not contain", "cannot provide", "无法提供"],
      ],
    },
  },
  // ✅ passed in previous run
  // "If docs are missing for a asked backend topic, how should the assistant respond?",
];

module.exports = { questList };
