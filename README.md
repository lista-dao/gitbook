# GitBook RAG Bot

A Telegram bot powered by RAG (Retrieval-Augmented Generation) for answering questions based on GitBook documentation.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Bot Configuration
BOT_TOKEN=your_telegram_bot_token
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=gitbook-rag
OPENAI_API_KEY=your_openai_api_key

# Moderator Configuration (Optional)
# Comma-separated list of Telegram user IDs who can approve/reject bot responses
# Example: MODERATOR_IDS=123456789,987654321,555666777
MODERATOR_IDS=

# Group Whitelist (Optional)
# Add allowed group chat IDs if needed
```

## Features

### 1. Intelligent Question Answering

- Supports both Chinese and English questions
- Automatic language detection and translation
- Retrieval-based answers from GitBook documentation

### 2. Content Classification

- **Security**: Security measures, audit reports, bug bounty programs
- **Lending**: Lista Lending protocol, markets, vaults, borrowing
- **CDP**: Collateral Debt Positions, lisUSD, collateral management
- **clisBNB**: Binance Launchpool certificates, minting guides
- **veLISTA**: Governance tokens, voting, lock mechanisms
- **Comparison**: Protocol comparisons and feature differences

### 3. Source Management

- Maximum 6 most relevant sources per response
- Intelligent title extraction from Medium articles
- Proper external link handling for Medium/social content

### 4. Moderation System

The bot includes a built-in moderation system where designated moderators can review and approve/reject bot responses.

#### Setting Up Moderators

1. Get the Telegram user IDs of moderators (you can use @userinfobot)
2. Add them to the `MODERATOR_IDS` environment variable:
   ```env
   MODERATOR_IDS=123456789,987654321,555666777
   ```

#### How Moderation Works

- After each bot response, moderators will see review buttons
- **✅ Correct**: Marks the response as approved
- **❌ Incorrect**: Marks the response as needing correction
- Only configured moderator IDs can use these buttons
- All moderation actions are logged with timestamp and moderator info

### 5. Response Disclaimer

All bot responses include a disclaimer:

- **English**: "The above response is provided by an AI bot for reference only. Please contact moderators if you have questions or need confirmation."
- **Chinese**: "以上回答由 AI 机器人提供，仅供参考。如有疑问或需要确认，请联系管理员。"

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env`
4. Initialize Pinecone index: `node scripts/init.js`
5. Sync documentation: `node scripts/sync.js`
6. Start the bot: `npm start`

## Scripts

- `npm start`: Start the bot
- `node scripts/init.js`: Initialize Pinecone index
- `node scripts/sync.js`: Sync GitBook documentation
- `node scripts/manual-sync.js`: Sync external content (Medium, Twitter, etc.)
- `node scripts/test-questions.js`: Test bot responses

## File Structure

- `bot/`: Core bot components
  - `bot.js`: Main bot logic and message handling
  - `response-generator.js`: Answer generation and formatting
  - `retrieval-service.js`: Content retrieval and classification
  - `language-service.js`: Language detection and translation
  - `smart-processor.js`: Content processing and embedding
  - `group-manager.js`: Group chat management
  - `simple-rate-limiter.js`: Rate limiting
- `scripts/`: Utility scripts
- `doc/`: Documentation files (English and manual content)

## Moderation Example

When a user asks a question, the bot will:

1. **User**: "What are Lista DAO's security measures?"
2. **Bot**: [Provides detailed answer with sources and disclaimer]
3. **Bot** (for moderators only): "�� Moderators, please review the above response:"
   - **✅ Correct | ✅ 正确** button
   - **❌ Incorrect | ❌ 错误** button
4. **Moderator clicks**: Button updates to show moderation result with moderator name and timestamp
