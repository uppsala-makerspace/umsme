import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { LiabilityDocuments } from '/imports/common/collections/liabilityDocuments';
import './LiabilityDocumentAdd.html';

Template.LiabilityDocumentAdd.onCreated(function() {
  Meteor.subscribe('liabilityDocuments');
});

Template.LiabilityDocumentAdd.helpers({
  LiabilityDocuments() {
    return LiabilityDocuments;
  }
});

AutoForm.hooks({
  insertLiabilityDocumentForm: {
    onSubmit: function (doc) {
      LiabilityDocuments.insert(doc);
      this.done();
      FlowRouter.go('/liability');
      return false;
    }
  }
});
