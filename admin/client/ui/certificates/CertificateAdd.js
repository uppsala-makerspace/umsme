import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Certificates } from '/imports/common/collections/certificates';
import './CertificateAdd.html';

Template.CertificateAdd.onCreated(function() {
  Meteor.subscribe('certificates');
});

Template.CertificateAdd.helpers({
  Certificates() {
    return Certificates;
  }
});

AutoForm.hooks({
  insertCertificateForm: {
    onSubmit: function (doc) {
      Certificates.insert(doc);
      this.done();
      FlowRouter.go('/certificates');
      return false;
    }
  }
});
