import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { updateMember, membershipsByMember } from '/imports/common/lib/utils';
import { Members } from '/imports/common/collections/members.js';

Meteor.methods({
  /**
   * Every member's dates, figured again from their memberships (all fetched
   * at once); only those out of step are written. Resolves to how many
   * members there are and how many were changed.
   */
  async 'updateMembers'() {
    if (!this.userId || !await Roles.userIsInRoleAsync(this.userId, 'admin')) {
      throw new Meteor.Error('Not authorized');
    }
    const [members, memberships] = await Promise.all([Members.find().fetchAsync(), membershipsByMember()]);
    let changed = 0;
    for (const member of members) {
      if (await updateMember(member, memberships[member.infamily || member._id] || [], { skipUnchanged: true })) changed += 1;
    }
    return { total: members.length, changed };
  }
});
