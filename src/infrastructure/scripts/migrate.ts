import 'reflect-metadata';

import { initORM } from '../../orm.js';

try {
  console.log('Initializing ORM and running migrations...');
  const orm = await initORM({ runMigrations: true });
  console.log('Migrations applied successfully');
  await orm.close(true);
  process.exit(0);
} catch (error) {
  console.error('Failed to run migrations', error);
  process.exit(1);
}
