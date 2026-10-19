import { LiabilityDocuments } from '/imports/common/collections/liabilityDocuments';
import { MessageTemplates } from '/imports/common/collections/templates';

/** A version of the liability agreement, in both languages. */
export const makeLiabilityDocument = ({ title, date, sv, en }) =>
  LiabilityDocuments.insertAsync({ title, date, text: { sv, en } });

/**
 * A message template. `type` is one of the template types in models.js
 * (welcome, confirmation, reminder, …); the text uses underscore's <%= %>.
 */
export const makeMessageTemplate = ({ created = new Date(), modified = created, deprecated = false, ...fields }) =>
  MessageTemplates.insertAsync({ deprecated, created, modified, ...fields });
