# 订阅模块

订阅模块允许用户将钱包绑定到 **Telegram** 并接收通知（清算警报、借款利率提醒）。它为客户端应用程序提供了一个 **REST API**，并使用 **Telegram Bot** 进行绑定和订阅管理。

**基本 URL:** `/api/v2/subscription`

---

## 绑定流程

1. 客户端应用程序调用 **POST /api/v2/subscription/:user/otp**（使用钱包签名）-> 服务返回一个 **6 个字符的字母数字 OTP**（`A-Z`，`a-z`，`0-9`），有效期为 **5 分钟**。
2. 用户打开 Telegram Bot 并在聊天中发送该 OTP。
3. Bot 验证 OTP 并将钱包地址绑定到用户的 Telegram ID。
4. 绑定后，用户可以接收 **清算警报** 和 **借款利率提醒**。

---

## REST API

### 1. 获取订阅状态

**GET /api/v2/subscription/:user**

返回给定钱包是否绑定到 Telegram 以及相关的订阅状态。

| 路径参数 | 描述 |
|----------|------|
| `user`   | 钱包地址（例如 0x…） |

### 2. 生成 OTP

**POST /api/v2/subscription/:user/otp**

生成一个一次性的 6 个字符的字母数字代码，供用户在 Telegram Bot 中发送以完成绑定。需要 **钱包签名** 以证明所有权。

| 路径参数 | 描述 |
|----------|------|
| `user`   | 钱包地址 |

**请求体：** `signature` 和 `message`。`message` 必须是确切的字面字符串 `one-time-password` — 这是与发放端点的时间戳消息 **不同** 的挑战，任何其他内容都会返回信封代码 `1005`。服务器从签名中恢复地址，并且必须与路径 `user` 匹配。

**响应：** `{ user, password, otpValidUntil }` — 代码在 **`password`** 下，而不是 `otp`，`otpValidUntil` 是 Unix 秒数的到期时间。将代码逐字传递给用户。Bot 接受 `[0-9a-zA-Z]{6}`，它验证修剪后的消息，但查找未修剪的消息 — 因此即使代码正确，尾随空格也会失败。

### 3. 取消订阅（解绑）

**PUT /api/v2/subscription/:user/unsubscribe**

将钱包从 Telegram 解绑并停止所有通知。向用户的 Telegram 发送解绑确认。需要 **钱包签名**。

| 路径参数 | 描述 |
|----------|------|
| `user`   | 钱包地址 |

**请求体：** `signature` 和 `message`。

---

## Telegram Bot

绑定、订阅管理、静音和语言在 Telegram bot 内部处理；上述 REST API 涵盖状态、OTP 发放和解绑。一旦钱包绑定，bot 将向其发送清算警报和借款利率提醒。