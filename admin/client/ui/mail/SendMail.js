import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Members } from '/imports/common/collections/members';
import { Mails } from '/imports/common/collections/mails';
import { Announcements } from '/imports/common/collections/announcements';
import { models, getFromOptions } from "/imports/common/lib/models";
import { memberStatus } from '/imports/common/lib/utils';
import { template } from 'underscore';
import { marked } from 'marked';
import removeMd from 'remove-markdown';
import './SendMail.html';
import './Recipients';

const getRecipients = async function(reciever, family) {
  const arr = [];
  const  members = await Members.find().fetchAsync();
//  for (let i=0;i<members.length;i++) {
  for (let i=0;i<1;i++) {
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
let separator = '\n---\n\n';

const noFrom = 'You must provide a from address!';
const noSubject = 'You must provide a message subject!';
const noText = 'You must provide some message text!';

Template.SendMail.onCreated(function() {
  Meteor.subscribe('members');
  Meteor.subscribe('memberships');
  Meteor.subscribe('mails');
  Meteor.subscribe('announcements');
  this.state = new ReactiveDict();
  rememberState = this.state;
  this.state.set('fromOptions', false);
  this.state.set('tomanual', false);
  this.state.set('message', noFrom);
  this.state.set('formatMode', 'raw');
  getFromOptions(() => {
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
  async mailAsync() {
    const announcementId = FlowRouter.getQueryParam('announcement');
    if (announcementId) {
      const announcement = await Announcements.findOneAsync(announcementId);
      if (announcement) {
        const doc = {
          recipients: 'members',
          subject: announcement.subjectEn ? `${announcement.subjectSv} / ${announcement.subjectEn}` : announcement.subjectSv,
          template: announcement.bodyEn ? announcement.bodySv + separator + announcement.bodyEn : announcement.bodySv,
        };
        console.dir(doc);
        return doc;
      }
    }
    return { recipients: 'members' };
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
  },
  announcementId() {
    return FlowRouter.getQueryParam('announcement');
  },
  isRaw() {
    return Template.instance().state.get('formatMode') === 'raw';
  },
  isMarkdown() {
    return Template.instance().state.get('formatMode') === 'markdown';
  },
  isPlaintext() {
    return Template.instance().state.get('formatMode') === 'plaintext';
  },
  hasPreview() {
    const mode = Template.instance().state.get('formatMode');
    return mode === 'markdown' || mode === 'plaintext';
  },
  formatPreview() {
    Template.instance().state.get('previewTick');
    const textarea = document.querySelector('#insertMailForm textarea[name="template"]');
    const text = textarea?.value || '';
    const mode = Template.instance().state.get('formatMode');
    if (mode === 'markdown') {
      return new Spacebars.SafeString(marked.parse(text, { breaks: true }));
    }
    if (mode === 'plaintext') {
      return removeMd(text, { stripListLeaders: false });
    }
    return '';
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
      return status.memberEnd > now;
    case 'labmembers':
      return status.labEnd > now;
    case 'yearmembers':
      return status.memberEnd > currentyear;
    case 'recentmembers':
      return status.memberEnd > lastyear;
  }
};

Template.SendMail.events({
  'click .switchManualTo': function (event, instance) {
    instance.state.set('tomanual', true);
    return false;
  },
  'click .setRaw'(event, instance) {
    event.preventDefault();
    instance.state.set('formatMode', 'raw');
  },
  'click .setMarkdown'(event, instance) {
    event.preventDefault();
    instance.state.set('formatMode', 'markdown');
  },
  'click .setPlaintext'(event, instance) {
    event.preventDefault();
    instance.state.set('formatMode', 'plaintext');
  },
  'input textarea[name="template"]'(event, instance) {
    if (instance.state.get('formatMode') !== 'raw') {
      instance.state.set('previewTick', Date.now());
    }
  }
});

AutoForm.hooks({
  insertMailForm: {
    formToDoc: function(doc) {
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
          getRecipients(doc.recipients, doc.family).then(recipients =>
            rememberState.set('to', recipients.map(d => d.to)));
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

      let recipients = await getRecipients(doc.recipients, doc.family);
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
        const formatMode = rememberState.get('formatMode');
        for (let i = 0; i < recipients.length; i++) {
          const data = recipients[i];
          rememberState.set('dontclose', `Sending mail number ${i + 1} of ${recipients.length} to ${data.email}`);

          const rawText = messageTemplate(data);
          const messageText = formatMode === 'plaintext' ? removeMd(rawText, { stripListLeaders: false }) : rawText;
          const htmlContent = formatMode === 'markdown' ? marked.parse(rawText, { breaks: true }) : undefined;
          await Meteor.callAsync('mail', data.email, subjectTemplate(data), messageText, doc.from, htmlContent)
            .then(() => {
              doc.to.push(data.to);
              console.log(`Sending to ${data.to}`);
            }).catch((err) => {
            console.log(`Failed sending to "${data.to}" due to: ${err}`);
            doc.failed.push(data.to);
          });
        }

        rememberState.set('dontclose', 'Done sending mails! Going back in 3 seconds.');
        if (formatMode === 'markdown') {
          doc.formatted = true;
        }
        if (formatMode === 'plaintext') {
          doc.template = removeMd(doc.template, { stripListLeaders: false });
        }
        const mailId = Mails.insert(doc);

        // Link announcement to the mail record if sending from an announcement
        const announcementId = FlowRouter.getQueryParam('announcement');
        if (announcementId) {
          Announcements.update(announcementId, {
            $set: { status: 'sent', sentAt: new Date(), mailId }
          });
        }
        setTimeout(() => {
          rememberState.set('dontclose', '');
          FlowRouter.go(announcementId ? `/announcement/${announcementId}` : '/mail');
          this.done();
        }, 3000);
      } else {
        this.done();
      }
      return false;
    }
  }
});