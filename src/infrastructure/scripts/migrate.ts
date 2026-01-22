import 'reflect-metadata';

import { initORM } from '../../orm.js';
import { logger } from '../../logger.js';

try {
  logger.info('Initializing ORM and running migrations...');
  const orm = await initORM({ runMigrations: true });
  logger.info('Migrations applied successfully');
  await orm.close(true);
  process.exit(0);
} catch (error) {
  logger.error(error, 'Failed to run migrations');
  process.exit(1);
}
