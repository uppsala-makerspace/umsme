import { Members} from "/collections/members";
import get from "@babel/runtime/helpers/esm/get";

const sameDay = (d1, d2) => {
  return d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate() && d1.getFullYear() === d2.getFullYear();
};

const getEndDate = (cal) => {
  const ed = cal.rule_sets[0].end_time;
  if (ed) {
    return new Date(ed);
  }
};

const gotAccess = (member, user2obj) => {
  if (member.lab && user2obj[member.lab]) {
    const obj = user2obj[member.lab];
    if (obj.user.role === 'administrator') {
      return true;
    }
    if (obj.cal) {
      const endDate = getEndDate(obj.cal);
      if (endDate) {
        return new Date() < endDate;
      } else {
        return true;
      }
    }
  }
  return false;
};

export const updateCollection = (collection, status) => {
  const {users, links, calendars} = status;
  const user2cal = {};
  const id2cal = {};
  const admins = {};
  links.forEach(link => {
    user2cal[link.user_id] = link.calendar_id;
    if (link.link_profile === 'administrator') {
      admins[link.user_id] = true;
    }
  });
  calendars.forEach(cal => {
    id2cal[cal.id] = cal;
  });
  const user2obj = {};
  users.forEach(user => {
    const cal = id2cal[user2cal[user.id]];
    user2obj[user.username.toLowerCase()] = {user, cal};
  });

  const now = new Date();
  Members.find().forEach((member) => {
    if (member.lab) {
      //&& member.lab > now
      const lockusername = member.lock ? member.lock.toLowerCase() : undefined;
      const obj = {
        name: member.name,
        member: member._id,
        infamily: member.infamily != null,
        labdate: member.lab,
        email: member.email,
        lockusername,
      };
      if (!gotAccess(member, user2obj) && member.lab < now) {
        obj.lockstatus = 'old';
      } else if (lockusername) {
        const lobj = user2obj[lockusername];
        if (lobj) {
          const luser = lobj.user;
          obj.lockid = luser.id;
          if (luser.role === 'administrator') {
            obj.lockstatus = 'admin';
          } else {
            if (!lobj.cal) {
              obj.lockstatus = 'wrong';
            } else {
              const lockdate = getEndDate(lobj.cal);
              if (lockdate) {
                obj.lockaccess = lockdate;
                if (sameDay(lockdate, member.lab)) {
                  obj.lockstatus = 'correct';
                } else {
                  obj.lockstatus = 'wrong';
                }
              } else {
                obj.lockstatus = 'forever';
              }
            }
          }
        } else {
          obj.lockstatus = 'invited';
        }
      } else {
        obj.lockstatus = 'noaccount';
      }
      collection.insert(obj);
    }
  });
};