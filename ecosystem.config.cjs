module.exports = {
  apps: [
    {
      name: 'website-maintenance-reporter',
      script: './server/dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 5000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
    },
  ],
};
