import {HTTP} from 'meteor/http';

let credentials;
let assumeUser;
let lockid;
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
    } catch (e) {
      console.log(e);
    }
  }
};

Meteor.methods({
  'lockStatus': () => {
    authenticate();
    const users = JSON.parse(HTTP.get('https://api.danalock.com/users/v1?page=0', options).content);
    const calendars = JSON.parse(HTTP.get('https://api.danalock.com/links/v1/calendars?page=0', options).content);
    const links = JSON.parse(HTTP.get('https://api.danalock.com/links/v1/lock_user_links?page=0', options).content);
    return { users, calendars, links };
  },
  'lockStatus2': () => {
    const usersText = Assets.getText('users.json');
    const calendarText = Assets.getText('calendars.json');
    const linkText = Assets.getText('links.json');
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
      "lock_id": lockid,
      "calendar_id": calId,
      "link_profile": "user"
    }}, options);

    HTTP.post('https://api.danalock.com/links/v1', linkOptions);
  }
});
