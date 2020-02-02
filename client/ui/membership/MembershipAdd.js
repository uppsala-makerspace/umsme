import { Template } from 'meteor/templating';
import { Memberships } from '../../../collections/memberships';
import { Members } from '../../../collections/members';
import { Payments } from '../../../collections/payments';
import { membershipFromPayment } from '/lib/rules';
import { updateMember } from '/lib/utils';
import './MembershipAdd.html';

Template.MembershipAdd.onCreated(function() {
  Meteor.subscribe('memberships');
  Meteor.subscribe('members');
  Meteor.subscribe('payments');
});

Template.MembershipAdd.helpers({
  Memberships() {
    return Memberships;
  },
  memberName() {
    const member = Members.findOne(FlowRouter.getQueryParam('member'));
    return member.name;
  },
  membership() {
    const pid = FlowRouter.getQueryParam('payment');
    if (pid) {
      const payment = Payments.findOne(pid);
      return {
        amount: payment.amount,
        start: payment.date,
        pid,
      };
    }
    return {};
  }
});

AutoForm.hooks({
  insertMembershipForm: {
    beginSubmit: function() {
      const memberId = FlowRouter.getQueryParam('member');
      const pid = FlowRouter.getQueryParam('payment');
      const insdoc = this.insertDoc;
      insdoc.mid = memberId;
      insdoc.pid = pid;
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
      const pid = FlowRouter.getQueryParam('payment');
      Memberships.insert(doc, (err, id) => {
        if (pid) {
          // DOES NOT WORK, WHY NOT?
          Payments.update(pid, {$set: {membership: id}});
          FlowRouter.go(`/payment/${pid}`);
        } else {
          FlowRouter.go(`/member/${memberId}`);
        }
      });
      this.done();
      const memberId = FlowRouter.getQueryParam('member');
      const mb = Members.findOne(memberId);
      updateMember(mb);
      return false;
    }
  }
});