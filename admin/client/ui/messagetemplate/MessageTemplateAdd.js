import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { MessageTemplates } from '/imports/common/collections/templates.js';
import { testTemplates } from './templateTesting';
import './MessageTemplateAdd.html';
import './MessageTemplateDocumentation.html';

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

Template.MessageTemplateAdd.onCreated(function () {
  Meteor.subscribe('templates');
  clearTestResult();
});

Template.MessageTemplateAdd.helpers({
  MessageTemplates() {
    return MessageTemplates;
  },
  testResult() {
    return testResult.get();
  },
  testResultClass() {
    return testHasError.get() ? 'danger' : 'success';
  },
});

const currentValues = () => {
  try {
    return AutoForm.getFormValues('insertTemplateForm')?.insertDoc ?? {};
  } catch (_) {
    return {};
  }
};

Template.MessageTemplateAdd.events({
  'click .testTemplates': function (event) {
    event.preventDefault();
    setTestResult(testTemplates(currentValues()));
  },
});

AutoForm.hooks({
  insertTemplateForm: {
    beginSubmit: function () {
      this.insertDoc.created = new Date();
      this.insertDoc.modified = new Date();
      this.insertDoc.deprecated = false;
    },
    // Validate before inserting. If any template field fails to compile,
    // surface the error inline and refuse to create the document.
    onSubmit: function (doc) {
      const result = testTemplates(doc);
      if (result.hasError) {
        setTestResult(result);
        // Pass an error so AutoForm re-enables the submit button but keeps
        // the user's form values intact (this.done() with no arg resets the
        // form). Our onError hook below swallows AutoForm's default error
        // notification — the inline test-result panel is the source of truth.
        this.done(new Error(result.message));
        return false;
      }
      MessageTemplates.insert(doc);
      this.done();
      FlowRouter.go('/templates');
      return false;
    },
    // Validation failures pass an Error to this.done() above. Suppress
    // AutoForm's default error UI — the inline test-result panel already
    // shows the message — but keep a console log for debugging.
    onError: function (operation, error) {
      console.warn('[MessageTemplateAdd]', operation, error?.message);
    },
  },
});
