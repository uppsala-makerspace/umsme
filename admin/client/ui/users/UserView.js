import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Comments } from '/imports/common/collections/comments';
import { schemas } from '/imports/common/lib/schemas';
import { Roles } from 'meteor/roles';

import './UserView.html';
import '../comment/CommentList';


Template.UserView.onCreated(function() {
  Meteor.subscribe('users');
  Meteor.subscribe('roles');
});

Template.UserView.helpers({
  Users() {
    return Meteor.users;
  },
  userSchema() {
    return schemas.users;
  },
  user() {
    const id = FlowRouter.getParam('_id');
    return Meteor.users.findOne(id);
  },
  id() {
    return FlowRouter.getParam('_id');
  },
  isNotAdminUser() {
    const id = FlowRouter.getParam('_id');
    const user = Meteor.users.findOne(id);
    return user?.username !== 'admin';
  },
  adminAsync() {
    const id = FlowRouter.getParam('_id');
    return Roles.userIsInRoleAsync(id, 'admin');
  }
});

Template.UserView.events({
  'click .removeFromAdminGroup': async function (event) {
    const id = FlowRouter.getParam('_id');
    await Meteor.callAsync('removeFromAdminGroup', id);
  },
  'click .addToAdminGroup': async function (event) {
    const id = FlowRouter.getParam('_id');
    await Meteor.callAsync('addToAdminGroup', id);
  },
  'click .deleteUser': async function (event) {
    const id = FlowRouter.getParam('_id');
    if (confirm('Delete this user')) {
      Comments.find({about: id}).forEach((comm) => {Comments.remove(comm._id);});
      await Meteor.users.removeAsync(id);
      FlowRouter.go('/users');
    }
  }
});
