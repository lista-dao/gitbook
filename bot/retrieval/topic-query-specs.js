module.exports = [
  {
    detect: "detectSmartLendingQuery",
    queryType: "smart-lending",
    topicKey: "smartLending",
    label: "Smart Lending查詢",
    logMessage: "檢測到 Smart Lending 相關問題，使用專門的 Smart Lending 檢索策略",
  },
  {
    detect: "detectRWAQuery",
    queryType: "rwa",
    topicKey: "rwa",
    label: "RWA查詢",
    logMessage: "檢測到 RWA 相關問題，使用專門的 RWA 檢索策略",
  },
  {
    detect: "detectCreditLoansQuery",
    queryType: "credit-loans",
    topicKey: "creditLoans",
    label: "Credit Loans查詢",
    logMessage:
      "檢測到 Credit Loans 相關問題，使用專門的 Credit Loans 檢索策略",
  },
  {
    detect: "detectLendingQuery",
    queryType: "lending",
    topicKey: "lending",
    label: "Lending查詢",
    logMessage: "檢測到 Lista Lending 相關問題，使用專門的 Lending 檢索策略",
  },
  {
    detect: "detectCDPQuery",
    queryType: "cdp",
    topicKey: "cdp",
    label: "CDP查詢",
    logMessage: "檢測到 CDP 相關問題，使用專門的 CDP 檢索策略",
  },
  {
    detect: "detectClisBNBQuery",
    queryType: "clisbnb",
    topicKey: "clisbnb",
    label: "clisBNB查詢",
    logMessage:
      "檢測到 clisBNB/slisBNBx 相關問題，使用專門的 clisBNB 檢索策略",
  },
  {
    detect: "detectVeListaQuery",
    queryType: "velista",
    topicKey: "velista",
    label: "veLISTA查詢",
    logMessage: "檢測到 veLISTA 相關問題，使用專門的 veLISTA 檢索策略",
  },
];
