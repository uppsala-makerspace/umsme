import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Roles } from 'meteor/roles';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { models } from '/imports/common/lib/models';
import { extractor } from '/imports/common/lib/fieldsUtils';

const accountDefaults = {
  filter: ['createdAt'],
};

new Tabular.Table({
  name: 'ExpenseAccounts',
  autoWidth: false,
  collection: ExpenseAccounts,
  order: [[0, 'asc']],
  columns: extractor(models.expenseAccount, accountDefaults),
  allow: (userID) => userID && Roles.userIsInRoleAsync(userID, ['admin', 'board', 'treasurer']),
});
