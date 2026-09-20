import { storageTextDigest } from '/imports/common/lib/storageDigest';

export const storageOperationId = (...parts) =>
  storageTextDigest(parts.map((part) => String(part)).join(':')).slice(0, 32);
