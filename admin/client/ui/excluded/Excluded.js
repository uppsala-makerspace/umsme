import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import '/imports/tabular/members';
import './Excluded.html';

Template.Excluded.onCreated(function () {
  this.subscribe('members');
});

Template.Excluded.helpers({
  selector() {
    return { excluded: true };
  },
});

Template.Excluded.events({
  'click .memberList tbody tr'(event) {
    if (event.target.nodeName !== 'A') {
      event.preventDefault();
      const dataTable = $(event.target).closest('table').DataTable();
      const rowData = dataTable.row(event.currentTarget).data();
      if (!rowData) return;
      FlowRouter.go(`/member/${rowData._id}`);
    }
  },
});
