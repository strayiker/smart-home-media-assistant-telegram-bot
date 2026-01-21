import { type FluentContextFlavor } from '@grammyjs/fluent';
import { type Context, type SessionFlavor } from 'grammy';

export interface SessionData {
  awaitingSecret?: boolean;
}

// Context flavor for DI container
export interface ContainerContextFlavor {
  resolve<T = unknown>(key: string): T;
}

export type MyContext = Context &
  FluentContextFlavor &
  SessionFlavor<SessionData> &
  ContainerContextFlavor;
