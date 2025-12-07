module.exports = {
    apps: [
      {
        name: "utils",
        script: "server.js",
  
        env: {
          NODE_ENV: "development"
        },
        env_qa: {
          NODE_ENV: "qa"
        },
        env_production: {
          NODE_ENV: "production"
        }
      }
    ]
  };