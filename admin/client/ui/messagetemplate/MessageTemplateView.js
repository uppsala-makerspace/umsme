import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { MessageTemplates } from '/imports/common/collections/templates';
import { testTemplates } from './templateTesting';
import './MessageTemplateDocumentation.html';
import './MessageTemplateView.html';
import '../comment/CommentList';

// Module-level reactive state for the inline test-result panel. Cleared on
// every onCreated so navigating away and back doesn't leak the prior result.
const testResult = new ReactiveVar(null);
const testHasError = new ReactiveVar(false);

const setTestResult = ({ hasError, message }) => {
  testHasError.set(hasError);
  testResult.set(message);
};

const clearTestResult = () => {
  testHasError.set(false);
  testResult.set(null);
};

Template.MessageTemplateView.onCreated(function() {
  Meteor.subscribe('templates');
  clearTestResult();
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
    return testResult.get();
  },
  testResultClass() {
    return testHasError.get() ? 'danger' : 'success';
  },
});

// Pull the current form values from quickForm if available, falling back to
// the saved doc — so the test reflects unsaved edits.
const currentValues = () => {
  const id = FlowRouter.getParam('_id');
  const saved = MessageTemplates.findOne(id) ?? {};
  let live = null;
  try {
    live = AutoForm.getFormValues('messageTemplateViewForm')?.insertDoc ?? null;
  } catch (_) {
    // AutoForm not ready yet — fall through to the saved doc.
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
  'click .testTemplates': function (event) {
    event.preventDefault();
    setTestResult(testTemplates(currentValues()));
  },
});

AutoForm.hooks({
  messageTemplateViewForm: {
    // Validate before the update runs. If any template field fails to
    // compile, surface the error inline and cancel the save.
    before: {
      update: function (modifier) {
        const result = testTemplates(currentValues());
        if (result.hasError) {
          setTestResult(result);
          this.result(false);
          return;
        }
        return modifier;
      },
    },
    beginSubmit: function () {
      this.updateDoc.$set.modified = new Date();
    },
    // Navigate away only on a successful save — endSubmit fires even when
    // before.update cancels, so using it here would leave the page after a
    // failed validation, hiding the inline error.
    onSuccess: function () {
      FlowRouter.go('/templates');
    },
  },
});
