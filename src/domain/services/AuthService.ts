import type { Logger } from 'pino';

import type { UserRepository } from '../../infrastructure/persistence/repositories/UserRepository.js';
import type { User } from '../entities/User.js';

export class AuthService {
  private userRepository: UserRepository;
  private secretKey: string;
  private logger: Logger;

  constructor(
    userRepository: UserRepository,
    secretKey: string,
    logger: Logger,
  ) {
    this.userRepository = userRepository;
    this.secretKey = secretKey;
    this.logger = logger;
  }

  async ensureUser(telegramId: number): Promise<User | null> {
    return await this.userRepository.findByTelegramId(telegramId);
  }

  async isAuthorized(telegramId: number): Promise<boolean> {
    const user = await this.ensureUser(telegramId);
    return user !== null;
  }

  async validateSecret(telegramId: number, secret: string): Promise<boolean> {
    if (secret !== this.secretKey) return false;

    try {
      const existing = await this.userRepository.findByTelegramId(telegramId);
      if (existing) return true;
      await this.userRepository.create(telegramId);
      this.logger.info({ telegramId }, 'User created via secret onboarding');
      return true;
    } catch (error) {
      this.logger.error(
        error,
        'Failed to create user during secret validation',
      );
      return false;
    }
  }
}
