import { type FluentContextFlavor } from '@grammyjs/fluent';
import { type Context, type SessionFlavor } from 'grammy';

export interface SessionData {
  awaitingSecret?: boolean;
}

export type MyContext = Context &
  FluentContextFlavor &
  SessionFlavor<SessionData>;
