import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Memberships } from '/imports/common/collections/memberships.js';
import { Members } from '/imports/common/collections/members.js';
import './History.html';
import { statsPerMonth, sortAndaccumulate } from '../stats/utils';

const load = (state, memberfilter = 'active') => {
  let members = [];
  const member2Join = {};
  Memberships.find().forEach((ms) => {
    const oldMs = member2Join[ms.mid];
    if (!oldMs || ms.start < oldMs.start) {
      member2Join[ms.mid] = ms;
    }
  });
  const from = null;
  const to = new Date();

  Memberships.find().forEach((ms) => {
    // All memberships, including both individuals and family, independent if they are lab or not.
    // Members part of a family are not counted as they don't have connected membership objects (as they do not pay).
    if (ms.type === 'member' || ms.type === 'labandmember') {
      const joined = member2Join[ms.mid]._id === ms._id;
      members.push({ value: 1, when: ms.start, joined, member: ms.mid });
      members.push({ value: -1, when: ms.memberend, member: ms.mid });
    }
  });

  members = sortAndaccumulate(members, from, to);
  const { index } = statsPerMonth(Memberships, members, from, to);

  const id2member = {};
  let stats = {
    historic: 0,
    active: 0,
    infamily: 0,
    paying: 0,
    member: 0,
    family: 0,
    lab: 0,
    labfamily: 0,
  };
  Members.find().forEach((m) => {
    if (m.member > to) {
      stats.active += 1;
      if (m.infamily) {
        stats.infamily += 1;
      } else {
        stats.paying += 1;
        if (m.family) {
          if (m.lab && m.lab > to) {
            stats.labfamily += 1;
          } else {
            stats.family += 1;
          }
        } else {
          if (m.lab && m.lab > to) {
            stats.lab += 1;
          } else {
            stats.member += 1;
          }
        }
      }
    } else {
      stats.historic += 1;
    }
    id2member[m._id] = m;
  });

  const now = new Date().getTime();
  const memberList = [];
  Object.keys(index).forEach(key => {
    const obj = index[key];
    const days = Math.floor((now - obj.joined.getTime())/1000/3600/24);
    const member = id2member[key];
    if (!member.member) {
      // Weird case with date not being synchronized between member and membership
      return;
    }
    if (member.infamily) {return;}
    const isActive = member.member.getTime() > now;
    const no = {
      years: obj.years,
      lab: member.lab === undefined ? '' : (member.lab > now ? true : 'expired'),
      days,
      member,
      name: member?.name,
      statusClass: isActive ? 'memberCurrent' : 'memberLeft',
      left: obj.left ? obj.left.toISOString().substring(0,10) : ''
    };
    if (memberfilter === 'queueing' && !member.storagequeue && !member.storagerequest) {
      return;
    }
    if (memberfilter === 'active' && !isActive) {
      return;
    }
    if (memberfilter === 'inactive' && isActive) {
      return;
    }
    memberList.push(no);
  });
  memberList.sort((a, b) => (a.days === b.days ? 0 : (a.days < b.days ? 1 : -1)));
  state.set('members', memberList);
  state.set('stats', stats);
};

Template.History.onCreated(function() {
  this.subscribe('memberships');
  this.subscribe('members');
  this.state = new ReactiveDict();
});

Template.History.onRendered(function () {
  // When ready, animate
  this.autorun(() => {
    if (!this.subscriptionsReady()) {
      return;
    }

    // Need defer or setTimeout(0) or afterFlush to wait until after rendering is done
    Meteor.defer(() => load(this.state));
  });
});

Template.History.helpers({
  users: () => {
    return Template.instance().state.get('members');
  },
  stats: () => {
    return Template.instance().state.get('stats');
  },
});

Template.History.events({
  'change .member_filter': function (event) {
    if (event.target.checked) {
      load(Template.instance().state, event.target.value);
    }
  }
});
