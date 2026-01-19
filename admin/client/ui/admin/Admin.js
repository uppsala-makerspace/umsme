import { Template } from 'meteor/templating';
import { Payments } from '/imports/common/collections/payments';
import { Members } from '/imports/common/collections/members';
import { Certificates } from '/imports/common/collections/certificates';
import { Attestations } from '/imports/common/collections/attestations';
import './Admin.html';

Template.AdminConsole.helpers({
  mandatoryCertificate() {
    return Certificates.findOne({ mandatory: true });
  }
});

Template.AdminConsole.onCreated(function() {
  Meteor.subscribe('payments');
  Meteor.subscribe('members');
  Meteor.subscribe('certificates');
  Meteor.subscribe('attestations');
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
  },
  'click .grantMandatoryToAll': function (event) {
    const mandatoryCert = Certificates.findOne({ mandatory: true });
    if (!mandatoryCert) {
      alert('No mandatory certificate configured.');
      return;
    }

    // Find current user's member record to use as certifier
    const currentUser = Meteor.user();
    if (!currentUser || !currentUser.emails || !currentUser.emails[0]) {
      alert('Cannot determine current user email.');
      return;
    }
    const certifier = Members.findOne({ email: currentUser.emails[0].address });
    if (!certifier) {
      alert('Your user account is not linked to a member record.');
      return;
    }

    // Get all members who don't have an attestation for this certificate
    const existingAttestations = Attestations.find({ certificateId: mandatoryCert._id }).fetch();
    const membersWithAttestation = existingAttestations.map(a => a.memberId);
    const membersWithoutAttestation = Members.find({ _id: { $nin: membersWithAttestation } }).fetch();

    if (membersWithoutAttestation.length === 0) {
      alert('All members already have this certificate.');
      return;
    }

    if (confirm(`Grant "${mandatoryCert.name.sv}" to ${membersWithoutAttestation.length} members?`)) {
      const startDate = new Date();
      let created = 0;
      membersWithoutAttestation.forEach(member => {
        Attestations.insert({
          certificateId: mandatoryCert._id,
          memberId: member._id,
          certifierId: certifier._id,
          startDate: startDate
        });
        created++;
      });
      alert(`Created ${created} attestations.`);
    }
  }
});