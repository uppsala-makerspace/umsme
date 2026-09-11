import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Members } from '/imports/common/collections/members';
import { memberForUser } from '/imports/common/server/memberForUser';
import { resolveStorageOwner } from '/imports/common/lib/storageRules';

export const STORAGE_OPERATOR_ROLES = ['admin', 'board'];

export const requireStorageOperator = async (userId) => {
  if (!userId || !(await Roles.userIsInRoleAsync(userId, STORAGE_OPERATOR_ROLES))) {
    throw new Meteor.Error('not-authorized', 'Admin or board role required');
  }
  return userId;
};

export const storageActor = async (userId) => {
  const user = userId ? await Meteor.users.findOneAsync(userId) : null;
  const member = user ? await memberForUser(user) : null;
  return {
    actor: userId || '__system__',
    actorMember: member || null,
    actorName: member?.name || user?.username || (userId ? 'administrator' : 'system'),
  };
};

export const storageOwnerForMember = async (member) => {
  if (!member) throw new Meteor.Error('not-found', 'Member not found');
  const family = [member];
  const loaded = new Set([member._id]);
  let current = member;
  while (current?.infamily && !loaded.has(current.infamily)) {
    const payer = await Members.findOneAsync(current.infamily);
    if (!payer) break;
    family.push(payer);
    loaded.add(payer._id);
    current = payer;
  }
  const resolved = resolveStorageOwner(member, family);
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
