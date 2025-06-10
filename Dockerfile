FROM node:24-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --production

COPY . .

RUN mkdir -p logs

EXPOSE $PORT

CMD ["node", "bot/bot.js"] 