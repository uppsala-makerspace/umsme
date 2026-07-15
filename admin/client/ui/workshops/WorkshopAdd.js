import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Workshops } from '/imports/common/collections/workshops';
import { Groups } from '/imports/common/collections/groups';
import './WorkshopAdd.html';

Template.WorkshopAdd.onCreated(function () {
  Meteor.subscribe('workshops');
  Meteor.subscribe('groups');
});

Template.WorkshopAdd.helpers({
  Workshops() {
    return Workshops;
  },
  workshopGroups() {
    return Groups.find({ type: 'workshop' }, { sort: { 'name.sv': 1 } });
  },
});

AutoForm.hooks({
  insertWorkshopForm: {
    onSubmit: function (doc) {
      doc.createdAt = new Date();
      const group = document.querySelector('.workshopGroupSelect')?.value;
      if (group) doc.groupId = group;
      Workshops.insert(doc, (err, id) => {
        if (err) {
          alert('Insert failed: ' + err.message);
          this.done(err);
          return;
        }
        this.done();
        FlowRouter.go(`/workshop/${id}`);
      });
      return false;
    },
  },
});
