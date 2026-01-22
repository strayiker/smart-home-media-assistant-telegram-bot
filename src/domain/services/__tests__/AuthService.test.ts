import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../AuthService.js';

describe('AuthService', () => {
  let mockRepo: any;
  let auth: AuthService;
  let mockLogger: any;

  beforeEach(() => {
    mockRepo = {
      findByTelegramId: vi.fn(),
      create: vi.fn(),
    };
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    auth = new AuthService(mockRepo, 'secret-key', mockLogger);
  });

  it('ensureUser returns user or null', async () => {
    const user = { id: 1, telegramId: 123 };
    vi.mocked(mockRepo.findByTelegramId).mockResolvedValue(user);

    const res = await auth.ensureUser(123);
    expect(res).toBe(user);

    vi.mocked(mockRepo.findByTelegramId).mockResolvedValue(null);
    const res2 = await auth.ensureUser(999);
    expect(res2).toBeNull();
  });

  it('isAuthorized returns boolean based on user existence', async () => {
    vi.mocked(mockRepo.findByTelegramId).mockResolvedValue({ id: 1 });
    expect(await auth.isAuthorized(1)).toBe(true);

    vi.mocked(mockRepo.findByTelegramId).mockResolvedValue(null);
    expect(await auth.isAuthorized(2)).toBe(false);
  });

  it('validateSecret rejects wrong secret', async () => {
    const ok = await auth.validateSecret(1, 'bad');
    expect(ok).toBe(false);
  });

  it('validateSecret accepts when user exists', async () => {
    vi.mocked(mockRepo.findByTelegramId).mockResolvedValue({ id: 5 });
    const ok = await auth.validateSecret(5, 'secret-key');
    expect(ok).toBe(true);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('validateSecret creates user when not exists and secret matches', async () => {
    vi.mocked(mockRepo.findByTelegramId).mockResolvedValue(null);
    vi.mocked(mockRepo.create).mockResolvedValue({ id: 7 });

    const ok = await auth.validateSecret(7, 'secret-key');
    expect(ok).toBe(true);
    expect(mockRepo.create).toHaveBeenCalledWith(7);
    expect(mockLogger.info).toHaveBeenCalled();
  });

  it('validateSecret returns false when create throws', async () => {
    vi.mocked(mockRepo.findByTelegramId).mockResolvedValue(null);
    vi.mocked(mockRepo.create).mockRejectedValue(new Error('boom'));

    const ok = await auth.validateSecret(8, 'secret-key');
    expect(ok).toBe(false);
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
