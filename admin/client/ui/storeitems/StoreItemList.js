import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import '/imports/tabular/storeItems';

import './StoreItemList.html';

Template.StoreItemList.onCreated(function () {
  Meteor.subscribe('storeItems');
});

Template.StoreItemList.events({
  'click .storeItemList tbody tr': function (event) {
    event.preventDefault();
    const dataTable = $(event.target).closest('table').DataTable();
    const rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return;
    FlowRouter.go(`/storeitem/${rowData._id}`);
  },
});
