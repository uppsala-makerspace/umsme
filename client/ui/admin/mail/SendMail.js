import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Members } from '/collections/members';
import { Mails } from '/collections/mails';
import { models} from "/lib/models";
import { memberStatus } from '/lib/utils';
import { template } from 'underscore';
import './SendMail.html';
import './Recipients';

const getRecipients = async function(reciever, family) {
  const arr = [];
  const  members = await Members.find().fetchAsync();
  for (let i=0;i<members.length;i++) {
    const member = members[i];
    const status = await memberStatus(member);
    if (member.email && check(status, reciever)) {
      if (!family && member.infamily) {
        continue;
      }
      let familyMembers = [];
      await Members.find({infamily: member._id}).forEachAsync((m) => familyMembers.push(m.name));
      familyMembers = familyMembers.join(', ');
      arr.push({
        to: `${member.name} <${member.email}>`,
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
      });
    }
  }
  return arr;
}

let rememberState;
let family;
let recip;

const noFrom = 'You must provide a from address!';
const noSubject = 'You must provide a message subject!';
const noText = 'You must provide some message text!';

Template.SendMail.onCreated(function() {
  Meteor.subscribe('members');
  Meteor.subscribe('memberships');
  Meteor.subscribe('mails');
  this.state = new ReactiveDict();
  rememberState = this.state;
  this.state.set('fromOptions', false);
  this.state.set('tomanual', false);
  this.state.set('message', noFrom);
  models.getFromOptions(() => {
    this.state.set('fromOptions', true);
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
  mail() {
    return {
      recipients: 'members'
    };
  },
  tomanual() {
    const state = Template.instance().state;
    return state.get('tomanual');
  },
  async tosrcAsync() {
    const state = Template.instance().state;
    const recipients = await getRecipients('members', false);
    return recipients.map(d => d.to).join(',');
  },
  async toAsync() {
    const state = Template.instance().state;
    if (!state.get('to')) {
      family = false;
      recip = 'members';
      const recipients = await getRecipients('members', false);
      console.log(JSON.stringify(recipients.map(r => r.name), undefined, '  '));

      state.set('to', recipients.map(d => d.to));
    }
    return state.get('to');
  },
  fromOptions() {
    const state = Template.instance().state;
    return state.get('fromOptions');
  },
  message() {
    const state = Template.instance().state;
    return state.get('message');
  },
  dontclose() {
    const state = Template.instance().state;
    return state.get('dontclose');
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

Template.SendMail.events({
  'click .switchManualTo': function (event, instance) {
    instance.state.set('tomanual', true);
  }
});

AutoForm.hooks({
  insertMailForm: {
    formToDoc: async function(doc) {
      if (!doc.from) {
        rememberState.set('message', noFrom);
      } else if (!doc.subject) {
        rememberState.set('message', noSubject);
      } else if (!doc.template) {
        rememberState.set('message', noText);
      } else {
        rememberState.set('message', '');
      }

      if (doc.recipients != recip || doc.family != family) {
        family = doc.family;
        recip = doc.recipients;
        if (rememberState.get('tomanual')) {
          const recipientList = document.getElementById('manualSendList').value.split(',');
          rememberState.set('to', recipientList);
        } else {
          const recipients = await getRecipients(doc.recipients, doc.family);
          rememberState.set('to', recipients.map(d => d.to));
        }
      }
      return doc;
    },
    beginSubmit: function() {
      const insdoc = this.insertDoc;
      insdoc.senddate = new Date();
      insdoc.to = [];
      family = undefined;
      recip = undefined;
      const message = rememberState.get('message');
      if (message !== '') {
        alert(message);
      }
    },
    onSubmit: async function (doc) {
      this.event.preventDefault();
      const subjectTemplate = template(doc.subject);
      const messageTemplate = template(doc.template);

      let recipients = getRecipients(doc.recipients, doc.family);
      // If manual, split and loop through all recipients and identify original recipient object
      if (rememberState.get('tomanual')) {
        const recipientList = `${document.getElementById('manualSendList').value},`.split('>,');
        const to2recipient = {};
        recipients.forEach(r => {
          to2recipient[r.to.substring(0, r.to.length-1)] = r;
        });
        const rec2 = [];
        recipientList.forEach(r => {
          if (r != "") {
            const robj = to2recipient[r.trim()];
            if (robj) {
              rec2.push(robj);
            }
          }
        });
        recipients = rec2;
      }
      doc.to = [];
      doc.failed = [];

      if (confirm(`Send to ${recipients.length} recipients`)) {
        for (let i = 0; i < recipients.length; i++) {
          const data = recipients[i];
          rememberState.set('dontclose', `Sending mail number ${i + 1} of ${recipients.length} to ${data.email}`);

          await Meteor.callAsync('mail', data.email, subjectTemplate(data), messageTemplate(data), doc.from)
            .then(() => {
              doc.to.push(data.to);
              console.log(`Sending to ${data.to}`);
            }).catch((err) => {
            console.log(`Failed sending to "${data.to}" due to: ${err}`);
            doc.failed.push(data.to);
          });
        }

        rememberState.set('dontclose', 'Done sending mails! Going back to list in 3 seconds.');
        Mails.insert(doc);
        this.done();
        setTimeout(() => {
          rememberState.set('dontclose', '');
          FlowRouter.go(`/admin/mail`);
        }, 3000)
      }
    }
  }
});