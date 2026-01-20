const { defineConfig } = require('@mikro-orm/better-sqlite');

module.exports = defineConfig({
  dbName: 'data/app.db',
  type: 'better-sqlite',
  migrations: {
    path: './src/migrations',
    pattern: /^[\w-]+\d+\.ts$/,
  },
  entities: ['./dist/entities'],
  tsNode: true,
});
