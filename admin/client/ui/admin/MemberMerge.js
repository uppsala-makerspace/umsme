import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import './MemberMerge.html';

Template.MemberMerge.onCreated(function () {
  this.plan = new ReactiveVar(null);
  this.done = new ReactiveVar(null);
  this.error = new ReactiveVar(null);
  this.busy = new ReactiveVar(false);
  this.confirming = new ReactiveVar(false);
  this.mids = new ReactiveVar({ sourceMid: '', destMid: '' });
});

Template.MemberMerge.helpers({
  plan() {
    const plan = Template.instance().plan.get();
    if (!plan) return null;
    return {
      ...plan,
      sides: [
        { title: 'Source', member: plan.source },
        { title: 'Destination', member: plan.dest },
      ],
    };
  },
  done() { return Template.instance().done.get(); },
  error() { return Template.instance().error.get(); },
  busy() { return Template.instance().busy.get(); },
  confirming() { return Template.instance().confirming.get(); },
  sourceMid() { return Template.instance().mids.get().sourceMid; },
  destMid() { return Template.instance().mids.get().destMid; },
});

const reset = (instance) => {
  instance.plan.set(null);
  instance.error.set(null);
  instance.confirming.set(false);
};

Template.MemberMerge.events({
  'submit .memberMergeForm'(event, instance) {
    event.preventDefault();
    const sourceMid = event.currentTarget.sourceMid.value.trim();
    const destMid = event.currentTarget.destMid.value.trim();
    instance.mids.set({ sourceMid, destMid });
    reset(instance);
    instance.done.set(null);
    if (!sourceMid || !destMid) {
      instance.error.set('Enter both member numbers.');
      return;
    }
    instance.busy.set(true);
    Meteor.call('members.mergePreview', sourceMid, destMid, (err, plan) => {
      instance.busy.set(false);
      if (err) instance.error.set(err.reason || err.message);
      else instance.plan.set(plan);
    });
  },
  'input .memberMergeForm input'(event, instance) {
    // A preview only holds for the numbers it was made for.
    reset(instance);
  },
  'click .startMerge'(event, instance) {
    instance.confirming.set(true);
  },
  'click .cancelMerge'(event, instance) {
    instance.confirming.set(false);
  },
  'click .confirmMerge'(event, instance) {
    const { sourceMid, destMid } = instance.mids.get();
    instance.busy.set(true);
    Meteor.call('members.merge', sourceMid, destMid, (err, plan) => {
      instance.busy.set(false);
      instance.confirming.set(false);
      if (err) {
        instance.error.set(err.reason || err.message);
        return;
      }
      instance.plan.set(null);
      instance.done.set(plan);
    });
  },
});
