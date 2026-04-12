import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Roles } from 'meteor/roles';
import { Announcements } from '/imports/common/collections/announcements';
import { models } from "/imports/common/lib/models";
import { extractor, dateViewFunction } from "/imports/common/lib/fieldsUtils";

const announcementDefaults = {
  filter: ['bodySv', 'bodyEn', 'subjectEn', 'mailId'],
  enhance: [
    {
      data: 'createdAt',
      sortOrder: 0,
      sortDirection: 'descending',
      render: dateViewFunction(true)
    },
    {
      data: 'sentAt',
      render: dateViewFunction(true)
    },
    {
      data: 'status',
      render(value) {
        if (value === 'sent') {
          return new Spacebars.SafeString(`<span class="label label-success">Sent</span>`);
        }
        return new Spacebars.SafeString(`<span class="label label-default">Draft</span>`);
      }
    }
  ]
};

new Tabular.Table({
  name: "Announcements",
  autoWidth: false,
  pageLength: 25,
  collection: Announcements,
  order: [[3, "desc"]],
  columns: extractor(models.announcement, announcementDefaults),
  allow: (userID) => userID && Roles.userIsInRoleAsync(userID, ['admin', 'board'])
});
