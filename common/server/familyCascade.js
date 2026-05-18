import { Members } from '/imports/common/collections/members';
import { updateMember } from '/imports/common/lib/utils';

// Fields whose change on a payer must propagate to every dependent
// (Members with infamily === payer._id).
const WATCHED = ['member', 'lab', 'family'];

// Hook A — payer changed → propagate to dependents.
// Skip when the modified doc is itself a dependent (no nested families).
// Skip when `infamily` was part of this write — those flows are handled by
// Hook B and shouldn't trigger a payer-style cascade.
Members.after.update(async function (userId, doc, fieldNames) {
  if (doc.infamily) return;
  if (fieldNames.includes('infamily')) return;
  if (!fieldNames.some((f) => WATCHED.includes(f))) return;
  await Members.updateAsync(
    { infamily: doc._id },
    { $set: { member: doc.member, lab: doc.lab, family: doc.family } },
    { multi: true },
  );
}, { fetchPrevious: false });

// Hook B — `infamily` set/changed/cleared → resync the affected member.
//   attach: copy the new payer's member/lab/family onto the dependent.
//   detach: recompute from the (now-detached) member's own memberships via
//           updateMember, which $sets the fields if memberships exist or
//           $unsets them if none do.
Members.after.update(async function (userId, doc, fieldNames) {
  if (!fieldNames.includes('infamily')) return;
  if (doc.infamily) {
    const payer = await Members.findOneAsync(doc.infamily);
    if (!payer) return;
    await Members.updateAsync(
      { _id: doc._id },
      { $set: { member: payer.member, lab: payer.lab, family: payer.family } },
    );
  } else {
    await updateMember(doc);
  }
});
