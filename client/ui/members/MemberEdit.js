import { Template } from 'meteor/templating';
import { Members } from '../../../collections/members.js';

import './MemberEdit.html';

/*AutoForm.addHooks('editMember',{
  endSubmit: function() {
    console.log(AutoForm.validateForm('editMember'));
  },
}, true);*/

Template.MemberEdit.onCreated(function() {
  const self = this;
  self.autorun(function() {
    self.subscribe('members');
  });
});
Template.MemberEdit.helpers({
  Members() {
    return Members;
  },
  member: function() {
    const member = Members.findOne({'_id': new Mongo.ObjectID(FlowRouter.getParam('_id'))});
    return member;
  }
});

Template.MemberEdit.events({
  'keyup #editMember': function (event) {
  //  console.log(AutoForm.validateForm('editMember'));
  }
});