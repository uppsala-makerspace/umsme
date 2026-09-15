import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Members } from '/imports/common/collections/members';
import { memberForUser } from '/imports/common/server/memberForUser';
import {
  resolveStorageOwner,
  STORAGE_OPERATOR_ROLES,
} from '/imports/common/lib/storageRules';

export { STORAGE_OPERATOR_ROLES } from '/imports/common/lib/storageRules';

export const requireStorageOperator = async (userId) => {
  if (!userId || !(await Roles.userIsInRoleAsync(userId, STORAGE_OPERATOR_ROLES))) {
    throw new Meteor.Error('not-authorized', 'Storage, admin, or board role required');
  }
  return userId;
};

export const storageOwnerForMember = async (member) => {
  if (!member) throw new Meteor.Error('not-found', 'Member not found');
  // The rule rejects every chain longer than one hop, so only the direct payer
  // is needed; a nested chain fails below as family_payer_missing.
  const payer = member.infamily ? await Members.findOneAsync(member.infamily) : null;
  const resolved = resolveStorageOwner(member, payer ? [member, payer] : [member]);
  if (!resolved.owner || resolved.error) {
    throw new Meteor.Error('invalid-family', `Cannot resolve storage owner: ${resolved.error}`);
  }
  return resolved.owner;
};

export const memberAndStorageOwnerForUser = async (userId) => {
  if (!userId) throw new Meteor.Error('not-authorized', 'You must be logged in');
  const user = await Meteor.users.findOneAsync(userId);
  const member = user ? await memberForUser(user) : null;
  if (!member) throw new Meteor.Error('not-found', 'No member found for user');

  const owner = await storageOwnerForMember(member);
  return { member, owner, familyDependent: member._id !== owner._id };
};

export const requirePayingStorageMember = async (userId) => {
  const result = await memberAndStorageOwnerForUser(userId);
  if (result.familyDependent) {
    throw new Meteor.Error('family-read-only', 'Storage is managed by the paying family member');
  }
  return result;
};
