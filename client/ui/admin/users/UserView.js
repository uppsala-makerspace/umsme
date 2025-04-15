import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Comments } from '/collections/comments';
import { schemas } from '/lib/schemas';
import './UserView.html';
import '../comment/CommentList';


Template.UserView.onCreated(function() {
  Meteor.subscribe('users');
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
  }
});

Template.UserView.events({
  'click .deleteUser': async function (event) {
    const id = FlowRouter.getParam('_id');
    if (confirm('Delete this user')) {
      Comments.find({about: id}).forEach((comm) => {Comments.remove(comm._id);});
      await Meteor.users.removeAsync(id);
      FlowRouter.go('/admin/users');
    }
  }
});
