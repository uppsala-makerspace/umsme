import { createHash } from 'node:crypto';

export const canonicalStorageValue = (value) => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalStorageValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort()
      .map((key) => [key, canonicalStorageValue(value[key])]));
  }
  return value;
};

export const stableStorageString = (value) => JSON.stringify(canonicalStorageValue(value));
export const storageTextDigest = (text) => createHash('sha256').update(text).digest('hex');
export const storageDigest = (value) => storageTextDigest(stableStorageString(value));
