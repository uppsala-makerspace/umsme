import { Meteor } from 'meteor/meteor';
import { fetch, Headers } from 'meteor/fetch';

/**
 * The Danalock web API, as admin uses it: who has an account, their
 * calendars (when access ends) and links, the door's log, and setting an end
 * date. Signs in with lockUsername and lockPassword from the settings,
 * assumes lockAssumeUser, and finds the lock (lockName) and group
 * (groupLockName) by name; the sign-in is kept for an hour.
 */

let session;

const logResponse = (response) => {
  console.log(`Status: ${response.status}`);
  console.log(`Content type: ${response.headers.get('content-type')}`);
};

const signIn = async () => {
  if (session && (Date.now() - session.at) < 3600000) return session;
  const loginRequest = await fetch('https://api.danalock.com/oauth2/token', {
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      grant_type: 'password', client_id: 'danalock-web', username: Meteor.settings.lockUsername, password: Meteor.settings.lockPassword,
    }),
  });
  const credentials = await loginRequest.json();
  const Authorization = `${credentials.token_type} ${credentials.access_token}`;
  const identities = await (await fetch('https://api.danalock.com/user/v1/identities', {
    headers: new Headers({ Accept: 'application/json', Authorization }),
  })).json();
  const assumeUser = identities.find((obj) => obj.domain.indexOf(Meteor.settings.lockAssumeUser) !== -1).id;
  const headers = new Headers({ Authorization, 'X-Assume-User': assumeUser, Accept: 'application/json' });
  const headersJSON = new Headers({ Authorization, 'X-Assume-User': assumeUser, Accept: 'application/json', 'Content-Type': 'application/json' });
  const locks = await (await fetch('https://api.danalock.com/locks/v1?page=0', { headers })).json();
  const groups = await (await fetch('https://api.danalock.com/groups/v1?page=0', { headers })).json();
  session = {
    at: Date.now(),
    headers,
    headersJSON,
    lockId: locks.find((l) => l.name.indexOf(Meteor.settings.lockName) !== -1).id,
    groupId: groups.find((l) => l.name.indexOf(Meteor.settings.groupLockName) !== -1).id,
  };
  return session;
};

const pages = async (url, headers) => {
  const first = await (await fetch(`${url}?page=0`, { headers })).json();
  const second = await (await fetch(`${url}?page=1`, { headers })).json();
  return first.concat(second);
};

export const danalock = {
  async status() {
    const { headers } = await signIn();
    return {
      users: await pages('https://api.danalock.com/users/v1', headers),
      calendars: await pages('https://api.danalock.com/links/v1/calendars', headers),
      links: await pages('https://api.danalock.com/links/v1/group_user_links', headers),
    };
  },

  /** A page of the door's log, newest first. */
  async log({ page = 0, perPage = 50 } = {}) {
    const { headers, lockId } = await signIn();
    return (await fetch(`https://api.danalock.com/log/v1/lock/${lockId}?page=${page}&perpage=${perPage}`, { headers })).json();
  },

  /** Give a link a calendar ending at `endDate` in place of `calendar`. */
  async setCalendarEndDate(calendar, endDate, link) {
    const { headers, headersJSON } = await signIn();
    const updated = { ...calendar, rule_sets: [{ ...calendar.rule_sets[0], end_time: endDate }] };
    const newCalendarRequest = await fetch('https://api.danalock.com/links/v1/calendars', { method: 'POST', headers: headersJSON, body: JSON.stringify(updated) });
    logResponse(newCalendarRequest);
    const newCalendar = await newCalendarRequest.json();
    const linkUpdateRequest = await fetch(`https://api.danalock.com/links/v1/${link.id}`, {
      method: 'PATCH', headers: headersJSON, body: JSON.stringify({ calendar_id: newCalendar.id }),
    });
    logResponse(linkUpdateRequest);
    const calendarDeleteRequest = await fetch(`https://api.danalock.com/links/v1/calendars/${calendar.id}`, { method: 'DELETE', headers });
    logResponse(calendarDeleteRequest);
  },

  /** Link a user to the group with a calendar ending at `endDate`. */
  async createCalendarEndDate(userId, endDate) {
    const { headersJSON, groupId } = await signIn();
    console.log(`Creating end date calender for ${userId} with enddate ${endDate}`);
    const calRequest = await fetch('https://api.danalock.com/links/v1/calendars', {
      method: 'POST',
      headers: headersJSON,
      body: JSON.stringify({
        start_time: new Date().toISOString(),
        refresh_interval: 86400,
        rule_sets: [{ end_time: endDate, number_of_weeks: null, week_days: null, daily_start: null, daily_end: null }],
      }),
    });
    logResponse(calRequest);
    const cal = await calRequest.json();
    const linkResponse = await fetch('https://api.danalock.com/links/v1', {
      method: 'POST', headers: headersJSON, body: JSON.stringify({ user_id: userId, group_id: groupId, calendar_id: cal.id, link_profile: 'user' }),
    });
    logResponse(linkResponse);
  },
};

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