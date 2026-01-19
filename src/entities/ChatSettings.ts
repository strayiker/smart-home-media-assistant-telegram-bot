import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class ChatSettings {
  @PrimaryKey()
  chatId!: number;

  @Property()
  locale!: string;

  @Property({ onCreate: () => new Date() })
  createdAt!: Date;

  @Property({ onUpdate: () => new Date() })
  updatedAt!: Date;
}
