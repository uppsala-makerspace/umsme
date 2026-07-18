import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Spaces } from '/imports/common/collections/spaces';
import './SpaceAdd.html';

// Comma-separated input -> array of trimmed channel names.
export const parseSlackChannels = (value) =>
  (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

Template.SpaceAdd.onCreated(function () {
  Meteor.subscribe('spaces');
});

Template.SpaceAdd.helpers({
  Spaces() {
    return Spaces;
  },
});

AutoForm.hooks({
  insertSpaceForm: {
    onSubmit: function (doc) {
      doc.createdAt = new Date();
      const channels = parseSlackChannels(document.querySelector('.slackChannelsInput')?.value);
      if (channels.length) doc.slackChannels = channels;
      Spaces.insert(doc, (err, id) => {
        if (err) {
          alert('Insert failed: ' + err.message);
          this.done(err);
          return;
        }
        this.done();
        FlowRouter.go(`/space/${id}`);
      });
      return false;
    },
  },
});
