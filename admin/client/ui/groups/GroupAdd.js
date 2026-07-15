import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Groups } from '/imports/common/collections/groups';
import './GroupAdd.html';

Template.GroupAdd.onCreated(function () {
  Meteor.subscribe('groups');
});

Template.GroupAdd.helpers({
  Groups() {
    return Groups;
  },
  workshopGroups() {
    return Groups.find({ type: 'workshop' }, { sort: { 'name.sv': 1 } });
  },
});

AutoForm.hooks({
  insertGroupForm: {
    onSubmit: function (doc) {
      doc.createdAt = new Date();
      const parent = document.querySelector('.parentGroupSelect')?.value;
      if (parent) doc.parentGroupId = parent;
      Groups.insert(doc, (err, id) => {
        if (err) {
          alert('Insert failed: ' + err.message);
          this.done(err);
          return;
        }
        this.done();
        FlowRouter.go(`/group/${id}`);
      });
      return false;
    },
  },
});
