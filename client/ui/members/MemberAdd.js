import { Template } from 'meteor/templating';
import { Members } from '/collections/members.js';
import { updateMember } from '/lib/utils';


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
      const infamily = FlowRouter.getQueryParam('infamily');
      if (infamily) {
        this.insertDoc.infamily = infamily;
      }
    },
    onSubmit: function (doc) {
      const id = Members.insert(doc);
      const mb = Members.findOne(id);
      updateMember(mb);
      this.done();
      const infamily = FlowRouter.getQueryParam('infamily');
      if (infamily) {
        FlowRouter.go(`/member/${infamily}`);
      } else {
        FlowRouter.go('/members');
      }
      return false;
    }
  }
});