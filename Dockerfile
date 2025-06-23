FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .

RUN mkdir -p logs

RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs botuser

RUN chown -R botuser:nodejs /app
USER botuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "bot/bot.js"] 