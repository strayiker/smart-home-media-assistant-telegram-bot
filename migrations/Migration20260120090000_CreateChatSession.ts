import { Migration } from '@mikro-orm/migrations';

export class Migration20260120090000_CreateChatSession extends Migration {
  async up(): Promise<void> {
    this.addSql(`create table "chat_session" ("id" serial primary key, "chat_id" text not null, "data" text not null, "expires_at" timestamptz null, "created_at" timestamptz not null);`);
    this.addSql(`create unique index "chat_session_chat_id_unique" on "chat_session" ("chat_id");`);
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "chat_session";');
  }
}
