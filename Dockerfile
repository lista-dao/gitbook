FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .

RUN mkdir -p logs

EXPOSE 3000

CMD ["node", "bot/bot.js"] 