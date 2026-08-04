/** PM2 — production */
module.exports = {
  apps: [
    {
      name: 'garmonik',
      cwd: __dirname,
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '900M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
