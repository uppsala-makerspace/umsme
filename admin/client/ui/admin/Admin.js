import { Template } from 'meteor/templating';
import { Payments } from '/imports/common/collections/payments';
import { Members } from '/imports/common/collections/members';
import { Certificates } from '/imports/common/collections/certificates';
import './Admin.html';
import './MemberMerge';

Template.AdminConsole.helpers({
  mandatoryCertificate() {
    return Certificates.findOne({ mandatory: true });
  }
});

Template.AdminConsole.onCreated(function() {
  Meteor.subscribe('payments');
  Meteor.subscribe('members');
  Meteor.subscribe('certificates');
});

Template.AdminConsole.events({
  'click .forceSyncDoorUnlocks': function (event) {
    if (!confirm('Run the Danalock unlock sync now?')) return;
    const button = event.currentTarget;
    button.disabled = true;
    Meteor.call('forceSyncDoorUnlocks', (err, res) => {
      button.disabled = false;
      if (err) {
        alert(`Sync failed: ${err.reason || err.message || err}`);
      } else {
        alert(res || 'Sync done.');
      }
    });
  },
  'click .migrateUnlocks': function (event) {
    if (!confirm('Migrate the legacy unlocks collection into doorunlocks (and empty it)?')) return;
    const button = event.currentTarget;
    button.disabled = true;
    Meteor.call('migrateUnlocksToDoorUnlocks', (err, res) => {
      button.disabled = false;
      if (err) {
        alert(`Migration failed: ${err.reason || err.message || err}`);
      } else {
        alert(`Scanned ${res.scanned}: ${res.withMember} matched a member, ${res.withExtid} stored as extid, ${res.skipped} already present.`);
      }
    });
  },
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
  'click .acceptAllMembers': function () {
    const unregistered = Members.find({
      registered: { $ne: true },
      infamily: { $exists: false }
    }).fetch();

    if (unregistered.length === 0) {
      alert('All paying members are already registered.');
      return;
    }

    if (confirm(`Accept ${unregistered.length} paying members as registered?`)) {
      let count = 0;
      unregistered.forEach(member => {
        Members.update(member._id, { $set: { registered: true } });
        count++;
      });
      alert(`Registered ${count} members.`);
    }
  },
  'click .lowercaseMemberEmails': function (event) {
    if (!confirm('Lowercase every member email? Members whose lowercased email already belongs to another member are skipped and logged.')) return;
    const button = event.currentTarget;
    button.disabled = true;
    Meteor.call('lowercaseMemberEmails', (err, res) => {
      button.disabled = false;
      if (err) {
        alert(`Failed: ${err.reason || err.message || err}`);
      } else {
        alert(`Scanned ${res.scanned}: ${res.updated} updated, ${res.conflicts} skipped due to conflicts (see server log).`);
      }
    });
  },
  'click .grantMandatoryToAll': async function () {
    try {
      const { name, count } = await Meteor.callAsync('certificates.mandatoryGrantCount');
      if (count === 0) {
        alert('All members already have this certificate.');
        return;
      }
      if (!confirm(`Grant "${name}" to ${count} members?`)) return;
      alert(`Created ${await Meteor.callAsync('certificates.grantMandatoryToAll')} attestations.`);
    } catch (err) {
      alert(`Failed: ${err.reason || err.message || err}`);
    }
  }
});