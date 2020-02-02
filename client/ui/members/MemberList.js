import { Template } from 'meteor/templating';
import { Members } from '../../../collections/members.js';
import { models } from '../../../lib/models';
import { fields } from '../../../lib/fields';
import './MemberList.html';

Template.MemberList.helpers({
  settings: {
    collection: Members,
    rowsPerPage: 10,
    showFilter: true,
    fields: fields.member(),
    class: "table table-bordered table-hover",
  }
});

Template.MemberList.events({
  'click .reactive-table tbody tr': function (event) {
    event.preventDefault();
    var post = this;
    FlowRouter.go(`/member/${post._id}`);
    //window.location.href = "/member/"
    //console.log(post.mid);
    // checks if the actual clicked element has the class `delete`
/*    if (event.target.className == "delete") {
      Posts.remove(post._id)
    }*/
  }
});