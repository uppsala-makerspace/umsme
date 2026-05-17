import { Template } from 'meteor/templating';
import Invites from '/imports/common/collections/Invites';
import { Members } from '/imports/common/collections/members';
import './MemberInvitesReceived.html';

Template.MemberInvitesReceived.onCreated(function () {
  this.subscribe('invites');
});

Template.MemberInvitesReceived.helpers({
  invites() {
    if (!this.email) return [];
    return Invites.find({ email: this.email }).fetch().map(invite => ({
      ...invite,
      inviter: Members.findOne(invite.infamily),
    }));
  },
});

Template.MemberInvitesReceived.events({
  'click .declineInvite': function (event) {
    event.preventDefault();
    const inviteId = event.currentTarget.dataset.id;
    const invite = Invites.findOne(inviteId);
    if (!invite) return;
    const inviter = Members.findOne(invite.infamily);
    const label = inviter ? inviter.name : invite.infamily;
    if (!confirm(`Decline invitation from ${label}?`)) return;
    Meteor.call('adminCancelInvite', { inviteId }, (err) => {
      if (err) {
        alert(`Failed to decline invite: ${err.reason || err.message || err}`);
      }
    });
  },
});
