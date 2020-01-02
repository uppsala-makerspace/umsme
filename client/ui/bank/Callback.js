import './Callback.html';

Template.Callback.helpers({
  error() {
    return Memberships;
  },
  message() {
    return FlowRouter.getQueryParam('message');
  }
});
