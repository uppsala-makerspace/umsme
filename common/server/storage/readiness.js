import {
  StorageWalls,
  StorageUnits,
  StorageRequests,
  StorageOffers,
} from '/imports/common/collections/storage';
import { storageLayoutErrors, storageStateErrors } from '/imports/common/lib/storageRules';
import { detectStorageTransactionSupport } from './atomic';

/**
 * Safety gate for automatic allocation. Suggestions and confirmations refuse
 * to allocate unless transactions work, the stored state satisfies the storage
 * invariants and every unit has a floor and a height. Manual operations are
 * not gated.
 */
export const storageAllocationReadiness = async () => {
  const [walls, units, requests, offers, transactionsSupported] = await Promise.all([
    StorageWalls.find({}).fetchAsync(),
    StorageUnits.find({}).fetchAsync(),
    StorageRequests.find({}).fetchAsync(),
    StorageOffers.find({}).fetchAsync(),
    detectStorageTransactionSupport(),
  ]);

  const invariantErrors = [
    ...storageStateErrors({ units, requests, offers }),
    ...storageLayoutErrors({ walls, units }),
  ];
  const unclassifiedUnits = units.filter((unit) => !unit.floor || !unit.height);
  const blockedReasons = [
    ...(!transactionsSupported ? ['transactions_unavailable'] : []),
    ...(invariantErrors.length ? ['storage_invariant_errors'] : []),
    ...(unclassifiedUnits.length ? ['unclassified_units'] : []),
  ];

  return {
    allocation_ready: blockedReasons.length === 0,
    allocation_blocked_reasons: blockedReasons,
    transactions_supported: transactionsSupported,
    invariant_errors: invariantErrors,
    unclassified_unit_ids: unclassifiedUnits.map((unit) => unit._id),
  };
};
