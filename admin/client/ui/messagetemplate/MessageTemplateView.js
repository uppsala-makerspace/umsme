import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { template as _template } from 'underscore';
import { MessageTemplates } from '/imports/common/collections/templates';
import './MessageTemplateDocumentation.html';
import './MessageTemplateView.html';
import '../comment/CommentList';

// Mirrors every variable surfaced by common/lib/message.js → messageData().
// Used by the "Test templates" button so the admin can render the template
// with realistic-looking data without sending a real message.
const SAMPLE_DATA = {
  id: 'sample-id',
  mid: 'M-001',
  name: 'Sample Member',
  email: 'sample@example.com',
  family: false,
  familyMembers: '',
  youth: false,
  liability: true,
  pending: false,
  memberStartDate: '2025-05-11',
  memberEndDate: '2026-05-11',
  labStartDate: '2025-05-11',
  labEndDate: '2026-05-11',
  amount: 1600,
  type: 'lab',
  discount: false,
  startPeriod: '2026-05-11',
  endMemberPeriod: '2027-05-11',
  endLabPeriod: '2027-05-11',
};

Template.MessageTemplateView.onCreated(function() {
  Meteor.subscribe('templates');
  this.testResult = new ReactiveVar(null);
  this.testHasError = new ReactiveVar(false);
});

Template.MessageTemplateView.helpers({
  MessageTemplates() {
    return MessageTemplates;
  },
  id() {
    return FlowRouter.getParam('_id');
  },
  messageTemplate() {
    const id = FlowRouter.getParam('_id');
    return MessageTemplates.findOne(id);
  },
  testResult() {
    return Template.instance().testResult.get();
  },
  testResultClass() {
    return Template.instance().testHasError.get() ? 'danger' : 'success';
  },
});

// Read the current form values from AutoForm so the test reflects unsaved
// edits, falling back to the saved doc if the form isn't queryable yet.
const currentValues = () => {
  const id = FlowRouter.getParam('_id');
  const saved = MessageTemplates.findOne(id) ?? {};
  let live = null;
  try {
    live = AutoForm.getFormValues('messageTemplateViewForm')?.insertDoc ?? null;
  } catch (_) {
    // AutoForm not ready — fall through to saved values.
  }
  return { ...saved, ...(live ?? {}) };
};

Template.MessageTemplateView.events({
  'click .deleteTemplate': function (event) {
    if (confirm('Delete this message template')) {
      const id = FlowRouter.getParam('_id');
      MessageTemplates.remove(id);
      FlowRouter.go(`/templates`);
    }
  },
  'click .testTemplates': function (event, instance) {
    event.preventDefault();
    const doc = currentValues();
    const errors = [];
    const renders = [];
    for (const field of ['subject', 'messagetext', 'sms']) {
      const src = doc[field];
      if (!src) continue;
      try {
        const out = _template(src)(SAMPLE_DATA);
        renders.push(`--- ${field} ---\n${out}`);
      } catch (err) {
        errors.push(`${field}: ${err.message}`);
      }
    }
    if (errors.length) {
      instance.testHasError.set(true);
      instance.testResult.set(`Errors:\n\n${errors.join('\n\n')}`);
    } else if (renders.length === 0) {
      instance.testHasError.set(true);
      instance.testResult.set('No template fields are set — nothing to test.');
    } else {
      instance.testHasError.set(false);
      instance.testResult.set(`All templates rendered with sample data.\n\n${renders.join('\n\n')}`);
    }
  },
});

AutoForm.hooks({
  messageTemplateViewForm: {
    beginSubmit: function() {
      this.updateDoc.$set.modified = new Date();
    },

    endSubmit: function (doc) {
      FlowRouter.go('/templates');
    }
  }
});