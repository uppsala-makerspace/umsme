import { Template } from 'meteor/templating';
import { Memberships } from '../../../collections/memberships.js';
import { Members } from '../../../collections/members.js';
import { membershipFromPayment } from '/lib/rules';
import { updateMember } from '/lib/utils';
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
      const memberId = FlowRouter.getQueryParam('member');
      const insdoc = this.insertDoc;
      insdoc.mid = memberId;
      if (insdoc.start && insdoc.amount) {
        const mb = Members.findOne(memberId);
        const doc = membershipFromPayment(insdoc.start, insdoc.amount,
          mb.member != null, mb.lab == null);
        insdoc.family = doc.family;
        insdoc.discount = doc.discount;
        insdoc.type = doc.type;
        insdoc.end = doc.end;
      }
    },
    onSubmit: function (doc) {
      Memberships.insert(doc);
      this.done();
      const memberId = FlowRouter.getQueryParam('member');
      const mb = Members.findOne(memberId);
      updateMember(mb);
      FlowRouter.go(`/member/${memberId}`);
      return false;
    }
  }
});