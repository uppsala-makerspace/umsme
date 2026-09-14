import { MongoInternals } from 'meteor/mongo';

let transactionSupport;

const transactionUnavailable = (error) =>
  error?.code === 20 || error?.codeName === 'IllegalOperation' ||
  /transaction numbers are only allowed|does not support transactions/i.test(error?.message || '');

const mongoClient = () => MongoInternals.defaultRemoteCollectionDriver()?.mongo?.client;

/**
 * Run one storage row atomically where Mongo transactions are available.
 * Standalone Mongo deployments use the command's compare-and-set fallback.
 */
export const runStorageAtomic = async ({ transactional, fallback }) => {
  if (transactionSupport === false || !mongoClient()?.startSession) return fallback();
  const session = mongoClient().startSession();
  try {
    let value;
    await session.withTransaction(async () => {
      value = await transactional(session);
    });
    transactionSupport = true;
    return value;
  } catch (error) {
    if (transactionSupport === undefined && transactionUnavailable(error)) {
      transactionSupport = false;
      return fallback();
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

export const storageTransactionsSupported = () => transactionSupport;

export const resetStorageTransactionCapabilityForTests = () => {
  transactionSupport = undefined;
};
