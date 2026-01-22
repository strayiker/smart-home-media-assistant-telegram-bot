import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthMiddleware } from '../authMiddleware.js';

function makeCtx(overrides: Partial<any> = {}) {
  const ctx: any = {
    from: { id: 42 },
    session: {},
    message: { text: 'maybe' },
    reply: vi.fn().mockResolvedValue(undefined),
    t: (k: string) => k,
  };
  return Object.assign(ctx, overrides);
}

describe('authMiddleware', () => {
  let mockAuth: any;
  let middleware: ReturnType<typeof createAuthMiddleware>;
  let next: any;

  beforeEach(() => {
    mockAuth = {
      isAuthorized: vi.fn(),
      validateSecret: vi.fn(),
    };
    middleware = createAuthMiddleware(mockAuth);
    next = vi.fn().mockResolvedValue(undefined);
  });

  it('calls next when no ctx.from', async () => {
    const ctx = makeCtx({ from: undefined });
    await middleware(ctx, next);
    expect(next).toHaveBeenCalled();
  });

  it('calls next when user is authorized', async () => {
    vi.mocked(mockAuth.isAuthorized).mockResolvedValue(true);
    const ctx = makeCtx();
    await middleware(ctx, next);
    expect(next).toHaveBeenCalled();
  });

  it('prompts for secret when not authorized', async () => {
    vi.mocked(mockAuth.isAuthorized).mockResolvedValue(false);
    const ctx = makeCtx();
    await middleware(ctx, next);
    expect(ctx.reply).toHaveBeenCalledWith('auth-enter-secret');
    expect(ctx.session.awaitingSecret).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  it('validates secret during onboarding and succeeds', async () => {
    vi.mocked(mockAuth.isAuthorized).mockResolvedValue(false);
    vi.mocked(mockAuth.validateSecret).mockResolvedValue(true);
    const ctx = makeCtx({ session: { awaitingSecret: true }, message: { text: 'secret-key' } });

    await middleware(ctx, next);

    expect(mockAuth.validateSecret).toHaveBeenCalledWith(42, 'secret-key');
    expect(ctx.reply).toHaveBeenCalledWith('auth-success');
    expect(ctx.session.awaitingSecret).toBe(false);
  });

  it('validates secret during onboarding and fails', async () => {
    vi.mocked(mockAuth.isAuthorized).mockResolvedValue(false);
    vi.mocked(mockAuth.validateSecret).mockResolvedValue(false);
    const ctx = makeCtx({ session: { awaitingSecret: true }, message: { text: 'bad' } });

    await middleware(ctx, next);

    expect(mockAuth.validateSecret).toHaveBeenCalledWith(42, 'bad');
    expect(ctx.reply).toHaveBeenCalledWith('auth-fail');
    // awaitingSecret remains true on failure
    expect(ctx.session.awaitingSecret).toBe(true);
  });
});
