import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Roles } from 'meteor/roles';
import { DoorUnlocks } from '/imports/common/collections/doorunlocks';
import { Members } from '/imports/common/collections/members';
import { models } from '/imports/common/lib/models';
import { extractor } from '/imports/common/lib/fieldsUtils';
import moment from 'moment';

const doorUnlockDefaults = {
  enhance: [{
    data: 'timestamp',
    sortOrder: 0,
    sortDirection: 'descending',
    render(value) {
      return value ? moment(value).format('YYYY-MM-DD HH:mm:ss') : '';
    },
  }, {
    data: 'memberid',
    title: 'Member ID',
    render(value) {
      if (!value) return '';
      return new Spacebars.SafeString(`<a target="_blank" href="/member/${value}">${value}</a>`);
    },
  }, {
    data: 'extid',
    render(value) {
      return value || '';
    },
  }],
  append: [{
    data: 'memberid',
    name: 'memberName',
    title: 'Name',
    visible: false,
    render(value) {
      const m = Members.findOne(value);
      return m ? m.name : '';
    },
  }],
};

new Tabular.Table({
  name: 'DoorUnlocks',
  pageLength: 50,
  autoWidth: false,
  collection: DoorUnlocks,
  order: [[0, 'desc']],
  columns: extractor(models.doorunlocks, doorUnlockDefaults),
  allow: (userID) => userID && Roles.userIsInRoleAsync(userID, ['admin', 'board']),
});
