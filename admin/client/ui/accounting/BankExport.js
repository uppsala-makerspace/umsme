import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import './BankExport.html';

// The generated files carry exact encodings (SIE = CP437, remaining CSV =
// CP1252), so downloads must be built from raw bytes — a UTF-8 data URI would
// corrupt them. Base64 → Uint8Array → Blob keeps them byte-exact.
const downloadBase64 = (base64, filename) => {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

Template.BankExport.onCreated(function () {
  this.result = new ReactiveVar(null);
  this.error = new ReactiveVar(null);
  this.busy = new ReactiveVar(false);
});

Template.BankExport.helpers({
  result() {
    return Template.instance().result.get();
  },
  error() {
    return Template.instance().error.get();
  },
  busy() {
    return Template.instance().busy.get();
  },
});

Template.BankExport.events({
  'change .bankFile': function (event, instance) {
    const file = event.target.files?.[0];
    if (!file) return;
    instance.result.set(null);
    instance.error.set(null);
    instance.busy.set(true);
    const reader = new FileReader();
    reader.onerror = () => {
      instance.busy.set(false);
      instance.error.set('Could not read the file.');
    };
    reader.onload = () => {
      const base64 = String(reader.result).split(',')[1] || '';
      Meteor.call('accounting.processBankFile', base64, (err, res) => {
        instance.busy.set(false);
        if (err) {
          instance.error.set(err.reason || err.message);
          return;
        }
        instance.result.set(res);
      });
    };
    reader.readAsDataURL(file);
  },
  'click .downloadSie': function (event, instance) {
    const res = instance.result.get();
    if (res) downloadBase64(res.sieBase64, res.suggestedNames.sie);
  },
  'click .downloadRemaining': function (event, instance) {
    const res = instance.result.get();
    if (res) downloadBase64(res.remainingCsvBase64, res.suggestedNames.remaining);
  },
});
