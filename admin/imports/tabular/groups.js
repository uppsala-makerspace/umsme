import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Roles } from 'meteor/roles';
import { Groups } from '/imports/common/collections/groups';
import { models } from '/imports/common/lib/models';
import { extractor } from '/imports/common/lib/fieldsUtils';

// Keep only the Swedish name, type and join policy; filter out the rest.
const groupDefaults = {
  filter: [
    'name', 'name.en',
    'tag', 'tag.sv', 'tag.en',
    'description', 'description.sv', 'description.en',
    'rules', 'rules.sv', 'rules.en',
    'slackChannel', 'guidesUrl', 'responsibleMemberId', 'parentGroupId',
    'relatedWorkshopIds', 'relatedWorkshopIds.$',
    'relatedGroupIds', 'relatedGroupIds.$',
    'imageFileId', 'imageMimeType',
    'primarySpaceId', 'secondarySpaceIds', 'secondarySpaceIds.$',
    'linkedRole', 'createdAt',
  ],
};

new Tabular.Table({
  name: 'Groups',
  autoWidth: false,
  collection: Groups,
  order: [[0, 'asc']],
  columns: extractor(models.group, groupDefaults),
  allow: (userID) => userID && Roles.userIsInRoleAsync(userID, ['admin', 'board']),
});
