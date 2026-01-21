import { Migration } from '@mikro-orm/migrations';

export class Migration20260118090000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'create table `torrent_meta` (`id` integer not null primary key autoincrement, `hash` text not null, `uid` text not null, `chat_id` integer not null, `search_engine` text not null, `tracker_id` text not null, `created_at` datetime not null, `updated_at` datetime not null);',
    );
    this.addSql(
      'create unique index `torrent_meta_hash_unique` on `torrent_meta` (`hash`);',
    );
    this.addSql(
      'create unique index `torrent_meta_uid_unique` on `torrent_meta` (`uid`);',
    );
    this.addSql(
      'create index `torrent_meta_chat_id_index` on `torrent_meta` (`chat_id`);',
    );

    this.addSql(
      'create table `chat_settings` (`chat_id` integer not null primary key, `locale` text not null, `created_at` datetime not null, `updated_at` datetime not null);',
    );
  }
}
