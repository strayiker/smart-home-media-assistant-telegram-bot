import { MikroORM } from '@mikro-orm/better-sqlite';
import { defineConfig } from '@mikro-orm/better-sqlite';
import { Migrator } from '@mikro-orm/migrations';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';

import { botDataPath } from './config.js';

const config = defineConfig({
  debug: process.env.NODE_ENV !== 'production',
  dbName: `${botDataPath}/db.sqlite`,
  extensions: [Migrator],
  migrations: {
    path: 'dist/migrations',
    pathTs: 'src/migrations',
  },
  entities: ['dist/entities/**/*.js'],
  entitiesTs: ['src/entities/**/*.ts'],
  forceUndefined: true,
  ignoreUndefinedInQuery: true,
  metadataProvider: TsMorphMetadataProvider,
});

const orm = await MikroORM.init(config);

const migrator = orm.getMigrator();
await migrator.up();

export { orm };
export default config;
