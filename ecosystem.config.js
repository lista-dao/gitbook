module.exports = {
  apps: [
    {
      name: "gitbook-rag-bot",
      script: "bot/bot.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "logs/pm2/error.log",
      out_file: "logs/pm2/out.log",
      log_file: "logs/pm2/combined.log",
      time: true,
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env_production: {
        PORT: 8080,
      },
    },
  ],
};
