import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Roles } from 'meteor/roles';
import { Members } from '/imports/common/collections/members';
import { reminderState } from '/imports/common/lib/rules';
import { models } from "/imports/common/lib/models";
import { extractor } from "/imports/common/lib/fieldsUtils";

const memberDefaults = {
  filter: ['storagequeue', 'storagerequest', 'mobile'],
  enhance: [{
    data: 'mid',
    render(value, type, doc) {
      return new Spacebars.SafeString(`<span class="label label-default">${value}</span>`);
    }
  }, {
    data: 'name',
    render(value, type, doc) {
      const link = `/member/${doc._id}`;
      return new Spacebars.SafeString(`<a target="_blank" href="${link}">${value}&nbsp;↗</a>`);
    }
  }, {
    data: 'infamily',
    visible: false
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
    type: 'html',
    render (value, type, doc) {
      const {state, date, formatted} = reminderState(doc);
      if (type === 'sort') {
        if (doc.infamily) {
          return 0;
        }
        switch (state) {
          case 'none':
            return 1;
          case 'old':
            return 2;
          case 'done':
            return 3;
          case 'needed':
            return 4;
        }
      }
      if (doc.infamily) {
        return new Spacebars.SafeString('');
      }

      switch (state) {
        case 'done':
          return new Spacebars.SafeString(`<span class="label label-success">${formatted}</span>`);
        case 'needed':
          return new Spacebars.SafeString(`<span class="label label-danger">Reminder needed</span>`);
        case 'overdue':
          return new Spacebars.SafeString(`<span class="label label-danger">Reminder overdue</span>`);
        case 'old':
          return new Spacebars.SafeString(`<span class="label label-default">${formatted}</span>`);
        case 'none':
          return new Spacebars.SafeString('');
      }
    }
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
  pageLength: 50,
  autoWidth: false,
  collection: Members,
  order: [[9, "asc"]],
  columns: extractor(models.member, memberDefaults),
  allow: (userID) => userID && Roles.userIsInRoleAsync(userID, 'admin'),
  changeSelector(selector, userId) {
    return selector;
  }
});