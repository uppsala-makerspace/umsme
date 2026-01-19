import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Certificates } from '/imports/common/collections/certificates';
import { Attestations } from '/imports/common/collections/attestations';
import { Members } from '/imports/common/collections/members';
import '/imports/tabular/members';
import '/imports/tabular/attestations';
import './CertificateView.html';

Template.CertificateView.onCreated(function() {
  Meteor.subscribe('certificates');
  Meteor.subscribe('attestations');
  Meteor.subscribe('members');
  this.showAttestationForm = new ReactiveVar(false);
  this.selectedMemberId = new ReactiveVar(null);
  this.showCertifierSelector = new ReactiveVar(false);
  this.selectedCertifierId = new ReactiveVar(null);
  this.showAttestationCertifierSelector = new ReactiveVar(false);

  // Set default certifier to current user's member record
  this.autorun(() => {
    const currentUser = Meteor.user();
    if (currentUser && currentUser.emails && currentUser.emails[0]) {
      const certifier = Members.findOne({ email: currentUser.emails[0].address });
      if (certifier && !this.selectedCertifierId.get()) {
        this.selectedCertifierId.set(certifier._id);
      }
    }
  });
});

Template.CertificateView.helpers({
  Certificates() {
    return Certificates;
  },
  Attestations() {
    return Attestations;
  },
  id() {
    return FlowRouter.getParam('_id');
  },
  certificate() {
    const id = FlowRouter.getParam('_id');
    return Certificates.findOne(id);
  },
  showAttestationForm() {
    return Template.instance().showAttestationForm.get();
  },
  selectedMemberId() {
    return Template.instance().selectedMemberId.get();
  },
  selectedMember() {
    const memberId = Template.instance().selectedMemberId.get();
    if (memberId) {
      return Members.findOne(memberId);
    }
    return null;
  },
  defaultStartDate() {
    return new Date();
  },
  defaultEndDate() {
    const cert = Certificates.findOne(FlowRouter.getParam('_id'));
    if (cert && cert.defaultValidityDays) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + cert.defaultValidityDays);
      return endDate;
    }
    return null;
  },
  showCertifierSelector() {
    return Template.instance().showCertifierSelector.get();
  },
  certifiers() {
    const cert = Certificates.findOne(FlowRouter.getParam('_id'));
    if (cert && cert.certifiers && cert.certifiers.length > 0) {
      return cert.certifiers.map(certifierId => {
        const member = Members.findOne(certifierId);
        return {
          _id: certifierId,
          name: member ? member.name : certifierId
        };
      });
    }
    return [];
  },
  hasCertifiers() {
    const cert = Certificates.findOne(FlowRouter.getParam('_id'));
    return cert && cert.certifiers && cert.certifiers.length > 0;
  },
  selectedCertifierId() {
    return Template.instance().selectedCertifierId.get();
  },
  selectedCertifier() {
    const certifierId = Template.instance().selectedCertifierId.get();
    if (certifierId) {
      return Members.findOne(certifierId);
    }
    return null;
  },
  showAttestationCertifierSelector() {
    return Template.instance().showAttestationCertifierSelector.get();
  },
  canMarkMandatory() {
    const existingMandatory = Certificates.findOne({ mandatory: true });
    return !existingMandatory;
  },
  attestationSelector() {
    return { certificateId: FlowRouter.getParam('_id') };
  }
});

Template.CertificateView.events({
  'click .deleteCertificate': function (event) {
    if (confirm('Delete this certificate? All attestations for this certificate will remain but be orphaned.')) {
      const id = FlowRouter.getParam('_id');
      Certificates.remove(id);
      FlowRouter.go('/certificates');
    }
  },
  'click .showAttestationForm': function (event, template) {
    template.showAttestationForm.set(true);
    template.selectedMemberId.set(null);
    template.showAttestationCertifierSelector.set(false);
    // Reset certifier to current user
    const currentUser = Meteor.user();
    if (currentUser && currentUser.emails && currentUser.emails[0]) {
      const certifier = Members.findOne({ email: currentUser.emails[0].address });
      if (certifier) {
        template.selectedCertifierId.set(certifier._id);
      } else {
        template.selectedCertifierId.set(null);
      }
    } else {
      template.selectedCertifierId.set(null);
    }
  },
  'click .hideAttestationForm': function (event, template) {
    template.showAttestationForm.set(false);
    template.selectedMemberId.set(null);
    template.selectedCertifierId.set(null);
    template.showAttestationCertifierSelector.set(false);
  },
  'click .memberList tbody tr': function (event, template) {
    if (event.target.nodeName !== 'A') {
      event.preventDefault();
      const dataTable = $(event.target).closest('table').DataTable();
      const rowData = dataTable.row(event.currentTarget).data();
      if (!rowData) return;
      template.selectedMemberId.set(rowData._id);
    }
  },
  'click .clearSelectedMember': function (event, template) {
    template.selectedMemberId.set(null);
  },
  'click .showAttestationCertifierSelector': function (event, template) {
    template.showAttestationCertifierSelector.set(true);
  },
  'click .hideAttestationCertifierSelector': function (event, template) {
    template.showAttestationCertifierSelector.set(false);
  },
  'click .attestationCertifierList tbody tr': function (event, template) {
    if (event.target.nodeName !== 'A') {
      event.preventDefault();
      const dataTable = $(event.target).closest('table').DataTable();
      const rowData = dataTable.row(event.currentTarget).data();
      if (!rowData) return;
      template.selectedCertifierId.set(rowData._id);
      template.showAttestationCertifierSelector.set(false);
    }
  },
  'click .showCertifierSelector': function (event, template) {
    template.showCertifierSelector.set(true);
  },
  'click .hideCertifierSelector': function (event, template) {
    template.showCertifierSelector.set(false);
  },
  'click .certifierList tbody tr': function (event, template) {
    if (event.target.nodeName !== 'A') {
      event.preventDefault();
      const dataTable = $(event.target).closest('table').DataTable();
      const rowData = dataTable.row(event.currentTarget).data();
      if (!rowData) return;

      const certId = FlowRouter.getParam('_id');
      const cert = Certificates.findOne(certId);
      const currentCertifiers = cert.certifiers || [];

      if (!currentCertifiers.includes(rowData._id)) {
        Certificates.update(certId, { $push: { certifiers: rowData._id } });
      }
      template.showCertifierSelector.set(false);
    }
  },
  'click .removeCertifier': function (event) {
    const certifierId = event.currentTarget.dataset.id;
    const certId = FlowRouter.getParam('_id');
    Certificates.update(certId, { $pull: { certifiers: certifierId } });
  },
  'click .attestationList .revokeAttestation': function (event) {
    const attestationId = event.currentTarget.dataset.id;
    if (confirm('Revoke this attestation?')) {
      Attestations.remove(attestationId);
    }
  },
  'click .markMandatory': function (event) {
    if (confirm('Mark this certificate as mandatory for membership? This action cannot be undone.')) {
      const certId = FlowRouter.getParam('_id');
      Certificates.update(certId, { $set: { mandatory: true } }, (error) => {
        if (error) {
          alert('Error marking certificate as mandatory: ' + error.message);
          console.error(error);
        }
      });
    }
  }
});

// Store template instance for access in AutoForm hooks
let certificateViewInstance = null;

Template.CertificateView.onRendered(function() {
  certificateViewInstance = this;
});

Template.CertificateView.onDestroyed(function() {
  certificateViewInstance = null;
});

AutoForm.hooks({
  certificateViewForm: {
    endSubmit: function (doc) {
      FlowRouter.go('/certificates');
    }
  },
  grantAttestationForm: {
    beginSubmit: function() {
      this.insertDoc.certificateId = FlowRouter.getParam('_id');

      if (certificateViewInstance) {
        this.insertDoc.memberId = certificateViewInstance.selectedMemberId.get();
        this.insertDoc.certifierId = certificateViewInstance.selectedCertifierId.get();
      }

      if (!this.insertDoc.certifierId) {
        alert('Please select a certifier.');
      }

      // Calculate default end date if certificate has defaultValidityDays
      const cert = Certificates.findOne(this.insertDoc.certificateId);
      if (cert && cert.defaultValidityDays && !this.insertDoc.endDate) {
        const endDate = new Date(this.insertDoc.startDate);
        endDate.setDate(endDate.getDate() + cert.defaultValidityDays);
        this.insertDoc.endDate = endDate;
      }
    },
    onSubmit: function (doc) {
      Attestations.insert(doc);
      this.done();
      if (certificateViewInstance) {
        certificateViewInstance.showAttestationForm.set(false);
        certificateViewInstance.selectedMemberId.set(null);
        certificateViewInstance.selectedCertifierId.set(null);
      }
      return false;
    }
  }
});
