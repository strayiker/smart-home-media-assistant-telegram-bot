import DomainError from './DomainError.js';

export class TorrentError extends DomainError {
  constructor(message?: string) {
    super('TorrentError', message);
    this.name = 'TorrentError';
  }
}

export class TorrentNotFoundError extends TorrentError {
  constructor(id?: string) {
    super(`Torrent not found${id ? `: ${id}` : ''}`);
    this.name = 'TorrentNotFoundError';
  }
}

export default TorrentError;
