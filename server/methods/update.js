import { updateMember } from '/lib/utils';
import { Members } from '/collections/members.js';

Meteor.methods({
  'updateMembers': async () => {
    if (Meteor.userId()) {
      await Members.find().forEachAsync((mb) => {
        updateMember(mb);
      });
    }
  },
});
