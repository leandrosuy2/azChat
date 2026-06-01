module.exports = [{
  script: 'dist/server.js',
  name: 'multipremium-back',
  exec_mode: 'fork',
  instances: 1,          // 1 instancia em fork: evita sessoes Baileys conflitando (stream replaced)
  cron_restart: '05 00 * * *',
  autorestart: true,     // Reinicia automaticamente em caso de falhas
  watch: false,
  merge_logs: true,
  time: true,
  log_date_format: 'YYYY-MM-DD HH:mm:ss',
  env: {
    NODE_ENV: 'production'
  }
}]