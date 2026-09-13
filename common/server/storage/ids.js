import crypto from 'node:crypto';

export const storageOperationId = (...parts) => crypto.createHash('sha256')
  .update(parts.map((part) => String(part)).join(':')).digest('hex').slice(0, 32);
