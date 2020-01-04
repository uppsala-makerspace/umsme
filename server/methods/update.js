import { updateMember } from '/lib/utils';
import { Members } from '/collections/members.js';
import { Memberships } from '/collections/memberships.js';

Meteor.methods({
  'updateMembers': () => {
    Members.find().forEach((mb) => {
      updateMember(mb);
    });
  },
});
