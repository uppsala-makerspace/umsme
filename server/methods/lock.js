import {HTTP} from 'meteor/http';
import { Unlocks } from '/collections/unlocks';
import { Email } from 'meteor/email'

let credentials;
let assumeUser;
let lockid;
let groupid;
let authTime;
let options;
const authenticate = () => {
  if (!authTime || (new Date().getTime() - authTime.getTime()) > 3600000) {
    authTime = new Date();
    const params = {
      'grant_type': 'password',
      'client_id': 'danalock-web',
      'username': Meteor.settings.lockUsername,
      'password': Meteor.settings.lockPassword,
    };
    try {
      credentials = JSON.parse(HTTP.post('https://api.danalock.com/oauth2/token', { params }).content);
      const Authorization = `${credentials.token_type} ${credentials.access_token}`;
      const identities = JSON.parse(HTTP.get('https://api.danalock.com/user/v1/identities', { headers: { Authorization } }).content);
      assumeUser = identities.find(obj => obj.domain.indexOf(Meteor.settings.lockAssumeUser) !== -1).id;
      options = {
        headers: {
          Authorization,
          'X-Assume-User': assumeUser,
        }
      };
      const locks = JSON.parse(HTTP.get('https://api.danalock.com/locks/v1?page=0', options).content);
      lockid = locks.find(l => l.name.indexOf(Meteor.settings.lockName) !== -1).id;
      const groups = JSON.parse(HTTP.get('https://api.danalock.com/groups/v1?page=0', options).content);
      groupid = groups.find(l => l.name.indexOf(Meteor.settings.groupLockName) !== -1).id;
    } catch (e) {
      console.log(e);
    }
  }
};

const synkaUnlocks = () => {
  const res = HTTP.get(`https://api.danalock.com/log/v1/lock/${lockid}?page=0&perpage=50`, options);
  let importedCount = 0;
  res.data.forEach((event) => {
    const timestamp = new Date(event.timestamp);
    const unlock = Unlocks.findOne({ timestamp });
    if (!unlock) {
      const colonlocation = event.username.lastIndexOf(':')
      const username = colonlocation === -1 ? event.username : event.username.substr(0, colonlocation + 1);
      Unlocks.insert({timestamp: timestamp, username: username, user: event.user});
      importedCount += 1;
    }
  });
  return importedCount;
};

Meteor.methods({
  'syncLockHistory': () => {
    authenticate();
    return synkaUnlocks();
  },
  'syncAndMailLockHistory': () => {
    if (!this.userId) {
      throw new Meteor.Error('Not authorized');
    }
    authenticate();
    synkaUnlocks();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setHours(-25);
    const unlocks = Unlocks.find({
      'timestamp': {
        $gte: yesterday,
        $lt: today
      }
    }).fetch();

    const log = unlocks.map(t => `${t.timestamp.toISOString()} ${t.user}`).join("\n");
    const message = `${unlocks.length} låsöppningar av ytterdörren från ${yesterday.toISOString()} till ${today.toISOString()}\n\n${log}`;
    Email.send({ to: 'mpalmer@gmail.com', from: 'ums@uppsalamakerspace.se', subject: 'Låsöppningar UMS', text: message });
    return message;
  },
  'lockHistory': () => {
    authenticate();
    const afterDate = new Date();
    afterDate.setMonth(afterDate.getMonth()-6);
    let isAfter = true;
    let page = 0;
    let visits = [];
    while (isAfter) {
      console.log(`Fetching page ${page}`);
      const res = HTTP.get(`https://api.danalock.com/log/v1/lock/${lockid}?page=${page}&perpage=50`, options);
      page ++;
      visits = visits.concat(res.data);
      if (res.data.length === 0) {
        isAfter = false;
      } else {
        const lastDate = new Date(res.data[res.data.length - 1].timestamp);
        isAfter = lastDate > afterDate;
      }
    }

    return visits;
  },
  'lockStatus': () => {
    authenticate();
    const users = JSON.parse(HTTP.get('https://api.danalock.com/users/v1?page=0', options).content);
    const calendars = JSON.parse(HTTP.get('https://api.danalock.com/links/v1/calendars?page=0', options).content);
    const links = JSON.parse(HTTP.get('https://api.danalock.com/links/v1/group_user_links?page=0', options).content);
    return { users, calendars, links };
  },
  'lockStatus2': () => {
    const usersText = Assets.getText('lock_users.json');
    const calendarText = Assets.getText('lock_calendars.json');
    const linkText = Assets.getText('lock_links.json');
    return {
      users: JSON.parse(usersText),
      calendars: JSON.parse(calendarText),
      links: JSON.parse(linkText),
    };
  },
  'setCalenderEndDate': (calendar, endDate, link) => {
    calendar.rule_sets[0].end_time = endDate;
    const calOptions = Object.assign({data: calendar}, options);
    const newCalId = JSON.parse(HTTP.post('https://api.danalock.com/links/v1/calendars', calOptions).content).id;
    const linkOptions = Object.assign({data: {calendar_id: newCalId}}, options);
    HTTP.call('patch', `https://api.danalock.com/links/v1/${link.id}`, linkOptions);
    HTTP.del(`https://api.danalock.com/links/v1/calendars/${calendar.id}`, options);
  },
  'createCalendarEndDate': (userid, endDate) => {
    const calOptions = Object.assign({data: {
      "start_time": new Date().toISOString(),
      "refresh_interval": 86400,
      "rule_sets": [{
        "end_time": endDate,
        "number_of_weeks": null,
        "week_days": null,
        "daily_start": null,
        "daily_end": null
      }]
    }}, options);
    const calId = JSON.parse(HTTP.post('https://api.danalock.com/links/v1/calendars', calOptions).content).id;
    const linkOptions = Object.assign({data: {
      "user_id": userid,
        "group_id": groupid,
//      "lock_id": lockid,
      "calendar_id": calId,
      "link_profile": "user"
    }}, options);

    HTTP.post('https://api.danalock.com/links/v1', linkOptions);
  }
});


/* group_user_links
 {
   calendar_id: "calendar-7c786e1ec60a"
   group_id: "group-53bf19ebcddb"
   id: "group_user-ddbd0292fea2"
   link_profile: "user"
   user_id: "user-ea5a1fcc5fe4"
 }

   lock_user_links
 {
   calendar_id: null
   id: "lock_user-7724313e6f1e"
   link_profile: "administrator"
   lock_id: "lock-fde72d8df2e0"
   user_id: "user-0366ba845fb5"
 }


   */