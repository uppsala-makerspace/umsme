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

const syncUnlocks = () => {
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

if (Meteor.isServer) {
  SyncedCron.add({
    name: 'Sync unlocks and send a mail',
    schedule: function (parser) {
//    return parser.recur().on(0).hour();
      return parser.recur().on(3).hour();
    },
    job: function () {
      authenticate();
      syncUnlocks();
      const today = new Date();
      const yesterday = new Date();
      yesterday.setHours(-23);
      const unlocks = Unlocks.find({
        'timestamp': {
          $gte: yesterday,
          $lt: today
        }
      }).fetch();

      const log = unlocks.map(t => `${t.timestamp.toISOString()} ${t.user}`).join("\n");
      const message = `${unlocks.length} låsöppningar av ytterdörren från ${yesterday.toISOString()} till ${today.toISOString()}\n\n${log}`;
      Email.send({
        to: 'pass@ekebyindustrihus.com',
        from: 'kansliet@uppsalamakerspace.se',
        subject: 'Låsöppningar UMS',
        text: message
      });
      Email.send({
        to: 'mpalmer@gmail.com',
        from: 'kansliet@uppsalamakerspace.se',
        subject: 'Låsöppningar UMS',
        text: message
      });
      return message;
    }
  });

  SyncedCron.start();
}