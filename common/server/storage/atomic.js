import { MongoInternals } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

let transactionSupport;

const transactionUnavailable = (error) =>
  error?.code === 20 || error?.codeName === 'IllegalOperation' ||
  /transaction numbers are only allowed|does not support transactions/i.test(error?.message || '');

const mongoDriver = () => MongoInternals.defaultRemoteCollectionDriver()?.mongo;

export const detectStorageTransactionSupport = async () => {
  if (transactionSupport !== undefined) return transactionSupport;
  const driver = mongoDriver();
  if (!driver?.client?.startSession || !driver?.db) {
    transactionSupport = false;
    return false;
  }
  const session = driver.client.startSession();
  try {
    await session.withTransaction(() => driver.db.collection('storageEvents').findOne({}, { session }));
    transactionSupport = true;
  } catch (error) {
    if (!transactionUnavailable(error)) throw error;
    transactionSupport = false;
  } finally {
    await session.endSession();
  }
  return transactionSupport;
};

/**
 * Run one storage command's writes in a single MongoDB transaction. Storage
 * lifecycle commands are disabled on deployments without transaction support.
 */
export const runStorageAtomic = async ({ transactional }) => {
  if (!(await detectStorageTransactionSupport())) {
    throw new Meteor.Error(
      'storage-transactions-required',
      'Storage changes require MongoDB transaction support. Configure a replica set.',
    );
  }
  const session = mongoDriver().client.startSession();
  try {
    let value;
    await session.withTransaction(async () => {
      value = await transactional(session);
    });
    return value;
  } finally {
    await session.endSession();
  }
};
