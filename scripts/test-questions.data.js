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

  // Risk Fund - should correctly state it only covers Lista's own vaults
  {
    topic: "lending",
    question: "How does Lista risk fund protect lenders during bad debt events?",
    checks: {
      mustInclude: ["risk fund"],
      mustIncludeAny: [["self-operated", "self operated", "self-created", "lista dao's", "lista's own", "lista's vaults", "created by lista", "自有", "not include", "不包含"]],
      mustNotInclude: ["all vaults are covered", "covers all vaults"],
    },
  },

  // Lista Credit - should correctly identify the vault provider
  {
    topic: "credit-loans",
    question: "Who provides the assets in Lista Credit's vault?",
    checks: {
      mustIncludeAny: [["lista", "partner", "合作夥伴", "合作伙伴"]],
    },
  },

  // Backend/service docs coverage sanity checks
  {
    topic: "lending",
    question: "Moolah Lending API 的 Base URL 是什麼？",
    checks: {
      mustIncludeAny: [["/api/moolah", "base url", "moolah"]],
    },
  },
  // ✅ passed in previous run
  // "If docs are missing for a asked backend topic, how should the assistant respond?",

  // ── Reconcile regression: 2026-05 doc/en rewire ──
  // Before this round, the broken sync left governance/velista/* and
  // user-guide/lista-velista/* paths indexed even though they were
  // deleted upstream; new services/lending-api/* and governance/lista/
  // additions were never indexed at all. These questions lock in the fix.

  // veLISTA must be described as retired (Tokenomics 2.0), not active,
  // and no stale velista path should appear in citations.
  {
    topic: "tokenomics",
    question: "veLISTA 現在還能用嗎？目前狀態是什麼？",
    checks: {
      mustIncludeAny: [
        ["retired", "sunset", "wound down", "tokenomics 2.0", "退休", "下線", "下线", "停止", "終止", "终止"],
      ],
      mustNotInclude: ["governance/velista/", "user-guide/lista-velista"],
    },
  },

  // Revenue / Cost answers must come from the new governance/lista/
  // location and reflect current revenue sources (no veLISTA early-unlock fee).
  {
    topic: "tokenomics",
    question: "Lista DAO 目前的主要收入來源有哪些？",
    checks: {
      mustInclude: ["lisusd"],
      mustIncludeAny: [
        ["borrowing", "borrow", "借貸", "借贷"],
        ["lst", "slisbnb"],
      ],
      mustNotInclude: [
        "governance/velista/",
        "velista early unlock fee",
        "velista holders earn a share",
      ],
    },
  },

  // New file added on en: governance/lista/lista-holder-benefits.md
  {
    topic: "tokenomics",
    question: "LISTA 持有者現在有哪些好處？",
    checks: {
      mustIncludeAny: [
        ["liquidation protection", "delayed liquidation", "延遲清算", "延迟清算", "清算保護", "清算保护"],
      ],
    },
  },

  // bnb-validator-lista-dao.md was rewritten "veLISTA holders" → "LISTA holders".
  // No mustNotInclude: the prompt rule now mandates explaining the veLISTA →
  // LISTA transition, so contrastive phrasing like "no longer veLISTA holders"
  // is correct — the must-include of "lista holder" already ensures the
  // current beneficiary is named.
  {
    topic: "tokenomics",
    question: "Lista DAO 作為 BNB validator 的收益會分配給誰？",
    checks: {
      mustIncludeAny: [["lista holder", "lista 持有", "lista holders"]],
    },
  },

  // Lending API docs (for-developer/services/lending-api/*) were never
  // indexed before this round — verify they are now retrievable.
  {
    topic: "lending",
    question: "Moolah Lending API 取得 market 列表的 endpoint 是什麼？",
    checks: {
      mustIncludeAny: [
        ["/api/moolah/borrow/markets", "borrow/markets", "/api/moolah"],
      ],
    },
  },
];

module.exports = { questList };
