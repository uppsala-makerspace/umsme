import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { LiabilityDocuments } from '/imports/common/collections/liabilityDocuments';
import './LiabilityDocumentView.html';

Template.LiabilityDocumentView.onCreated(function() {
  Meteor.subscribe('liabilityDocuments');
});

Template.LiabilityDocumentView.helpers({
  LiabilityDocuments() {
    return LiabilityDocuments;
  },
  id() {
    return FlowRouter.getParam('_id');
  },
  liabilityDocument() {
    const id = FlowRouter.getParam('_id');
    return LiabilityDocuments.findOne(id);
  }
});

Template.LiabilityDocumentView.events({
  'click .deleteLiabilityDocument': function (event) {
    if (confirm('Delete this liability document?')) {
      const id = FlowRouter.getParam('_id');
      LiabilityDocuments.remove(id);
      FlowRouter.go('/liability');
    }
  }
});

AutoForm.hooks({
  liabilityDocumentViewForm: {
    endSubmit: function (doc) {
      FlowRouter.go('/liability');
    }
  }
});
