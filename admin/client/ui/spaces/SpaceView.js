import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Spaces } from '/imports/common/collections/spaces';
import { Workshops } from '/imports/common/collections/workshops';
import { Groups } from '/imports/common/collections/groups';
import './SpaceView.html';
import { parseSlackChannels } from './SpaceAdd';

const spaceId = () => FlowRouter.getParam('_id');

const linkSelector = () => ({
  $or: [{ primarySpaceId: spaceId() }, { secondarySpaceIds: spaceId() }],
});

const withPrimaryFlag = (docs) =>
  docs.map((doc) => ({ ...doc, isPrimary: doc.primarySpaceId === spaceId() }));

Template.SpaceView.onCreated(function () {
  Meteor.subscribe('spaces');
  Meteor.subscribe('workshops');
  Meteor.subscribe('groups');
  this.uploading = new ReactiveVar(false);
});

Template.SpaceView.helpers({
  Spaces() {
    return Spaces;
  },
  space() {
    return Spaces.findOne(spaceId());
  },
  slackChannelsValue() {
    return (Spaces.findOne(spaceId())?.slackChannels || []).join(', ');
  },
  isDeletable() {
    if (Spaces.findOne(spaceId())?.iconFileId) return false;
    return !(Workshops.findOne(linkSelector()) || Groups.findOne(linkSelector()));
  },
  iconUrl() {
    const space = Spaces.findOne(spaceId());
    if (!space?.iconFileId) return '';
    return `/api/spaces/${space._id}/icon?v=${encodeURIComponent(space.iconFileId)}`;
  },
  uploading() {
    return Template.instance().uploading.get();
  },
  uploadingAttr() {
    return Template.instance().uploading.get() ? 'disabled' : '';
  },
  linkedWorkshops() {
    return withPrimaryFlag(Workshops.find(linkSelector()).fetch());
  },
  linkedGroups() {
    return withPrimaryFlag(Groups.find(linkSelector()).fetch());
  },
  hasLinks() {
    return !!(Workshops.findOne(linkSelector()) || Groups.findOne(linkSelector()));
  },
});

Template.SpaceView.events({
  'click .deleteSpace': function () {
    if (!confirm('Delete this space?')) return;
    Spaces.remove(spaceId(), (err) => {
      if (err) {
        alert('Delete failed: ' + err.message);
        return;
      }
      FlowRouter.go('/spaces');
    });
  },
  'click .uploadIcon': function (event, template) {
    const input = template.find('.iconFileInput');
    const file = input.files && input.files[0];
    if (!file) {
      alert('Choose an icon file first.');
      return;
    }
    template.uploading.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result is a data: URL; the method wants raw base64.
      const base64 = String(reader.result).split(',')[1] || '';
      Meteor.call('adminSpaces.uploadIcon', spaceId(), base64, file.type, (err) => {
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
  'click .removeIcon': function () {
    if (!confirm('Remove the space icon?')) return;
    Meteor.call('adminSpaces.removeIcon', spaceId(), (err) => {
      if (err) alert('Remove failed: ' + err.message);
    });
  },
});

AutoForm.hooks({
  editSpaceForm: {
    // Merge the comma-separated Slack channel input into the modifier; unset
    // the array when the field is cleared (pattern: expense account dimensions).
    before: {
      update: function (modifier) {
        const channels = parseSlackChannels(document.querySelector('.slackChannelsInput')?.value);
        if (channels.length) {
          modifier.$set = modifier.$set || {};
          modifier.$set.slackChannels = channels;
        } else {
          modifier.$unset = modifier.$unset || {};
          modifier.$unset.slackChannels = '';
        }
        return modifier;
      },
    },
    onSuccess: function () {
      FlowRouter.go('/spaces');
    },
  },
});
