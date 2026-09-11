import { Members } from '/imports/common/collections/members';
import { reconcileStorageState } from './reconciliation';

const WATCHED = ['lab', 'family', 'infamily'];

// Prompt healing for renewals and family changes. Time-based expiry is also
// handled lazily by every storage read/preview/command.
Members.after.update(async function storageMembershipSync(userId, doc, fieldNames) {
  if (!fieldNames.some((field) => WATCHED.includes(field))) return;
  const ownerId = doc.infamily || doc._id;
  try {
    await reconcileStorageState({ ownerIds: [ownerId] });
  } catch (error) {
    console.error(`[storage] membership reconciliation failed for ${ownerId}`, error);
  }
}, { fetchPrevious: false });
