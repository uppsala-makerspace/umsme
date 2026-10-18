import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { check } from 'meteor/check';
import { Members } from '/imports/common/collections/members';
import { planMemberMerge, mergeMembers } from '../memberMerge';

const requireAdmin = async () => {
  if (!Meteor.userId() || !(await Roles.userIsInRoleAsync(Meteor.userId(), 'admin'))) {
    throw new Meteor.Error('not-authorized', 'Admin role required');
  }
};

// The admin types member numbers, which are what is shown on member pages.
const memberByNumber = async (mid, role) => {
  check(mid, String);
  const member = await Members.findOneAsync({ mid: mid.trim() });
  if (!member) throw new Meteor.Error('not-found', `No member with number ${mid} (${role})`);
  return member;
};

Meteor.methods({
  'members.mergePreview': async (sourceMid, destMid) => {
    await requireAdmin();
    return planMemberMerge(
      await memberByNumber(sourceMid, 'source'),
      await memberByNumber(destMid, 'destination'),
    );
  },

  'members.merge': async (sourceMid, destMid) => {
    await requireAdmin();
    return mergeMembers(
      await memberByNumber(sourceMid, 'source'),
      await memberByNumber(destMid, 'destination'),
    );
  },
});
