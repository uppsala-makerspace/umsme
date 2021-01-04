import {HTTP} from 'meteor/http';

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

Meteor.methods({
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