import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Roles } from 'meteor/roles';
import { Workshops } from '/imports/common/collections/workshops';
import { models } from '/imports/common/lib/models';
import { extractor } from '/imports/common/lib/fieldsUtils';

// Keep only the Swedish name and status; filter out the rest.
const workshopDefaults = {
  filter: [
    'name', 'name.en',
    'description', 'description.sv', 'description.en',
    'rules', 'rules.sv', 'rules.en',
    'slackChannel', 'groupId', 'imageFileId', 'imageMimeType', 'guidesUrl',
    'primarySpaceId', 'secondarySpaceIds', 'secondarySpaceIds.$', 'createdAt',
  ],
};

new Tabular.Table({
  name: 'Workshops',
  autoWidth: false,
  collection: Workshops,
  order: [[0, 'asc']],
  columns: extractor(models.workshop, workshopDefaults),
  allow: (userID) => userID && Roles.userIsInRoleAsync(userID, ['admin', 'board']),
});
