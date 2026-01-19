import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class TorrentMeta {
  @PrimaryKey()
  id!: number;

  @Property({ unique: true })
  hash!: string;

  @Property({ unique: true })
  uid!: string;

  @Property()
  @Index()
  chatId!: number;

  @Property()
  searchEngine!: string;

  @Property()
  trackerId!: string;

  @Property({ onCreate: () => new Date() })
  createdAt!: Date;

  @Property({ onUpdate: () => new Date() })
  updatedAt!: Date;
}
