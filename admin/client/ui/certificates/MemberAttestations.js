import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Certificates } from '/imports/common/collections/certificates';
import { Attestations } from '/imports/common/collections/attestations';
import { Members } from '/imports/common/collections/members';
import '/imports/tabular/certificates';
import '/imports/tabular/members';
import '/imports/tabular/attestations';
import './MemberAttestations.html';

Template.MemberAttestations.onCreated(function() {
  Meteor.subscribe('certificates');
  Meteor.subscribe('attestations');
  Meteor.subscribe('members');
  this.showAttestationForm = new ReactiveVar(false);
  this.selectedCertificateId = new ReactiveVar(null);
  this.selectedCertifierId = new ReactiveVar(null);
  this.showCertifierSelector = new ReactiveVar(false);

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

Template.MemberAttestations.helpers({
  Attestations() {
    return Attestations;
  },
  attestationSelector() {
    return { memberId: Template.currentData().member };
  },
  showAttestationForm() {
    return Template.instance().showAttestationForm.get();
  },
  selectedCertificateId() {
    return Template.instance().selectedCertificateId.get();
  },
  selectedCertificate() {
    const certId = Template.instance().selectedCertificateId.get();
    if (certId) {
      return Certificates.findOne(certId);
    }
    return null;
  },
  selectedCertificateName() {
    const certId = Template.instance().selectedCertificateId.get();
    if (certId) {
      const cert = Certificates.findOne(certId);
      if (cert && cert.name) {
        return cert.name.sv || cert.name.en || certId;
      }
    }
    return '';
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
  showCertifierSelector() {
    return Template.instance().showCertifierSelector.get();
  },
  defaultStartDate() {
    return new Date();
  }
});

Template.MemberAttestations.events({
  'click .showAttestationForm': function (event, template) {
    template.showAttestationForm.set(true);
    template.selectedCertificateId.set(null);
    template.showCertifierSelector.set(false);
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
    template.selectedCertificateId.set(null);
    template.selectedCertifierId.set(null);
    template.showCertifierSelector.set(false);
  },
  'click .certificateList tbody tr': function (event, template) {
    if (event.target.nodeName !== 'A') {
      event.preventDefault();
      const dataTable = $(event.target).closest('table').DataTable();
      const rowData = dataTable.row(event.currentTarget).data();
      if (!rowData) return;
      template.selectedCertificateId.set(rowData._id);
    }
  },
  'click .clearSelectedCertificate': function (event, template) {
    template.selectedCertificateId.set(null);
  },
  'click .showCertifierSelector': function (event, template) {
    template.showCertifierSelector.set(true);
  },
  'click .hideCertifierSelector': function (event, template) {
    template.showCertifierSelector.set(false);
  },
  'click .certifierMemberList tbody tr': function (event, template) {
    if (event.target.nodeName !== 'A') {
      event.preventDefault();
      const dataTable = $(event.target).closest('table').DataTable();
      const rowData = dataTable.row(event.currentTarget).data();
      if (!rowData) return;
      template.selectedCertifierId.set(rowData._id);
      template.showCertifierSelector.set(false);
    }
  },
  'click .memberAttestationList .revokeAttestation': function (event) {
    const attestationId = event.currentTarget.dataset.id;
    if (confirm('Revoke this attestation?')) {
      Attestations.remove(attestationId);
    }
  }
});

// Store template instance for access in AutoForm hooks
let memberAttestationsInstance = null;

Template.MemberAttestations.onRendered(function() {
  memberAttestationsInstance = this;
});

Template.MemberAttestations.onDestroyed(function() {
  memberAttestationsInstance = null;
});

AutoForm.hooks({
  grantMemberAttestationForm: {
    beginSubmit: function() {
      if (memberAttestationsInstance) {
        this.insertDoc.memberId = memberAttestationsInstance.data.member;
        this.insertDoc.certificateId = memberAttestationsInstance.selectedCertificateId.get();
        this.insertDoc.certifierId = memberAttestationsInstance.selectedCertifierId.get();
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
      if (memberAttestationsInstance) {
        memberAttestationsInstance.showAttestationForm.set(false);
        memberAttestationsInstance.selectedCertificateId.set(null);
        memberAttestationsInstance.selectedCertifierId.set(null);
      }
      return false;
    }
  }
});
