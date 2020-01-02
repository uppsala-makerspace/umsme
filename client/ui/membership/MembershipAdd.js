import { Template } from 'meteor/templating';
import { Memberships } from '../../../collections/memberships.js';
import { Members } from '../../../collections/members.js';

import './MembershipAdd.html';

Template.MembershipAdd.helpers({
  Memberships() {
    return Memberships;
  },
  memberName() {
    const member = Members.findOne(FlowRouter.getQueryParam('member'));
    return member.name;
  }
});

AutoForm.hooks({
  insertMembershipForm: {
    beginSubmit: function() {
      this.insertDoc.mid = FlowRouter.getQueryParam("member");
    },
    onSubmit: function (doc) {
      Memberships.insert(doc);
      this.done();
      const member = Members.findOne(FlowRouter.getQueryParam('member'));
      FlowRouter.go(`/member/${member._id}`);
      return false;
    }
  }
});