import { Template } from 'meteor/templating';
import { Members } from '/collections/members.js';
import { Payments } from '/collections/payments';
import { updateMember } from '/lib/utils';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

import './MemberAdd.html';

Template.MemberAdd.onCreated(() => {
  Meteor.subscribe('members');
  Meteor.subscribe('payments');
});

Template.MemberAdd.helpers({
  Members() {
    return Members;
  },
  draftMember() {
    const paymentId = FlowRouter.getQueryParam('payment');
    const payment = Payments.findOne(paymentId);
    if (payment) {
      const draft = {};
      if (payment.message) {
        const match = payment.message.match(/([\w\.]*@[\w\.]*)/);
        if (match) {
          draft.email = match[1];
        }
      }
      if (payment.mobile) draft.mobile = payment.mobile;
      if (payment.name) draft.name = payment.name;
      return draft;
    } else {
      return {};
    }
  },
  Payments() {
    return Payments;
  },
  payment() {
    const paymentId = FlowRouter.getQueryParam('payment');
    return Payments.findOne(paymentId);
  },
});

AutoForm.hooks({
  insertMemberForm: {
    beginSubmit: function() {
      let id;
      do {
        id = "" + Math.floor(Math.random()*100000);
      } while (Members.findOne({mid: id}) != null);
      this.insertDoc.mid = id;
      const infamily = FlowRouter.getQueryParam('infamily');
      if (infamily) {
        this.insertDoc.infamily = infamily;
      }
    },
    onSubmit: function (doc) {
      console.log('Submitted document:', doc);
      const id = Members.insert(doc);
      const mb = Members.findOne(id);
      updateMember(mb);
      this.done();
      const infamily = FlowRouter.getQueryParam('infamily');
      const paymentId = FlowRouter.getQueryParam('payment');
      if (infamily) {
        FlowRouter.go(`/admin/member/${infamily}`);
      } else if (paymentId) {
        Payments.update(paymentId, {$set: {member: id}});
        FlowRouter.go(`/admin/payment/${paymentId}`);
      } else {
        FlowRouter.go(`/admin/member/${id}`);
      }
      return false;
    }
  }
});