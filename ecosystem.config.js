module.exports = {
  apps: [
    {
      name: "fabric-app",
      script: "node",
      args: "server.js",
      cwd: "/app",
      instances: 2,
      exec_mode: "cluster",
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/log/pm2/fabric-app-error.log",
      out_file: "/var/log/pm2/fabric-app-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
    {
      name: "fabric-worker",
      script: "ts-node",
      args: "--esm src/workers/index.ts",
      cwd: "/app",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "/var/log/pm2/fabric-worker-error.log",
      out_file: "/var/log/pm2/fabric-worker-out.log",
    },
  ],
};
