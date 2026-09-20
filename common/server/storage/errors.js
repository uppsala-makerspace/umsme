import { Meteor } from 'meteor/meteor';

/**
 * A compare-and-set write matched nothing: the document changed under the
 * command. A Meteor.Error, so the client sees "reload and try again" instead
 * of an anonymous 500.
 */
export class StorageConflictError extends Meteor.Error {
  constructor(message = 'Storage state changed. Reload and try again.') {
    super('storage-conflict', message);
    this.name = 'StorageConflictError';
  }
}

export const isDuplicateKeyError = (error) =>
  error?.code === 11000 || error?.codeName === 'DuplicateKey';
