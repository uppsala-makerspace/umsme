import { Template } from 'meteor/templating';
import { Members } from '../../../collections/members.js';

import './MemberAdd.html';

Template.MemberAdd.helpers({
  Members() {
    return Members;
  }
});

AutoForm.hooks({
  insertMemberForm: {
    beginSubmit: function() {
      let id;
      do {
        id = "" + Math.floor(Math.random()*100000);
      } while (Members.findOne({mid: id}) != null);
      this.insertDoc.mid = id;
    },
    onSubmit: function (doc) {
      Members.insert(doc);
      this.done();
      FlowRouter.go('/members');
      return false;
    }
  }
});