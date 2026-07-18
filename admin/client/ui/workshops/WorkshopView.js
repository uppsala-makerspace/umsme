import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Workshops } from '/imports/common/collections/workshops';
import { Groups } from '/imports/common/collections/groups';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { Certificates } from '/imports/common/collections/certificates';
import { workshopCompleteness } from '/imports/common/lib/groupRules';
import '../spaces/EntitySpaces';
import './WorkshopView.html';

const workshopId = () => FlowRouter.getParam('_id');

const completeness = () => {
  const workshop = Workshops.findOne(workshopId());
  const group = workshop?.groupId ? Groups.findOne(workshop.groupId) : null;
  const activeMemberCount = group
    ? GroupMemberships.find({ groupId: group._id, state: 'active' }).count()
    : 0;
  return workshopCompleteness(workshop, group, activeMemberCount);
};

Template.WorkshopView.onCreated(function () {
  Meteor.subscribe('workshops');
  Meteor.subscribe('groups');
  Meteor.subscribe('groupMemberships');
  Meteor.subscribe('certificates');
  Meteor.subscribe('spaces');
  this.uploading = new ReactiveVar(false);
});

Template.WorkshopView.helpers({
  Workshops() {
    return Workshops;
  },
  workshopIdValue() {
    return workshopId();
  },
  workshop() {
    return Workshops.findOne(workshopId());
  },
  completeness() {
    return completeness();
  },
  missingList() {
    return completeness().missing.join(', ');
  },
  nameSuffixWarning() {
    return completeness().warnings.includes('nameSuffix');
  },
  isDeletable() {
    const workshop = Workshops.findOne(workshopId());
    if (!workshop) return false;
    if (workshop.imageFileId) return false;
    return !Certificates.findOne({ workshopId: workshopId() });
  },
  imageUrl() {
    const workshop = Workshops.findOne(workshopId());
    if (!workshop?.imageFileId) return '';
    return `/api/workshops/${workshop._id}/image?v=${encodeURIComponent(workshop.imageFileId)}`;
  },
  uploading() {
    return Template.instance().uploading.get();
  },
  uploadingAttr() {
    return Template.instance().uploading.get() ? 'disabled' : '';
  },
  workshopGroups() {
    return Groups.find({ type: 'workshop' }, { sort: { 'name.sv': 1 } });
  },
  group() {
    const workshop = Workshops.findOne(workshopId());
    return workshop?.groupId ? Groups.findOne(workshop.groupId) : null;
  },
  groupSelected(id) {
    return Workshops.findOne(workshopId())?.groupId === id ? 'selected' : '';
  },
  noGroupSelected() {
    return Workshops.findOne(workshopId())?.groupId ? '' : 'selected';
  },
  activeMemberCount() {
    const workshop = Workshops.findOne(workshopId());
    if (!workshop?.groupId) return 0;
    return GroupMemberships.find({ groupId: workshop.groupId, state: 'active' }).count();
  },
  certificates() {
    return Certificates.find({ workshopId: workshopId() }, { sort: { 'name.sv': 1 } });
  },
  hasCertificates() {
    return Certificates.find({ workshopId: workshopId() }).count() > 0;
  },
});

Template.WorkshopView.events({
  'click .deleteWorkshop': function () {
    if (!confirm('Delete this workshop?')) return;
    Workshops.remove(workshopId(), (err) => {
      if (err) {
        alert('Delete failed: ' + err.message);
        return;
      }
      FlowRouter.go('/workshops');
    });
  },
  'click .uploadImage': function (event, template) {
    const input = template.find('.imageFileInput');
    const file = input.files && input.files[0];
    if (!file) {
      alert('Choose an image file first.');
      return;
    }
    template.uploading.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result is a data: URL; the method wants raw base64.
      const base64 = String(reader.result).split(',')[1] || '';
      Meteor.call('adminWorkshops.uploadImage', workshopId(), base64, file.type, (err) => {
        template.uploading.set(false);
        if (err) {
          alert('Upload failed: ' + err.message);
          return;
        }
        input.value = '';
      });
    };
    reader.onerror = () => {
      template.uploading.set(false);
      alert('Could not read the file.');
    };
    reader.readAsDataURL(file);
  },
  'click .removeImage': function () {
    if (!confirm('Remove the workshop image?')) return;
    Meteor.call('adminWorkshops.removeImage', workshopId(), (err) => {
      if (err) alert('Remove failed: ' + err.message);
    });
  },
  'click .saveGroup': function (event, template) {
    const value = template.find('.workshopGroupSelect').value;
    const modifier = value
      ? { $set: { groupId: value } }
      : { $unset: { groupId: '' } };
    Workshops.update(workshopId(), modifier, (err) => {
      if (err) alert('Update failed: ' + err.message);
    });
  },
});
