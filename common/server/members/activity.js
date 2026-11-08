import { Meteor } from 'meteor/meteor';
import { Members } from '/imports/common/collections/members';
import { memberDoorActivity } from '/imports/common/server/doors/doorUnlocks';
import { memberAppActivity } from '/imports/common/server/users/lastSeen';

export const ACTIVITY_SCOPES = ['member', 'family'];

/**
 * The member's family, the member included: the paying member and everyone
 * whose `infamily` points to them. Just the member when not in a family.
 */
export const familyOf = async (member) => {
  const payerId = member.infamily || member._id;
  return Members.find(
    { $or: [{ _id: payerId }, { infamily: payerId }] },
    { fields: { name: 1, infamily: 1 }, sort: { infamily: 1, name: 1 } },
  ).fetchAsync();
};

/**
 * What a member has done, for the Activity tab of the member's page in
 * admin: one part per kind of activity. A new kind is a new key here and a
 * new part in the tab (admin/imports/ui/members/MemberActivity.jsx).
 *
 * The doors can be counted for the member alone (the default) or for the
 * whole family; the app is always the member's own. `family` lists the
 * family's members (one, the member, when not in a family), so the tab knows
 * whether to offer the choice and whose an opening was.
 *
 * @param {string} memberId
 * @param {{ scope?: 'member'|'family', now?: Date }} options
 */
export const memberActivity = async (memberId, { scope = 'member', now } = {}) => {
  const member = await Members.findOneAsync(memberId, { fields: { email: 1, infamily: 1 } });
  if (!member) throw new Meteor.Error('not-found', 'No such member');
  const family = await familyOf(member);
  const doorIds = scope === 'family' ? family.map((m) => m._id) : [memberId];
  return {
    scope,
    family: family.map((m) => ({ _id: m._id, name: m.name })),
    app: await memberAppActivity(member),
    doors: await memberDoorActivity(doorIds, { now }),
  };
};
