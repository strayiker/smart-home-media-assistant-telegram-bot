import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'chat_session' })
export class ChatSession {
  @PrimaryKey()
  id!: number;

  @Property()
  chatId!: string;

  @Property({ type: 'text' })
  data!: string; // JSON-serialized session payload

  @Property({ nullable: true })
  expiresAt?: Date;

  @Property({ onCreate: () => new Date() })
  createdAt!: Date;
}
