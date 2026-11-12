// PM2: `pm2 start ecosystem.config.cjs && pm2 save && pm2 startup`
// Secrets come from ./.env (copy .env.example) — never commit it.
module.exports = {
  apps: [{
    name: "kvl-whatsapp-qr",
    script: "server.mjs",
    node_args: "--env-file=.env",
    autorestart: true,
    max_restarts: 50,
    restart_delay: 5000,
    max_memory_restart: "400M",
    time: true,
  }],
};
