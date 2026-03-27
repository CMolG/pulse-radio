module.exports = {
  apps: [
    {
      name: 'pulse-radio',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/pulse-radio',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      max_memory_restart: '256M',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pulse-radio/error.log',
      out_file: '/var/log/pulse-radio/out.log',
      merge_logs: true,
      kill_timeout: 5000,
    },
  ],
};
