import { Migration } from '@mikro-orm/migrations';

export class Migration20260123000001 extends Migration {
  /**
   * Create chat_message_state table with indexes for efficient queries
   */
  override async up(): Promise<void> {
    this.addSql(`
      create table "chat_message_state" (
        "id" integer not null primary key autoincrement,
        "chat_id" integer not null,
        "message_type" text not null,
        "message_id" integer not null,
        "data" jsonb,
        "expires_at" datetime,
        "created_at" datetime not null,
        "updated_at" datetime not null
      );
    `);

    // Indexes for common query patterns
    this.addSql(`
      create index "chat_message_state_chat_id_index" 
      on "chat_message_state" ("chat_id");
    `);

    this.addSql(`
      create index "chat_message_state_message_type_index" 
      on "chat_message_state" ("message_type");
    `);

    this.addSql(`
      create index "chat_message_state_message_id_index" 
      on "chat_message_state" ("message_id");
    `);

    this.addSql(`
      create index "chat_message_state_expires_at_index" 
      on "chat_message_state" ("expires_at");
    `);

    // Composite index for common chat + message type queries
    this.addSql(`
      create index "chat_message_state_chat_type_index" 
      on "chat_message_state" ("chat_id", "message_type");
    `);
  }

  /**
   * Drop chat_message_state table
   */
  override async down(): Promise<void> {
    this.addSql('drop table \`chat_message_state\`;');
  }
}
