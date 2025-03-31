import { fetch, Headers } from 'meteor/fetch';
import { Unlocks } from '/collections/unlocks';
import { Email } from 'meteor/email'

let assumeUser;
let lockid;
let groupid;
let authTime;
let headers;
let headersJSON;

const logResponse = (response) => {
  console.log(`Status: ${response.status}`);
  console.log(`Content type: ${response.headers.get("content-type")}`);
}

/**
 * Requires the settings to contain:
 *
 * lockUsername
 * lockPassword
 * lockAssumeUser
 * lockName
 * groupLockName
 *
 * @return {Promise<void>}
 */
const authenticate = async () => {
  if (!authTime || (new Date().getTime() - authTime.getTime()) > 3600000) {
    authTime = new Date();
    const params = {
      'grant_type': 'password',
      'client_id': 'danalock-web',
      'username': Meteor.settings.lockUsername,
      'password': Meteor.settings.lockPassword,
    };
    try {
      // Login and construct authorization key
      const loginRequest = await fetch('https://api.danalock.com/oauth2/token', {
        method: 'POST',
        headers: new Headers({'Content-Type': 'application/json'}),
        body: JSON.stringify(params)
      });
      const credentials = await loginRequest.json();
      const Authorization = `${credentials.token_type} ${credentials.access_token}`;

      // Fetch available identities, keep the assumedUser
      const identitiesRequest = await fetch('https://api.danalock.com/user/v1/identities', {
        headers: new Headers({'Accept': 'application/json', Authorization}),
      });
      const identities = await identitiesRequest.json();
      assumeUser = identities.find(obj => obj.domain.indexOf(Meteor.settings.lockAssumeUser) !== -1).id;

      // Create headers object for fetch containing the authorization with the assumeUser from settings
      headers = new Headers({
        Authorization,
        'X-Assume-User': assumeUser,
        'Accept': 'application/json'
      });
      // Same but with JSON payload
      headersJSON = new Headers({
        Authorization,
        'X-Assume-User': assumeUser,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      });

      // Find the lockid based on the lockName in settings
      const locksRequest = await fetch('https://api.danalock.com/locks/v1?page=0', {headers});
      const locks = await locksRequest.json();
      lockid = locks.find(l => l.name.indexOf(Meteor.settings.lockName) !== -1).id;

      // Find the groupid based on the groupLockName in settings
      const groupsRequest = await fetch('https://api.danalock.com/groups/v1?page=0', {headers});
      const groups = await groupsRequest.json();
      console.log(groups);
      groupid = groups.find(l => l.name.indexOf(Meteor.settings.groupLockName) !== -1).id;
    } catch (e) {
      console.log(e);
    }
  }
};

const syncUnlocks = async () => {
  const lockLogRequest = await fetch(`https://api.danalock.com/log/v1/lock/${lockid}?page=0&perpage=50`, {headers});
  const lockLog = await lockLogRequest.json();
  let importedCount = 0;
  for(let i=0; i<lockLog.length;i++) {
    const event = lockLog[i];
    const timestamp = new Date(event.timestamp);
    const unlock = Unlocks.findOne({ timestamp });
    if (!unlock) {
      const colonLocation = event.username.lastIndexOf(':')
      const username = colonLocation === -1 ? event.username : event.username.substr(0, colonLocation + 1);
      await Unlocks.insertAsync({timestamp: timestamp, username: username, user: event.user});
      importedCount += 1;
    }
  }
  return importedCount;
};

Meteor.methods({
  'syncLockHistory': async () => {
    await authenticate();
    return syncUnlocks();
  },
  'syncAndMailLockHistory': async () => {
    if (!Meteor.userId()) {
      throw new Meteor.Error('Not authorized');
    }
    await authenticate();
    await syncUnlocks();
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
    return Email.sendAsync({to: 'mpalmer@gmail.com', from: 'ums@uppsalamakerspace.se', subject: 'Låsöppningar UMS', text: message })
  },
  'lockHistory': async () => {
    await authenticate();
    const afterDate = new Date();
    afterDate.setMonth(afterDate.getMonth()-6);
    let isAfter = true;
    let page = 0;
    let visits = [];
    while (isAfter) {
      console.log(`Fetching page ${page}`);
      const lockOpeningsRequest = await fetch(`https://api.danalock.com/log/v1/lock/${lockid}?page=${page}&perpage=50`, {headers});
      const lockOpenings = await lockOpeningsRequest.json();
      page ++;
      visits = visits.concat(lockOpenings);
      if (lockOpenings.length === 0) {
        isAfter = false;
      } else {
        const lastDate = new Date(lockOpenings[lockOpenings.length - 1].timestamp);
        isAfter = lastDate > afterDate;
      }
    }

    return visits;
  },
  'lockStatus': async () => {
    await authenticate();
    const users = await (await fetch('https://api.danalock.com/users/v1?page=0', {headers})).json();
    const calendars = await (await fetch('https://api.danalock.com/links/v1/calendars?page=0', {headers})).json();
    const links = await (await fetch('https://api.danalock.com/links/v1/group_user_links?page=0', {headers})).json();
    return { users, calendars, links };
  },
  'setCalenderEndDate': async (calendar, endDate, link) => {
    // Set new end date in the old calendar object
    calendar.rule_sets[0].end_time = endDate;

    // Create a new calendar object from the updated old calendar object
    const newCalendarRequest = await fetch('https://api.danalock.com/links/v1/calendars',
      {
        method: 'POST',
        headers: headersJSON,
        body: JSON.stringify(calendar)
      });
    logResponse(newCalendarRequest);
    const newCalendar = await newCalendarRequest.json();
    const newCalId = newCalendar.id;

    // Update the link to point to the new calendar.
    const linkUpdateRequest = await fetch(`https://api.danalock.com/links/v1/${link.id}`, {
      method: 'PATCH',
      headers: headersJSON,
      body: JSON.stringify({calendar_id: newCalId})
    });
    logResponse(linkUpdateRequest);

    // Remove the old calendar object
    const calendarDeleteRequest = await fetch(`https://api.danalock.com/links/v1/calendars/${calendar.id}`, { method: 'DELETE', headers });
    logResponse(calendarDeleteRequest);
  },

  'createCalendarEndDate': async (userid, endDate) => {
    console.log(`Creating end date calender for ${userid} with enddate ${endDate}`);
    // Create a new calender
    const calBody = JSON.stringify({
      "start_time": new Date().toISOString(),
      "refresh_interval": 86400,
      "rule_sets": [{
        "end_time": endDate,
        "number_of_weeks": null,
        "week_days": null,
        "daily_start": null,
        "daily_end": null
      }]
    });
    const calRequest = await fetch('https://api.danalock.com/links/v1/calendars',
      { method: 'POST', headers: headersJSON, body: calBody });
    logResponse(calRequest);
    const cal = await calRequest.json();
    const calId = cal.id;
    console.log(`Calendar id is ${calId}`);

    // Create a new link to connect the calendar to the user
    const linkBody = JSON.stringify({
      "user_id": userid,
      "group_id": groupid,
      "calendar_id": calId,
      "link_profile": "user"
    });
    const linkResponse = await fetch('https://api.danalock.com/links/v1', { method: 'POST', headers: headersJSON, body: linkBody });
    logResponse(linkResponse);
    console.log('Created a link');
  }
});


/* group_user_links example JSON expression
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