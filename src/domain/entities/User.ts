import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class User {
  @PrimaryKey()
  id!: number;

  @Property()
  telegramId!: number;

  @Property({ onCreate: () => new Date() })
  createdAt!: Date;
}
