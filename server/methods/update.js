import { updateMember } from '/lib/utils';
import { Members } from '/collections/members.js';

Meteor.methods({
  'updateMembers': async () => {
    if (Meteor.userId()) {
      await Members.find().forEachAsync((mb) => {
        // We are not waiting for this one to complete, forEachAsync does not have support for that
        updateMember(mb);
      });
    }
  },
});
