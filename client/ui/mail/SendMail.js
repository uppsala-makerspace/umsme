import { Template } from 'meteor/templating';
import { Members } from '/collections/members';
import { Memberships } from '/collections/memberships';
import { Mails } from '/collections/mails';
import { models} from "/lib/models";
import { memberStatus } from '/lib/utils';
import { _ } from 'underscore';
import './SendMail.html';


Template.SendMail.onCreated(function() {
  Meteor.subscribe('members');
  Meteor.subscribe('memberships');
  Meteor.subscribe('mails');
  this.state = new ReactiveDict();
  this.state.set('from', false);
  models.getFromOptions(() => {
    this.state.set('from', true);
  });
});

const niceDate = (date) => {
  if (date) {
    return moment(date).format("YYYY-MM-DD");
  }
  return '';
};

Template.SendMail.helpers({
  Mails() {
    return Mails;
  },
  message() {
    return {}
  },
  from() {
    const state = Template.instance().state;
    return state.get('from');
  }
});

const check = (status, recipients) => {
  const now = new Date();
  const currentyear = new Date();
  currentyear.setMonth(1);
  currentyear.setDate(1);
  const lastyear = new Date();
  lastyear.setFullYear(lastyear.getFullYear()-1);
  switch (recipients) {
    case 'members':
      return status.member > now;
    case 'labmembers':
      return status.lab > now;
    case 'yearmembers':
      return status.member > currentyear;
    case 'recentmembers':
      return status.member > lastyear;
  }
};

AutoForm.hooks({
  insertMailForm: {
    beginSubmit: function() {
      const insdoc = this.insertDoc;
      insdoc.senddate = new Date();
      insdoc.to = [];
    },
    onSubmit: function (doc) {
      const subjectTemplate = _.template(doc.subject);
      const messageTemplate = _.template(doc.template);

      // Send message as mail to all matching users.
      const users = Members.find().forEach(member => {
        const status = memberStatus(member);
        if (member.email && check(status, doc.recipients)) {
          if (!doc.family && member.infamily) {
            return;
          }
          doc.to.push(`${member.name} <${member.email}>`);
          let familyMembers = [];
          Members.find({ infamily: member._id }).forEach((m) => familyMembers.push(m.name));
          familyMembers = familyMembers.join(', ');
          const data = {
            name: member.name,
            email: member.email,
            family: member.family === true,
            familyMembers,
            youth: member.youth === true,
            liability: member.liability === true,
            memberStartDate: niceDate(status.memberStart),
            memberEndDate: niceDate(member.member),
            labStartDate: niceDate(status.labStart),
            labEndDate: niceDate(member.lab),
          };
          Meteor.call('mail', member.email, subjectTemplate(data), messageTemplate(data), doc.from);
        }
      });
      Mails.insert(doc);
      this.done();
      FlowRouter.go(`/mail`);
      return false;
    }
  }
});