import { Migration } from '@mikro-orm/migrations';

export class Migration20250423081759 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`user\` (\`id\` integer not null primary key autoincrement, \`telegram_id\` integer not null, \`created_at\` datetime not null);`);
  }

}
