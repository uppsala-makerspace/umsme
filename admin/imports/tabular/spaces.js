import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Roles } from 'meteor/roles';
import { Spaces } from '/imports/common/collections/spaces';
import { models } from '/imports/common/lib/models';
import { extractor } from '/imports/common/lib/fieldsUtils';

const spaceDefaults = {
  filter: [
    'name', 'name.en',
    'description', 'description.sv', 'description.en',
    'slackChannels', 'slackChannels.$',
    'iconFileId', 'iconMimeType', 'createdAt',
  ],
};

new Tabular.Table({
  name: 'Spaces',
  autoWidth: false,
  collection: Spaces,
  order: [[0, 'asc']],
  columns: extractor(models.space, spaceDefaults),
  allow: (userID) => userID && Roles.userIsInRoleAsync(userID, ['admin', 'board']),
});
