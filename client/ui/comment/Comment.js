import { Template } from 'meteor/templating';
import { Comments } from '/collections/comments';
import './Comment.html';

Template.Comment.onCreated(function() {
  Meteor.subscribe('comments');
  this.state = new ReactiveDict();
  this.state.set('editing', this.data.text == undefined);
});

Template.Comment.helpers({
  editingClass() {
    const inst = Template.instance();
    if (inst.state.get('editing')) {
      return 'editing';
    }
    return 'displaying';
  },
  createdShort() {
    const inst = Template.instance();
    return moment(inst.data.created).format("YYYY-MM-DD");
  },
  modifiedShort() {
    const inst = Template.instance();
    return moment(inst.data.modified).format("YYYY-MM-DD");
  }
});

Template.Comment.events({
  'click .deleteComment': function (event) {
    event.preventDefault();
    Comments.remove(Template.instance().data._id);
  },
  'click .editComment': function (event) {
    event.preventDefault();
    const instance = Template.instance();
    instance.state.set('editing', true);
  },
  'click .cancelEditComment': function (event) {
    event.preventDefault();
    const instance = Template.instance();
    instance.state.set('editing', false);
    const node = instance.find('textarea');
    node.value = instance.data.text || '';
  },
  'click .saveComment': function (event) {
    event.preventDefault();
    const instance = Template.instance();
    const node = instance.find('textarea');
    const text = node.value;
    let modified = new Date();
    let created = instance.data.created;
    // in case this is the first time we edit the comment (e.g. no modified before and no text)
    if (instance.data.modified === undefined && instance.data.text === undefined) {
      modified = undefined;
      created = new Date();
    }
    Comments.update(instance.data._id, {$set: { text, modified, created }});
    instance.state.set('editing', false);
  }
});