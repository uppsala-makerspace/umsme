import { Template } from 'meteor/templating';
import { Payments } from '/collections/payments';
import { Members } from '/collections/members';
import './Admin.html';

Template.AdminConsole.helpers({
});

Template.AdminConsole.onCreated(function() {
  Meteor.subscribe('payments');
  Meteor.subscribe('members');
});

Template.AdminConsole.events({
  'click .updateMembers': function (event) {
    if (confirm('Update dates from membership information?')) {
      Meteor.call('updateMembers');
    }
  },
  'click .detectMobiles': function (event) {
    if (confirm('Detect mobile numbers in payments?')) {
      Payments.find().forEach(payment => {
        console.log(`Checking ${payment._id}`);
        if (!payment.mobile && payment.type === 'swish') {
          const match = payment.clarification.match(/(\+[\d\s()]*)\sat/);
          if (match) {
            Payments.update(payment._id, {$set: {mobile: match[1]}});
            console.log(`Updating ${payment._id} with ${match[1]}`);
          }
        }
      });
    }
  },
  'click .updateMobiles': function (event) {
    if (confirm('Update member mobile numbers from payments?')) {
      Members.find({mobile: null}).forEach((member) => {
        const lastPayment = Payments.findOne({
          member: member._id,
          mobile: { $exists: true }
        }, { sort: { date: -1 } });
        if (lastPayment) {
          Members.update(member._id, { $set: { mobile: lastPayment.mobile } });
        }
      });
    }
  }
});