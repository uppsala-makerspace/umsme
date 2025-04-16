import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Roles } from 'meteor/roles';
import { Members } from '/collections/members';
import { reminderState } from '../rules';
import { models } from "../models";
import { extractor } from "../fieldsUtils";

const memberDefaults = {
  filter: ['storagequeue', 'mobile'],
  enhance: [{
    data: 'mid',
    render(value, type, doc) {
      return new Spacebars.SafeString(`<span class="label label-default">${value}</span>`);
    }
  }, {
    data: 'family',
    render(value, type, doc) {
      if (doc.family) {
        if (!doc.infamily) {
          return 'Paying';
        } else {
          return 'Member';
        }
      }
      return '';
    }
  }, {
    sortOrder: 0,
    data: 'reminder',
    render(value, type, doc) {
      if (doc.infamily) {
        return new Spacebars.SafeString('');
      }
      const {state, date, formatted} = reminderState(doc);

      switch (state) {
        case 'done':
          return new Spacebars.SafeString(`<span class="label label-success">${formatted}</span>`);
        case 'needed':
          return new Spacebars.SafeString(`<span class="label label-danger">Reminder needed</span>`);
        case 'old':
          return new Spacebars.SafeString(`<span class="label label-default">${formatted}</span>`);
        case 'none':
          return new Spacebars.SafeString('');
      }
    },
//    sortByValue: true,
    sortDirection: 'descending',
    sortFn(value, obj) {
      if (obj.infamily) {
        return 0;
      }
      const {state, date, formatted} = reminderState(obj);

      switch (state) {
        case 'done':
          return 3;
        case 'needed':
          return 4;
        case 'old':
          return 2;
        case 'none':
          return 1;
      }
    },
  }, {
    data: 'lock',
    render(value, type, doc) {
      if (doc.lock) {
        return new Spacebars.SafeString('<strong>&check;</strong>');
      }
    }
  }, {
    data: 'storage',
    title: 'Storage',
  }, {
    data: 'mobile',
    render(value, type, doc) {
      if (doc.mobile) {
        return new Spacebars.SafeString(doc.mobile.replace(/\+46 \(0\)/, '0').replaceAll(' ', ''));
      }
    }
  }]
};

new Tabular.Table({
  name: "Members",
  autoWidth: false,
  collection: Members,
  columns: extractor(models.member, memberDefaults),
  allow: (userID) => userID && Roles.userIsInRoleAsync(userID, 'admin')
});