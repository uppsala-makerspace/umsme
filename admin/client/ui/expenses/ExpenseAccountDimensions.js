import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import './ExpenseAccountDimensions.html';

// Renders one free-text object field per configured accounting dimension, with a
// native <datalist> typeahead drawn from the object values already used on other
// expense accounts for the same dimension. Used by the add and edit forms; the
// values are read back from the DOM (.js-dim-input) by their AutoForm hooks.
export const readDimensionInputs = () => {
  const dims = {};
  document.querySelectorAll('.js-dim-input').forEach((el) => {
    const nr = el.getAttribute('data-dim');
    // Object codes become SIE #OBJEKT keys, so strip quotes and trim.
    const val = (el.value || '').replace(/["']/g, '').trim();
    if (nr && val) dims[nr] = val;
  });
  return dims;
};

Template.expenseAccountDimensions.onCreated(function () {
  this.config = new ReactiveVar(null);
  Meteor.subscribe('expenseAccounts');
  Meteor.call('accounting.config', (err, res) => {
    if (!err) this.config.set(res);
  });
});

Template.expenseAccountDimensions.helpers({
  ready() {
    return !!Template.instance().config.get();
  },
  dims() {
    const cfg = Template.instance().config.get();
    if (!cfg) return [];
    const account = Template.currentData()?.account;
    const existing = ExpenseAccounts.find().fetch();
    return (cfg.dimensions || []).map((d) => {
      const nr = String(d.nr);
      const suggestions = [
        ...new Set(existing.map((a) => a.dimensions && a.dimensions[nr]).filter(Boolean)),
      ].sort();
      return {
        nr,
        name: d.name,
        value: (account && account.dimensions && account.dimensions[nr]) || '',
        suggestions,
      };
    });
  },
});
