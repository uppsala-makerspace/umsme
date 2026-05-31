import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Certificates } from '/imports/common/collections/certificates';
import { Attestations } from '/imports/common/collections/attestations';
import { Members } from '/imports/common/collections/members';
import { wouldCreateCycle } from '/imports/common/lib/rules';
import '/imports/tabular/members';
import '/imports/tabular/attestations';
import '/imports/tabular/certificates';
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
  this.showPrerequisiteSelector = new ReactiveVar(false);
  this.availableTests = new ReactiveVar([]);
  Meteor.call('tests.getIndex', (err, res) => {
    if (err) {
      console.error('tests.getIndex failed', err);
      return;
    }
    this.availableTests.set(res || []);
  });

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
  showPrerequisiteSelector() {
    return Template.instance().showPrerequisiteSelector.get();
  },
  prerequisites() {
    const cert = Certificates.findOne(FlowRouter.getParam('_id'));
    if (cert && cert.prerequisites && cert.prerequisites.length > 0) {
      return cert.prerequisites.map(prereqId => {
        const prereq = Certificates.findOne(prereqId);
        return {
          _id: prereqId,
          name: prereq ? (prereq.name.sv || prereq.name.en || prereqId) : prereqId,
        };
      });
    }
    return [];
  },
  hasPrerequisites() {
    const cert = Certificates.findOne(FlowRouter.getParam('_id'));
    return cert && cert.prerequisites && cert.prerequisites.length > 0;
  },
  prerequisiteSelector() {
    const certId = FlowRouter.getParam('_id');
    const cert = Certificates.findOne(certId);
    const certificatesById = {};
    Certificates.find().forEach(c => { certificatesById[c._id] = c; });
    const excluded = new Set([certId, ...((cert && cert.prerequisites) || [])]);
    for (const candidateId of Object.keys(certificatesById)) {
      if (wouldCreateCycle(certId, candidateId, certificatesById)) {
        excluded.add(candidateId);
      }
    }
    return { _id: { $nin: Array.from(excluded) } };
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
  },
  availableTests() {
    return Template.instance().availableTests.get().map(t => ({
      testId: t.testId,
      categoryCount: t.categories.length,
    }));
  },
  selectedAttr(testId) {
    const cert = Certificates.findOne(FlowRouter.getParam('_id'));
    return cert?.test?.testId === testId ? 'selected' : '';
  },
  currentMaxAttempts() {
    const cert = Certificates.findOne(FlowRouter.getParam('_id'));
    return cert?.test?.maxAttempts || 3;
  },
  currentMaxErrors() {
    const cert = Certificates.findOne(FlowRouter.getParam('_id'));
    return cert?.test?.maxErrors ?? 1;
  },
  rfidEndpointUrl() {
    const id = FlowRouter.getParam('_id');
    return `/api/certificates/${id}/rfid`;
  },
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
  'click .showPrerequisiteSelector': function (event, template) {
    template.showPrerequisiteSelector.set(true);
  },
  'click .hidePrerequisiteSelector': function (event, template) {
    template.showPrerequisiteSelector.set(false);
  },
  'click .prerequisiteList tbody tr': function (event, template) {
    if (event.target.nodeName !== 'A') {
      event.preventDefault();
      const dataTable = $(event.target).closest('table').DataTable();
      const rowData = dataTable.row(event.currentTarget).data();
      if (!rowData) return;

      const certId = FlowRouter.getParam('_id');
      if (rowData._id === certId) {
        alert('A certificate cannot depend on itself.');
        return;
      }
      const certificatesById = {};
      Certificates.find().forEach(c => { certificatesById[c._id] = c; });
      if (wouldCreateCycle(certId, rowData._id, certificatesById)) {
        alert('Adding this prerequisite would create a dependency cycle.');
        return;
      }
      const cert = Certificates.findOne(certId);
      const current = (cert && cert.prerequisites) || [];
      if (!current.includes(rowData._id)) {
        Certificates.update(certId, { $push: { prerequisites: rowData._id } });
      }
      template.showPrerequisiteSelector.set(false);
    }
  },
  'click .removePrerequisite': function (event) {
    const prereqId = event.currentTarget.dataset.id;
    const certId = FlowRouter.getParam('_id');
    Certificates.update(certId, { $pull: { prerequisites: prereqId } });
  },
  'click .attestationList .revokeAttestation': function (event) {
    const attestationId = event.currentTarget.dataset.id;
    if (confirm('Revoke this attestation?')) {
      Attestations.remove(attestationId);
    }
  },
  'click .saveTestSettings': function (event, template) {
    const certId = FlowRouter.getParam('_id');
    const root = template.find('.testSettingsForm');
    const testId = root.querySelector('.testId').value;
    const maxAttempts = parseInt(root.querySelector('.maxAttempts').value, 10);
    const maxErrors = parseInt(root.querySelector('.maxErrors').value, 10);
    if (!testId) {
      alert('Select a test id (or use Clear to remove test settings).');
      return;
    }
    if (!(maxAttempts >= 1)) {
      alert('Max attempts must be at least 1.');
      return;
    }
    if (!(maxErrors >= 0)) {
      alert('Max errors must be 0 or greater.');
      return;
    }
    Certificates.update(certId, {
      $set: { test: { testId, maxAttempts, maxErrors } },
    }, (err) => {
      if (err) alert('Save failed: ' + err.message);
    });
  },
  'click .clearTestSettings': function (event) {
    if (!confirm('Remove test settings from this certificate?')) return;
    const certId = FlowRouter.getParam('_id');
    Certificates.update(certId, { $unset: { test: '' } }, (err) => {
      if (err) alert('Clear failed: ' + err.message);
    });
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
