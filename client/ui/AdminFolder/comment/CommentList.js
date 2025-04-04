import { Template } from 'meteor/templating';
import { Comments } from '/collections/comments';
import './Comment';
import './CommentList.html';

Template.CommentList.onCreated(function() {
  Meteor.subscribe('comments');
});

Template.CommentList.helpers({
  comments() {
    return Comments.find({about: this.about});
  }
});

Template.CommentList.events({
  'click .addComment': function (event) {
    event.preventDefault();
    const instance = Template.instance();
    const about = instance.data.about;
    const created = new Date();
    const id = Comments.insert({ about, created});
  }
});