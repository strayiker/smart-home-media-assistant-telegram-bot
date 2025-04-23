import { MikroORM } from '@mikro-orm/better-sqlite';
import { defineConfig } from '@mikro-orm/better-sqlite';
import { Migrator } from '@mikro-orm/migrations';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';

const config = defineConfig({
  debug: process.env.NODE_ENV !== 'production',
  extensions: [Migrator],
  entities: ['dist/entities/**/*.js'],
  entitiesTs: ['src/entities/**/*.ts'],
  forceUndefined: true,
  ignoreUndefinedInQuery: true,
  metadataProvider: TsMorphMetadataProvider,
});

const mikroOrm = await MikroORM.init(config);

export { config, mikroOrm };
