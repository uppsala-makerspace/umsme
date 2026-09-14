export class StorageConflictError extends Error {
  constructor(message = 'Storage state changed') {
    super(message);
    this.name = 'StorageConflictError';
    this.code = 'storage-conflict';
  }
}

export const isDuplicateKeyError = (error) =>
  error?.code === 11000 || error?.codeName === 'DuplicateKey';
