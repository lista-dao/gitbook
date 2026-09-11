# Subscription Module

The subscription module lets users bind a wallet to **Telegram** and receive notifications (liquidation alerts, borrow-rate reminders). It exposes a **REST API** for client applications and uses a **Telegram Bot** for binding and subscription management.

**Base URL:** `/api/v2/subscription`

---

## Binding flow

1. Client application calls **POST /api/v2/subscription/:user/otp** (with wallet signature) -> service returns a **6-digit OTP**, valid for **5 minutes**.
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

Generates a one-time 6-digit code for the user to send in the Telegram Bot to complete binding. Requires **wallet signature** to prove ownership.

| Path param | Description |
|------------|-------------|
| `user`    | Wallet address |

**Request body:** `signature` and `message`. The server recovers the address from them; it must match the path `user`.

**Response:** the OTP, valid for 5 minutes.

### 3. Unsubscribe (unbind)

**PUT /api/v2/subscription/:user/unsubscribe**

Unbinds the wallet from Telegram and stops all notifications. Sends an unbind confirmation to the user’s Telegram. Requires **wallet signature**.

| Path param | Description |
|------------|-------------|
| `user`    | Wallet address |

**Request body:** `signature` and `message`.

---

## Telegram Bot

The Bot receives messages via **Webhook**. Supported interactions:

| Command / action      | Description |
|-----------------------|-------------|
| **OTP (plain text)**  | User sends the 6-digit OTP from the API → Bot binds wallet to Telegram. |
| **/unbind**           | Shows list of bound wallets (inline buttons); user selects one to unbind. |
| **/subscribe**        | Lists markets where the user has borrow positions; user replies with market number(s) (e.g. `1,4`) to subscribe to **borrow-rate reminders**. Pushed daily at **UTC 02:00**. |
| **/cancel**           | Lists subscribed markets; user replies with number(s) to stop rate reminders. |
| **Mute (inline)**     | Inline buttons on alert messages to mute **liquidation alerts** or **borrow notifications** (CDP vs lending can be separate). |
| **/change_language**  | Switch Bot language between **Chinese** and **English**. |

---

## Notification types

| Type               | When / content |
|--------------------|----------------|
| Liquidation alert  | Position at or over liquidation threshold; may include mute button. |
| Borrow-rate reminder | Daily (e.g. UTC 02:00) for markets subscribed via `/subscribe`. |
| Unbind confirmation| Sent to Telegram after successful unbind. |
