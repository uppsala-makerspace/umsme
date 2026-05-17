import { Template } from 'meteor/templating';
import Invites from '/imports/common/collections/Invites';
import './FamilyInviteList.html';

Template.FamilyInviteList.onCreated(function () {
  this.subscribe('invites');
});

Template.FamilyInviteList.helpers({
  invites() {
    return Invites.find({ infamily: this.patron });
  },
});

Template.FamilyInviteList.events({
  'click .cancelInvite': function (event) {
    event.preventDefault();
    const inviteId = event.currentTarget.dataset.id;
    const invite = Invites.findOne(inviteId);
    if (!invite) return;
    if (!confirm(`Cancel pending invite to ${invite.email}?`)) return;
    Meteor.call('adminCancelInvite', { inviteId }, (err) => {
      if (err) {
        alert(`Failed to cancel invite: ${err.reason || err.message || err}`);
      }
    });
  },
});
