# Subscription Module

The subscription module lets users bind a wallet to **Telegram** and receive notifications (liquidation alerts, borrow-rate reminders). It exposes a **REST API** for client applications and uses a **Telegram Bot** for binding and subscription management.

**Base URL:** `/api/v2/subscription`

---

## Binding flow

1. Client application calls **POST /api/v2/subscription/:user/otp** (with wallet signature) -> service returns a **6-character alphanumeric OTP** (`A-Z`, `a-z`, `0-9`), valid for **5 minutes**.
2. User opens the Telegram Bot and sends that OTP in the chat.
3. Bot verifies the OTP and binds the wallet address to the user’s Telegram ID.
4. After binding, the user can receive **liquidation alerts** and **borrow-rate reminders**.

---

## REST API

### 1. Get subscription status

**GET /api/v2/subscription/:user**

Returns whether the given wallet is bound to Telegram and related subscription state.

| Path param | Description |
|------------|-------------|
| `user`    | Wallet address (e.g. 0x…) |

### 2. Generate OTP

**POST /api/v2/subscription/:user/otp**

Generates a one-time 6-character alphanumeric code for the user to send in the Telegram Bot to complete binding. Requires **wallet signature** to prove ownership.

| Path param | Description |
|------------|-------------|
| `user`    | Wallet address |

**Request body:** `signature` and `message`. `message` must be exactly the literal string `one-time-password` — this is a **different** challenge from the emission endpoints' timestamped message, and anything else returns envelope code `1005`. The server recovers the address from the signature and it must match the path `user`.

**Response:** `{ user, password, otpValidUntil }` — the code is under **`password`**, not `otp`, and `otpValidUntil` is a Unix-seconds expiry. Pass the code to the user verbatim. The bot accepts `[0-9a-zA-Z]{6}`, and it validates the trimmed message but looks up the untrimmed one — so trailing whitespace fails even though the code is right.

### 3. Unsubscribe (unbind)

**PUT /api/v2/subscription/:user/unsubscribe**

Unbinds the wallet from Telegram and stops all notifications. Sends an unbind confirmation to the user’s Telegram. Requires **wallet signature**.

| Path param | Description |
|------------|-------------|
| `user`    | Wallet address |

**Request body:** `signature` and `message`.

---

## Telegram Bot

Binding, subscription management, muting and language are handled inside the Telegram bot itself; the REST API above covers status, OTP issuance and unbind. Once a wallet is bound, the bot delivers liquidation alerts and borrow-rate reminders to it.
