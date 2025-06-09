FROM node:24-slim

RUN npm install pm2 -g

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN mkdir -p logs/pm2

CMD ["pm2-runtime", "ecosystem.config.js"] 